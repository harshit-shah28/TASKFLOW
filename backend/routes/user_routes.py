from flask import Blueprint, request, g
from backend.models import db, User
from backend.utils.response import success_response, error_response
from backend.utils.validators import validate_password_strength
from backend.middleware.auth_middleware import jwt_auth_required
from backend.services.notification_service import NotificationService

user_bp = Blueprint('users', __name__)


@user_bp.route('/profile', methods=['GET'])
@jwt_auth_required
def get_profile():
    return success_response(g.current_user.to_dict(include_private=True))


@user_bp.route('/profile', methods=['PUT'])
@jwt_auth_required
def update_profile():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    
    if 'full_name' in data and data['full_name'].strip():
        user.full_name = data['full_name'].strip()
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']
    if 'bio' in data:
        user.bio = data['bio']
    if 'theme_preference' in data and data['theme_preference'] in ('light', 'dark', 'system'):
        user.theme_preference = data['theme_preference']
        
    db.session.commit()
    return success_response(user.to_dict(include_private=True), message="Profile updated successfully.")


@user_bp.route('/password', methods=['PUT'])
@jwt_auth_required
def change_password():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if user.password_hash and not current_password:
        return error_response("Current password is required.", 400)
        
    if user.password_hash and not user.check_password(current_password):
        return error_response("Incorrect current password.", 400)
        
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        return error_response(msg, 400)
        
    user.set_password(new_password)
    db.session.commit()
    
    NotificationService.notify_password_changed(user)
    return success_response(message="Password changed successfully.")


@user_bp.route('/preferences', methods=['GET'])
@jwt_auth_required
def get_preferences():
    return success_response(g.current_user.email_preferences)


@user_bp.route('/preferences', methods=['PUT'])
@jwt_auth_required
def update_preferences():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    
    current_prefs = user.email_preferences
    for key, val in data.items():
        if isinstance(val, bool):
            current_prefs[key] = val
            
    user.email_preferences = current_prefs
    db.session.commit()
    return success_response(user.email_preferences, message="Email preferences updated.")


@user_bp.route('/search', methods=['GET'])
@jwt_auth_required
def search_users():
    """Lookup users by email or name for workspace invitations or task assignment."""
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return success_response([])
        
    matched = User.query.filter(
        db.or_(
            User.email.ilike(f"%{query}%"),
            User.full_name.ilike(f"%{query}%")
        )
    ).limit(10).all()
    
    return success_response([u.to_dict() for u in matched])
