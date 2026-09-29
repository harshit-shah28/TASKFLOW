import logging
from collections import defaultdict
from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import emit, join_room, leave_room, disconnect
from backend.models import db, User, Conversation, ConversationMember, Message
from backend.sockets import socketio

logger = logging.getLogger(__name__)

# State trackers for connected clients
# user_id -> set of sids
online_users = defaultdict(set)
# sid -> user_id
sid_to_user = {}


def authenticate_socket_request(auth=None):
    """Extract and verify user from Socket.IO handshake auth or query params."""
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get('token')
    if not token and hasattr(request, 'args'):
        token = request.args.get('token')

    if not token:
        return None

    if token.startswith('Bearer '):
        token = token[7:]

    # 1. Try TaskFlow JWT
    try:
        decoded = decode_token(token)
        user_id = int(decoded['sub'])
        user = User.query.get(user_id)
        if user and user.is_active:
            return user
    except Exception:
        pass

    # 2. Try Clerk session token
    try:
        from backend.services.clerk_service import ClerkService
        clerk_info = ClerkService.verify_session_token(token)
        if clerk_info:
            user = ClerkService.get_or_create_user(clerk_info)
            if user and user.is_active:
                return user
    except Exception as e:
        logger.warning(f"Socket auth Clerk token validation failed: {e}")

    return None


@socketio.on('connect')
def handle_connect(auth=None):
    user = authenticate_socket_request(auth)
    if not user:
        logger.warning(f"Unauthorized socket connection rejected: sid={request.sid}")
        return False  # Reject connection

    sid = request.sid
    sid_to_user[sid] = user.id
    first_connection = len(online_users[user.id]) == 0
    online_users[user.id].add(sid)

    # Join a personal room for direct user-scoped notifications
    join_room(f"user_{user.id}")

    logger.info(f"Socket connected: user_id={user.id} ({user.email}), sid={sid}")

    if first_connection:
        # Notify others that this user is now online
        socketio.emit('user_online', {
            'user_id': user.id,
            'user': {
                'id': user.id,
                'full_name': user.full_name,
                'avatar_url': user.avatar_url
            }
        })

    emit('connected', {
        'status': 'connected',
        'user_id': user.id,
        'online_users': list(online_users.keys())
    })


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    user_id = sid_to_user.pop(sid, None)

    if user_id:
        if sid in online_users[user_id]:
            online_users[user_id].remove(sid)
            if len(online_users[user_id]) == 0:
                del online_users[user_id]
                # Broadcast that user went offline
                socketio.emit('user_offline', {'user_id': user_id})
                logger.info(f"User {user_id} is now offline")


@socketio.on('get_online_users')
def handle_get_online_users():
    emit('online_users_list', {'online_users': list(online_users.keys())})


@socketio.on('join_conversation')
def handle_join_conversation(data):
    sid = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        return {'status': 'error', 'message': 'Unauthenticated'}

    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return {'status': 'error', 'message': 'conversation_id required'}

    # Verify conversation membership
    membership = ConversationMember.query.filter_by(
        conversation_id=conversation_id,
        user_id=user_id
    ).first()

    if not membership:
        return {'status': 'error', 'message': 'Not a member of this conversation'}

    room_name = f"conversation_{conversation_id}"
    join_room(room_name)
    logger.debug(f"User {user_id} joined room {room_name}")
    return {'status': 'success', 'conversation_id': conversation_id}


@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    conversation_id = data.get('conversation_id')
    if conversation_id:
        room_name = f"conversation_{conversation_id}"
        leave_room(room_name)
        return {'status': 'success', 'conversation_id': conversation_id}
    return {'status': 'error', 'message': 'conversation_id required'}


@socketio.on('typing_start')
def handle_typing_start(data):
    sid = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return

    user = User.query.get(user_id)
    if not user:
        return

    room_name = f"conversation_{conversation_id}"
    emit('typing_start', {
        'conversation_id': conversation_id,
        'user': {
            'id': user.id,
            'full_name': user.full_name
        }
    }, room=room_name, include_self=False)


@socketio.on('typing_stop')
def handle_typing_stop(data):
    sid = request.sid
    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    conversation_id = data.get('conversation_id')
    if not conversation_id:
        return

    room_name = f"conversation_{conversation_id}"
    emit('typing_stop', {
        'conversation_id': conversation_id,
        'user_id': user_id
    }, room=room_name, include_self=False)


# Broadcast helper functions
def broadcast_new_message(conversation_id: int, message_dict: dict):
    """Broadcast a new message to all members in the conversation room and personal rooms."""
    room_name = f"conversation_{conversation_id}"
    socketio.emit('new_message', {
        'conversation_id': conversation_id,
        'message': message_dict
    }, room=room_name)

    # Also notify conversation members who might not have active room open
    members = ConversationMember.query.filter_by(conversation_id=conversation_id).all()
    for m in members:
        socketio.emit('conversation_updated', {
            'conversation_id': conversation_id,
            'last_message': message_dict
        }, room=f"user_{m.user_id}")


def broadcast_message_read(conversation_id: int, user_id: int, last_read_message_id: int):
    """Broadcast read status update."""
    room_name = f"conversation_{conversation_id}"
    socketio.emit('message_read', {
        'conversation_id': conversation_id,
        'user_id': user_id,
        'last_read_message_id': last_read_message_id
    }, room=room_name)


def broadcast_conversation_created(conversation_dict: dict, member_user_ids: list):
    """Notify users when a new conversation or channel is created."""
    for uid in member_user_ids:
        socketio.emit('conversation_created', {
            'conversation': conversation_dict
        }, room=f"user_{uid}")
