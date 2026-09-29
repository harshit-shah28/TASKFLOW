import os
import mimetypes
from uuid import uuid4
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Blueprint, request, g, send_file, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, decode_token

from backend.config import Config
from backend.models import (
    db, User, Workspace, WorkspaceMember,
    Conversation, ConversationMember, Message, Attachment
)
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required, workspace_role_required
from backend.sockets.chat_socket import (
    broadcast_new_message, broadcast_message_read, broadcast_conversation_created
)

chat_bp = Blueprint('chat', __name__)

DANGEROUS_EXTENSIONS = {
    'exe', 'bat', 'cmd', 'sh', 'php', 'py', 'js', 'html', 'htm',
    'vbs', 'jar', 'wasm', 'msi', 'com', 'scr', 'pif', 'vb', 'ps1'
}


def authenticate_media_request():
    """Authenticate request via Authorization header or ?token= query parameter."""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(int(user_id))
            if user and user.is_active:
                return user
    except Exception:
        pass

    # Check query param
    token = request.args.get('token')
    if token:
        if token.startswith('Bearer '):
            token = token[7:]
        try:
            decoded = decode_token(token)
            user_id = int(decoded['sub'])
            user = User.query.get(user_id)
            if user and user.is_active:
                return user
        except Exception:
            return None
    return None


def ensure_workspace_default_channel(workspace_id: int):
    """Ensure a #general channel exists in the workspace with all members."""
    try:
        general_channel = Conversation.query.filter_by(
            workspace_id=workspace_id,
            type='channel',
            name='general'
        ).first()

        if not general_channel:
            general_channel = Conversation(
                workspace_id=workspace_id,
                type='channel',
                name='general',
                description='Company-wide announcements and team discussions'
            )
            db.session.add(general_channel)
            db.session.flush()

            # Add all workspace members to general channel
            members = WorkspaceMember.query.filter_by(workspace_id=workspace_id).all()
            for m in members:
                cm = ConversationMember(
                    conversation_id=general_channel.id,
                    user_id=m.user_id
                )
                db.session.add(cm)
            db.session.commit()
        else:
            # Ensure any newly joined workspace members are added to #general
            members = WorkspaceMember.query.filter_by(workspace_id=workspace_id).all()
            existing_cm_user_ids = {
                cm.user_id for cm in ConversationMember.query.filter_by(conversation_id=general_channel.id).all()
            }
            added = False
            for m in members:
                if m.user_id not in existing_cm_user_ids:
                    db.session.add(ConversationMember(conversation_id=general_channel.id, user_id=m.user_id))
                    added = True
            if added:
                db.session.commit()
    except Exception as e:
        db.session.rollback()


@chat_bp.route('/conversations', methods=['GET'])
@jwt_auth_required
def list_conversations():
    """List all conversations (channels & DMs) for current user in active workspace."""
    user = g.current_user
    workspace_id = request.args.get('workspace_id') or request.headers.get('X-Workspace-Id')
    if not workspace_id:
        return error_response("Workspace ID is required.", 400)

    try:
        workspace_id = int(workspace_id)
    except ValueError:
        return error_response("Invalid workspace ID.", 400)

    # Check workspace membership
    ws_member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=user.id).first()
    if not ws_member:
        return error_response("Access denied: You are not a member of this workspace.", 403)

    # Ensure default #general channel exists
    ensure_workspace_default_channel(workspace_id)

    # Query conversations user belongs to in this workspace
    conversations = (
        db.session.query(Conversation)
        .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
        .filter(
            Conversation.workspace_id == workspace_id,
            ConversationMember.user_id == user.id
        )
        .order_by(Conversation.last_message_at.desc())
        .all()
    )

    results = [c.to_dict(current_user_id=user.id) for c in conversations]
    return success_response(results)


@chat_bp.route('/conversations', methods=['POST'])
@jwt_auth_required
def create_conversation():
    """Create a new direct message or workspace channel."""
    user = g.current_user
    data = request.get_json(silent=True) or {}
    workspace_id = data.get('workspace_id')
    conv_type = data.get('type', 'direct')

    if not workspace_id:
        return error_response("Workspace ID is required.", 400)

    ws_member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=user.id).first()
    if not ws_member:
        return error_response("Access denied to workspace.", 403)

    if conv_type == 'direct':
        participant_id = data.get('participant_id')
        if not participant_id:
            return error_response("Participant user ID is required for direct messages.", 400)
        if int(participant_id) == user.id:
            return error_response("Cannot create a direct conversation with yourself.", 400)

        # Verify participant is in this workspace
        part_member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=participant_id).first()
        if not part_member:
            return error_response("Participant is not a member of this workspace.", 400)

        # Check if direct conversation already exists between these 2 users
        existing_convs = (
            db.session.query(Conversation)
            .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
            .filter(
                Conversation.workspace_id == workspace_id,
                Conversation.type == 'direct',
                ConversationMember.user_id == user.id
            )
            .all()
        )

        for ec in existing_convs:
            other_member = ConversationMember.query.filter_by(
                conversation_id=ec.id,
                user_id=participant_id
            ).first()
            if other_member:
                return success_response(ec.to_dict(current_user_id=user.id), message="Existing conversation found.")

        # Create new direct conversation
        conv = Conversation(
            workspace_id=workspace_id,
            type='direct',
            created_by_id=user.id
        )
        db.session.add(conv)
        db.session.flush()

        db.session.add(ConversationMember(conversation_id=conv.id, user_id=user.id))
        db.session.add(ConversationMember(conversation_id=conv.id, user_id=participant_id))
        db.session.commit()

        conv_dict = conv.to_dict(current_user_id=user.id)
        broadcast_conversation_created(conv_dict, [user.id, int(participant_id)])
        return success_response(conv_dict, message="Direct conversation started.", status_code=201)

    elif conv_type == 'channel':
        name = data.get('name', '').strip().lower()
        if not name:
            return error_response("Channel name is required.", 400)

        # Clean channel name (alphanumeric and hyphens)
        name = ''.join(c if c.isalnum() or c in '-_' else '-' for c in name).strip('-')
        if not name:
            return error_response("Invalid channel name.", 400)

        existing = Conversation.query.filter_by(
            workspace_id=workspace_id,
            type='channel',
            name=name
        ).first()
        if existing:
            return error_response(f"Channel #{name} already exists.", 409)

        conv = Conversation(
            workspace_id=workspace_id,
            type='channel',
            name=name,
            description=data.get('description', ''),
            created_by_id=user.id
        )
        db.session.add(conv)
        db.session.flush()

        # Add all workspace members into the public channel
        workspace_members = WorkspaceMember.query.filter_by(workspace_id=workspace_id).all()
        member_ids = []
        for wm in workspace_members:
            db.session.add(ConversationMember(conversation_id=conv.id, user_id=wm.user_id))
            member_ids.append(wm.user_id)
        db.session.commit()

        conv_dict = conv.to_dict(current_user_id=user.id)
        broadcast_conversation_created(conv_dict, member_ids)
        return success_response(conv_dict, message=f"Channel #{name} created.", status_code=201)

    else:
        return error_response("Invalid conversation type. Must be 'direct' or 'channel'.", 400)


@chat_bp.route('/conversations/<int:conversation_id>/messages', methods=['GET'])
@jwt_auth_required
def get_messages(conversation_id):
    """Retrieve message history for a conversation."""
    user = g.current_user
    cm = ConversationMember.query.filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not cm:
        return error_response("Access denied: You are not a participant in this conversation.", 403)

    limit = min(int(request.args.get('limit', 50)), 100)
    before_id = request.args.get('before_id')

    query = Message.query.filter_by(conversation_id=conversation_id)
    if before_id:
        query = query.filter(Message.id < int(before_id))

    messages = query.order_by(Message.id.desc()).limit(limit).all()
    # Reverse so they are returned in ascending chronological order
    messages = list(reversed(messages))

    return success_response([m.to_dict() for m in messages])


@chat_bp.route('/conversations/<int:conversation_id>/messages', methods=['POST'])
@jwt_auth_required
def send_message(conversation_id):
    """Post a message with optional attachments in a conversation."""
    user = g.current_user
    cm = ConversationMember.query.filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not cm:
        return error_response("Access denied: You are not a participant in this conversation.", 403)

    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    attachment_ids = data.get('attachment_ids') or []

    if not content and not attachment_ids:
        return error_response("Message must contain text content or at least one attachment.", 400)

    # Determine message type
    msg_type = 'text'
    if attachment_ids and not content:
        msg_type = 'file'

    message = Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        content=content,
        message_type=msg_type
    )
    db.session.add(message)
    db.session.flush()

    # Associate attachments
    if attachment_ids:
        for att_id in attachment_ids:
            att = Attachment.query.filter_by(
                id=att_id,
                conversation_id=conversation_id,
                uploader_id=user.id
            ).first()
            if att:
                att.message_id = message.id

    # Update conversation last_message_at
    conv = Conversation.query.get(conversation_id)
    conv.last_message_at = datetime.now(timezone.utc)

    # Automatically mark as read for sender
    cm.last_read_message_id = message.id
    cm.last_read_at = datetime.now(timezone.utc)

    db.session.commit()

    msg_dict = message.to_dict()
    # Broadcast to Socket.IO room
    broadcast_new_message(conversation_id, msg_dict)

    return success_response(msg_dict, message="Message sent.", status_code=201)


@chat_bp.route('/conversations/<int:conversation_id>/read', methods=['POST'])
@jwt_auth_required
def mark_conversation_read(conversation_id):
    """Mark all messages up to the latest in this conversation as read."""
    user = g.current_user
    cm = ConversationMember.query.filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not cm:
        return error_response("Access denied.", 403)

    latest_msg = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.id.desc()).first()
    if latest_msg:
        cm.last_read_message_id = latest_msg.id
        cm.last_read_at = datetime.now(timezone.utc)
        db.session.commit()
        broadcast_message_read(conversation_id, user.id, latest_msg.id)

    return success_response({'marked_read': True, 'last_read_id': latest_msg.id if latest_msg else None})


@chat_bp.route('/conversations/<int:conversation_id>/upload', methods=['POST'])
@jwt_auth_required
def upload_chat_file(conversation_id):
    """Upload a file attachment for a chat message."""
    user = g.current_user
    cm = ConversationMember.query.filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not cm:
        return error_response("Access denied: You are not a participant in this conversation.", 403)

    if 'file' not in request.files:
        return error_response("No file provided in request.", 400)

    file = request.files['file']
    if not file or not file.filename:
        return error_response("No file selected.", 400)

    original_filename = secure_filename(file.filename) or "attachment"
    ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''

    if ext in DANGEROUS_EXTENSIONS:
        return error_response(f"Executable and script files (.{ext}) are prohibited for security.", 400)

    allowed = current_app.config.get('ALLOWED_CHAT_EXTENSIONS', Config.ALLOWED_CHAT_EXTENSIONS)
    if ext not in allowed:
        return error_response(f"File type '.{ext}' is not supported. Supported types: images, videos, and documents.", 400)

    # Classify file category
    if ext in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
        file_type = 'image'
    elif ext in ('mp4', 'webm', 'mov'):
        file_type = 'video'
    elif ext in ('pdf', 'docx', 'doc', 'txt', 'xlsx', 'xls', 'pptx', 'ppt', 'csv'):
        file_type = 'document'
    else:
        file_type = 'other'

    mime_type, _ = mimetypes.guess_type(original_filename)
    if not mime_type:
        mime_type = file.content_type or 'application/octet-stream'

    # Save to disk
    upload_dir = Path(current_app.config.get('UPLOAD_FOLDER', Config.UPLOAD_FOLDER))
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid4().hex}_{original_filename}"
    file_path = upload_dir / unique_filename

    file.save(str(file_path))
    file_size = os.path.getsize(str(file_path))

    # Save attachment record
    attachment = Attachment(
        conversation_id=conversation_id,
        uploader_id=user.id,
        original_name=original_filename,
        storage_path=unique_filename,
        file_type=file_type,
        mime_type=mime_type,
        file_size=file_size
    )
    db.session.add(attachment)
    db.session.commit()

    return success_response(attachment.to_dict(), message="File uploaded successfully.", status_code=201)


@chat_bp.route('/attachments/<int:attachment_id>/download', methods=['GET'])
def download_attachment(attachment_id):
    """Download an attachment securely."""
    user = authenticate_media_request()
    if not user:
        return error_response("Authentication required.", 401)

    attachment = Attachment.query.get(attachment_id)
    if not attachment:
        return error_response("Attachment not found.", 404)

    # Check conversation membership
    cm = ConversationMember.query.filter_by(
        conversation_id=attachment.conversation_id,
        user_id=user.id
    ).first()
    if not cm:
        return error_response("Access denied to this attachment.", 403)

    upload_dir = Path(current_app.config.get('UPLOAD_FOLDER', Config.UPLOAD_FOLDER))
    file_path = upload_dir / attachment.storage_path

    if not file_path.exists():
        return error_response("File no longer exists on disk.", 404)

    return send_file(
        str(file_path),
        as_attachment=True,
        download_name=attachment.original_name,
        mimetype=attachment.mime_type
    )


@chat_bp.route('/attachments/<int:attachment_id>/preview', methods=['GET'])
def preview_attachment(attachment_id):
    """Stream inline preview of image or video attachment."""
    user = authenticate_media_request()
    if not user:
        return error_response("Authentication required.", 401)

    attachment = Attachment.query.get(attachment_id)
    if not attachment:
        return error_response("Attachment not found.", 404)

    # Check conversation membership
    cm = ConversationMember.query.filter_by(
        conversation_id=attachment.conversation_id,
        user_id=user.id
    ).first()
    if not cm:
        return error_response("Access denied to this attachment.", 403)

    upload_dir = Path(current_app.config.get('UPLOAD_FOLDER', Config.UPLOAD_FOLDER))
    file_path = upload_dir / attachment.storage_path

    if not file_path.exists():
        return error_response("File no longer exists on disk.", 404)

    return send_file(
        str(file_path),
        as_attachment=False,
        mimetype=attachment.mime_type
    )


@chat_bp.route('/unread-count', methods=['GET'])
@jwt_auth_required
def get_unread_count():
    """Get total unread chat messages across all conversations in workspace."""
    user = g.current_user
    workspace_id = request.args.get('workspace_id') or request.headers.get('X-Workspace-Id')
    if not workspace_id:
        return error_response("Workspace ID is required.", 400)

    try:
        workspace_id = int(workspace_id)
    except ValueError:
        return error_response("Invalid workspace ID.", 400)

    # Get all conversations user is a member of in this workspace
    memberships = (
        db.session.query(ConversationMember)
        .join(Conversation, Conversation.id == ConversationMember.conversation_id)
        .filter(
            Conversation.workspace_id == workspace_id,
            ConversationMember.user_id == user.id
        )
        .all()
    )

    total_unread = 0
    for m in memberships:
        query = Message.query.filter(
            Message.conversation_id == m.conversation_id,
            Message.sender_id != user.id
        )
        if m.last_read_message_id:
            query = query.filter(Message.id > m.last_read_message_id)
        total_unread += query.count()

    return success_response({'unread_count': total_unread})
