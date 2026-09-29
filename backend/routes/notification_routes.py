from flask import Blueprint, request, g
from backend.models import db, Notification
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required

notification_bp = Blueprint('notifications', __name__)


@notification_bp.route('', methods=['GET'])
@jwt_auth_required
def get_notifications():
    user = g.current_user
    limit = int(request.args.get('limit', 30))
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    query = Notification.query.filter_by(user_id=user.id)
    if unread_only:
        query = query.filter_by(is_read=False)
        
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    
    return success_response({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count
    })


@notification_bp.route('/unread-count', methods=['GET'])
@jwt_auth_required
def get_unread_count():
    user = g.current_user
    count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return success_response({'unread_count': count})


@notification_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@jwt_auth_required
def mark_read(notification_id):
    notif = Notification.query.get(notification_id)
    if not notif or notif.user_id != g.current_user.id:
        return error_response("Notification not found.", 404)
        
    notif.is_read = True
    db.session.commit()
    return success_response(notif.to_dict(), message="Marked as read.")


@notification_bp.route('/read-all', methods=['PATCH'])
@jwt_auth_required
def mark_all_read():
    user = g.current_user
    Notification.query.filter_by(user_id=user.id, is_read=False).update({'is_read': True})
    db.session.commit()
    return success_response(message="All notifications marked as read.")


@notification_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_auth_required
def delete_notification(notification_id):
    notif = Notification.query.get(notification_id)
    if not notif or notif.user_id != g.current_user.id:
        return error_response("Notification not found.", 404)
        
    db.session.delete(notif)
    db.session.commit()
    return success_response(message="Notification dismissed.")
