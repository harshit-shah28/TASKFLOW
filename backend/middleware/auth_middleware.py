from functools import wraps
from flask import request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from backend.models import User, WorkspaceMember
from backend.utils.response import error_response

ROLE_HIERARCHY = {
    'Viewer': 1,
    'Member': 2,
    'Admin': 3,
    'Owner': 4
}


def get_authenticated_user() -> User | None:
    """Helper to fetch currently authenticated user model from TaskFlow JWT or Clerk session token."""
    # 1. Try TaskFlow JWT first
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(int(user_id))
            if user and user.is_active:
                return user
    except Exception:
        pass

    # 2. Try Clerk session token
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
        try:
            from backend.services.clerk_service import ClerkService
            clerk_info = ClerkService.verify_session_token(token)
            if clerk_info:
                user = ClerkService.get_or_create_user(clerk_info)
                if user and user.is_active:
                    return user
        except Exception:
            pass

    return None


def jwt_auth_required(fn):
    """Decorator ensuring valid JWT token or Clerk session token and active user."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_authenticated_user()
        if not user:
            return error_response("Authentication failed: Valid session token required.", 401)
        if not user.is_active:
            return error_response("Account is deactivated. Contact support.", 403)
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper


def workspace_role_required(minimum_role='Member'):
    """
    Decorator ensuring current user is a member of target workspace
    with at least the specified minimum role (Viewer, Member, Admin, Owner).
    Looks for workspace_id in URL params, headers ('X-Workspace-Id'), or JSON body.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                user = get_authenticated_user()
                if not user or not user.is_active:
                    return error_response("Unauthorized.", 401)
                g.current_user = user
                
                # Determine workspace_id
                workspace_id = kwargs.get('workspace_id')
                if not workspace_id:
                    workspace_id = request.headers.get('X-Workspace-Id')
                if not workspace_id and request.is_json:
                    data = request.get_json(silent=True) or {}
                    workspace_id = data.get('workspace_id')
                if not workspace_id:
                    workspace_id = request.args.get('workspace_id')
                    
                if not workspace_id:
                    return error_response("Workspace ID is required for this operation.", 400)
                    
                membership = WorkspaceMember.query.filter_by(
                    workspace_id=int(workspace_id),
                    user_id=user.id
                ).first()
                
                if not membership:
                    return error_response("Access denied: You are not a member of this workspace.", 403)
                    
                user_level = ROLE_HIERARCHY.get(membership.role, 0)
                req_level = ROLE_HIERARCHY.get(minimum_role, 2)
                
                if user_level < req_level:
                    return error_response(
                        f"Access denied: Requires '{minimum_role}' role or higher. Your role is '{membership.role}'.",
                        403
                    )
                    
                g.workspace_membership = membership
                g.workspace_role = membership.role
                return fn(*args, **kwargs)
            except Exception as e:
                return error_response(f"Authorization error: {str(e)}", 403)
        return wrapper
    return decorator
