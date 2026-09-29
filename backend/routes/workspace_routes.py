import re
from flask import Blueprint, request, g
from datetime import datetime, timezone
from backend.models import db, Workspace, WorkspaceMember, User, Tag, WorkspaceInvitation
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required, workspace_role_required, ROLE_HIERARCHY
from backend.services.notification_service import NotificationService
from backend.services.activity_service import ActivityService

workspace_bp = Blueprint('workspaces', __name__)


@workspace_bp.route('', methods=['GET'])
@jwt_auth_required
def get_user_workspaces():
    user = g.current_user
    memberships = WorkspaceMember.query.filter_by(user_id=user.id).all()
    results = []
    for m in memberships:
        data = m.workspace.to_dict()
        data['my_role'] = m.role
        results.append(data)
    return success_response(results)


@workspace_bp.route('', methods=['POST'])
@jwt_auth_required
def create_workspace():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    if not name:
        return error_response("Workspace name is required.", 400)
        
    slug_base = re.sub(r'[^a-zA-Z0-9]+', '-', name.lower()).strip('-') or 'ws'
    slug = slug_base
    counter = 1
    while Workspace.query.filter_by(slug=slug).first():
        slug = f"{slug_base}-{counter}"
        counter += 1
        
    workspace = Workspace(
        name=name,
        slug=slug,
        description=data.get('description', ''),
        avatar_url=data.get('avatar_url'),
        owner_id=user.id
    )
    db.session.add(workspace)
    db.session.flush()
    
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role='Owner'
    )
    db.session.add(member)
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=workspace.id,
        action='workspace_created',
        user_id=user.id,
        details={'name': workspace.name}
    )
    
    res = workspace.to_dict()
    res['my_role'] = 'Owner'
    return success_response(res, message="Workspace created successfully.", status_code=201)


@workspace_bp.route('/<int:workspace_id>', methods=['GET'])
@workspace_role_required(minimum_role='Viewer')
def get_workspace_details(workspace_id):
    ws = Workspace.query.get(workspace_id)
    data = ws.to_dict()
    data['my_role'] = g.workspace_role
    return success_response(data)


@workspace_bp.route('/<int:workspace_id>', methods=['PUT'])
@workspace_role_required(minimum_role='Admin')
def update_workspace(workspace_id):
    ws = Workspace.query.get(workspace_id)
    data = request.get_json(silent=True) or {}
    
    if 'name' in data and data['name'].strip():
        ws.name = data['name'].strip()
    if 'description' in data:
        ws.description = data['description']
    if 'avatar_url' in data:
        ws.avatar_url = data['avatar_url']
        
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=ws.id,
        action='workspace_updated',
        user_id=g.current_user.id,
        details={'name': ws.name}
    )
    return success_response(ws.to_dict(), message="Workspace updated.")


@workspace_bp.route('/<int:workspace_id>', methods=['DELETE'])
@workspace_role_required(minimum_role='Owner')
def delete_workspace(workspace_id):
    ws = Workspace.query.get(workspace_id)
    db.session.delete(ws)
    db.session.commit()
    return success_response(message="Workspace permanently deleted.")


@workspace_bp.route('/<int:workspace_id>/members', methods=['GET'])
@workspace_role_required(minimum_role='Viewer')
def get_workspace_members(workspace_id):
    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id).all()
    return success_response([m.to_dict() for m in members])


@workspace_bp.route('/<int:workspace_id>/members', methods=['POST'])
@workspace_bp.route('/<int:workspace_id>/invitations', methods=['POST'])
@workspace_role_required(minimum_role='Admin')
def add_or_invite_member(workspace_id):
    ws = Workspace.query.get(workspace_id)
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    role = data.get('role', 'Member')
    
    if not email:
        return error_response("Member email address is required.", 400)
    if role not in ('Admin', 'Member', 'Viewer'):
        return error_response("Invalid role specified.", 400)
        
    # Only Owner can invite Admins
    if role in ('Admin', 'Owner') and g.workspace_role != 'Owner':
        return error_response("Only the workspace Owner can grant Admin or Owner permissions.", 403)
        
    target_user = User.query.filter_by(email=email).first()
    if target_user:
        existing = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=target_user.id).first()
        if existing:
            return error_response("User is already a member of this workspace.", 409)
            
    invitation = WorkspaceInvitation.create_or_refresh(
        workspace_id=ws.id,
        email=email,
        role=role,
        invited_by_id=g.current_user.id,
        expires_in_days=7
    )
    
    NotificationService.notify_workspace_invite(
        workspace=ws,
        inviter=g.current_user,
        recipient_email=email,
        role=role,
        registered_user=target_user,
        token=invitation.token
    )
    
    ActivityService.log_activity(
        workspace_id=ws.id,
        action='invitation_sent',
        user_id=g.current_user.id,
        details={'email': email, 'role': role}
    )
    return success_response(invitation.to_dict(), message=f"Invitation sent to {email}.", status_code=201)


@workspace_bp.route('/<int:workspace_id>/invitations', methods=['GET'])
@workspace_role_required(minimum_role='Admin')
def get_workspace_invitations(workspace_id):
    """Retrieve all pending and valid invitations for a workspace."""
    invitations = WorkspaceInvitation.query.filter_by(
        workspace_id=workspace_id,
        status='pending'
    ).order_by(WorkspaceInvitation.created_at.desc()).all()
    
    results = []
    for inv in invitations:
        inv.is_valid()  # Transitions expired tokens automatically
        results.append(inv.to_dict())
    return success_response(results)


@workspace_bp.route('/<int:workspace_id>/invitations/<int:invitation_id>/resend', methods=['POST'])
@workspace_role_required(minimum_role='Admin')
def resend_invitation(workspace_id, invitation_id):
    """Refresh token and extend expiration by 7 days, then resend email notification."""
    ws = Workspace.query.get(workspace_id)
    invitation = WorkspaceInvitation.query.filter_by(id=invitation_id, workspace_id=workspace_id).first()
    if not invitation:
        return error_response("Invitation not found.", 404)
        
    invitation = WorkspaceInvitation.create_or_refresh(
        workspace_id=workspace_id,
        email=invitation.email,
        role=invitation.role,
        invited_by_id=g.current_user.id,
        expires_in_days=7
    )
    
    target_user = User.query.filter_by(email=invitation.email).first()
    NotificationService.notify_workspace_invite(
        workspace=ws,
        inviter=g.current_user,
        recipient_email=invitation.email,
        role=invitation.role,
        registered_user=target_user,
        token=invitation.token
    )
    
    ActivityService.log_activity(
        workspace_id=workspace_id,
        action='invitation_resent',
        user_id=g.current_user.id,
        details={'email': invitation.email, 'role': invitation.role}
    )
    return success_response(invitation.to_dict(), message=f"Invitation resent to {invitation.email}.")


@workspace_bp.route('/<int:workspace_id>/invitations/<int:invitation_id>', methods=['DELETE'])
@workspace_role_required(minimum_role='Admin')
def cancel_invitation(workspace_id, invitation_id):
    """Revoke / cancel a pending invitation."""
    invitation = WorkspaceInvitation.query.filter_by(id=invitation_id, workspace_id=workspace_id).first()
    if not invitation:
        return error_response("Invitation not found.", 404)
        
    invitation.status = 'cancelled'
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=workspace_id,
        action='invitation_cancelled',
        user_id=g.current_user.id,
        details={'email': invitation.email}
    )
    return success_response(message="Invitation successfully cancelled.")


@workspace_bp.route('/invitations/<string:token>', methods=['GET'])
def get_invitation_by_token(token):
    """Public inspection endpoint to retrieve invitation metadata before accepting."""
    invitation = WorkspaceInvitation.query.filter_by(token=token).first()
    if not invitation:
        return error_response("Invalid or expired invitation link.", 404)
        
    is_valid = invitation.is_valid()
    data = invitation.to_dict()
    data['is_valid'] = is_valid
    return success_response(data)


@workspace_bp.route('/invitations/<string:token>/accept', methods=['POST'])
@jwt_auth_required
def accept_invitation(token):
    """Accept an invitation, enroll user in the workspace, and join #general channel."""
    invitation = WorkspaceInvitation.query.filter_by(token=token).first()
    if not invitation:
        return error_response("Invalid invitation token.", 404)
        
    if not invitation.is_valid():
        return error_response("This invitation is invalid, cancelled, or has expired.", 400)
        
    user = g.current_user
    ws = invitation.workspace
    if not ws:
        return error_response("The associated workspace no longer exists.", 404)
        
    existing = WorkspaceMember.query.filter_by(workspace_id=ws.id, user_id=user.id).first()
    if not existing:
        new_member = WorkspaceMember(
            workspace_id=ws.id,
            user_id=user.id,
            role=invitation.role
        )
        db.session.add(new_member)
        
        try:
            from backend.routes.chat_routes import ensure_workspace_default_channel
            ensure_workspace_default_channel(ws.id)
        except Exception:
            pass
            
        ActivityService.log_activity(
            workspace_id=ws.id,
            action='invitation_accepted',
            user_id=user.id,
            details={'email': user.email, 'role': invitation.role}
        )
        
    invitation.status = 'accepted'
    invitation.accepted_at = datetime.now(timezone.utc)
    db.session.commit()
    
    return success_response({
        'workspace': ws.to_dict(),
        'role': invitation.role
    }, message=f"You have joined {ws.name} as {invitation.role}.")


@workspace_bp.route('/<int:workspace_id>/members/<int:user_id>', methods=['PUT'])
@workspace_role_required(minimum_role='Admin')
def update_member_role(workspace_id, user_id):
    ws = Workspace.query.get(workspace_id)
    if user_id == ws.owner_id:
        return error_response("Cannot modify the workspace Owner's role.", 403)
        
    data = request.get_json(silent=True) or {}
    new_role = data.get('role')
    if new_role not in ('Admin', 'Member', 'Viewer'):
        return error_response("Invalid role specified.", 400)
        
    if new_role == 'Admin' and g.workspace_role != 'Owner':
        return error_response("Only the workspace Owner can promote to Admin.", 403)
        
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=user_id).first()
    if not member:
        return error_response("Workspace member not found.", 404)
        
    member.role = new_role
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=workspace_id,
        action='member_role_changed',
        user_id=g.current_user.id,
        details={'target_user_id': user_id, 'new_role': new_role}
    )
    return success_response(member.to_dict(), message="Member role updated.")


@workspace_bp.route('/<int:workspace_id>/members/<int:user_id>', methods=['DELETE'])
@workspace_role_required(minimum_role='Admin')
def remove_member(workspace_id, user_id):
    ws = Workspace.query.get(workspace_id)
    if user_id == ws.owner_id:
        return error_response("The workspace Owner cannot be removed.", 403)
        
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=user_id).first()
    if not member:
        return error_response("Workspace member not found.", 404)
        
    if member.role == 'Admin' and g.workspace_role != 'Owner':
        return error_response("Only the Owner can remove an Admin.", 403)
        
    db.session.delete(member)
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=workspace_id,
        action='member_removed',
        user_id=g.current_user.id,
        details={'removed_user_id': user_id}
    )
    return success_response(message="Member removed from workspace.")


@workspace_bp.route('/<int:workspace_id>/tags', methods=['GET'])
@workspace_role_required(minimum_role='Viewer')
def get_tags(workspace_id):
    tags = Tag.query.filter_by(workspace_id=workspace_id).all()
    return success_response([t.to_dict() for t in tags])


@workspace_bp.route('/<int:workspace_id>/tags', methods=['POST'])
@workspace_role_required(minimum_role='Member')
def create_tag(workspace_id):
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    color = data.get('color', '#3b82f6')
    if not name:
        return error_response("Tag name is required.", 400)
        
    existing = Tag.query.filter_by(workspace_id=workspace_id, name=name).first()
    if existing:
        return success_response(existing.to_dict(), message="Tag already exists.")
        
    tag = Tag(workspace_id=workspace_id, name=name, color=color)
    db.session.add(tag)
    db.session.commit()
    return success_response(tag.to_dict(), message="Tag created.", status_code=201)
