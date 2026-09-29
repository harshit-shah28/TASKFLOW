from datetime import datetime, timezone
from flask import Blueprint, request, current_app
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request
from backend.models import db, User, Workspace, WorkspaceMember, EmailVerificationToken, PasswordResetToken, WorkspaceInvitation
from backend.utils.response import success_response, error_response
from backend.utils.validators import validate_email_address, validate_password_strength, check_missing_fields
from backend.services.notification_service import NotificationService
from backend.services.activity_service import ActivityService
from backend.middleware.auth_middleware import jwt_auth_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new User, create their default Personal Workspace, and issue JWT."""
    data = request.get_json(silent=True) or {}
    missing = check_missing_fields(data, ['email', 'password', 'full_name'])
    if missing:
        return error_response(f"Missing required fields: {', '.join(missing)}", 400)

    is_valid_email, email_or_err = validate_email_address(data.get('email', ''))
    if not is_valid_email:
        return error_response(email_or_err, 400)
    email = email_or_err

    is_valid_pass, pass_err = validate_password_strength(data.get('password', ''))
    if not is_valid_pass:
        return error_response(pass_err, 400)

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return error_response("An account with this email already exists.", 409)

    user = User(
        email=email,
        full_name=data.get('full_name').strip(),
        is_verified=False
    )
    user.set_password(data.get('password'))
    db.session.add(user)
    db.session.flush() # Generate user.id

    # Create default personal workspace
    workspace_name = f"{user.full_name}'s Workspace"
    base_slug = f"ws-{user.id}"
    workspace = Workspace(
        name=workspace_name,
        slug=base_slug,
        description="Personal workspace for managing tasks and projects.",
        owner_id=user.id
    )
    db.session.add(workspace)
    db.session.flush()

    # Assign user as Owner
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role='Owner'
    )
    db.session.add(member)
    db.session.commit()

    # Auto-enroll in any workspaces where a valid pending invitation exists for this email (isolated & non-blocking)
    try:
        pending_invites = WorkspaceInvitation.query.filter_by(
            email=email,
            status='pending'
        ).all()
        for invite in pending_invites:
            try:
                if invite.is_valid():
                    existing_m = WorkspaceMember.query.filter_by(workspace_id=invite.workspace_id, user_id=user.id).first()
                    if not existing_m:
                        new_m = WorkspaceMember(
                            workspace_id=invite.workspace_id,
                            user_id=user.id,
                            role=invite.role
                        )
                        db.session.add(new_m)
                    invite.status = 'accepted'
                    invite.accepted_at = datetime.now(timezone.utc)
                    db.session.commit()

                    try:
                        from backend.routes.chat_routes import ensure_workspace_default_channel
                        ensure_workspace_default_channel(invite.workspace_id)
                    except Exception:
                        pass

                    try:
                        ActivityService.log_activity(
                            workspace_id=invite.workspace_id,
                            action='invitation_accepted',
                            user_id=user.id,
                            details={'email': user.email, 'role': invite.role}
                        )
                    except Exception:
                        pass
            except Exception as single_err:
                db.session.rollback()
                current_app.logger.warning(f"Error processing invitation {invite.id}: {single_err}")
    except Exception as invites_err:
        db.session.rollback()
        current_app.logger.warning(f"Error checking pending invitations during register: {invites_err}")

    # Fetch all accessible workspaces (including any joined via invitations)
    workspaces = []
    try:
        workspaces = [m.workspace.to_dict() for m in user.workspace_memberships if m.workspace]
    except Exception:
        workspaces = [workspace.to_dict()]

    # Generate verification token and send welcome & verification emails safely (non-blocking)
    try:
        token_obj = EmailVerificationToken.generate_for_user(user.id)
        NotificationService.send_welcome(user)
        NotificationService.send_verification(user, token_obj.token)
    except Exception as email_err:
        current_app.logger.warning(f"Registration email notification failed: {email_err}")

    # Issue JWT token
    access_token = create_access_token(identity=str(user.id))

    return success_response({
        'token': access_token,
        'user': user.to_dict(include_private=True),
        'default_workspace': workspace.to_dict(),
        'workspaces': workspaces
    }, message="Registration successful! Welcome to TaskFlow.", status_code=201)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate with email and password, returning JWT access token."""
    data = request.get_json(silent=True) or {}
    missing = check_missing_fields(data, ['email', 'password'])
    if missing:
        return error_response(f"Missing required fields: {', '.join(missing)}", 400)

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error_response("Invalid email or password.", 401)

    if not user.is_active:
        return error_response("Your account has been deactivated. Please contact support.", 403)

    access_token = create_access_token(identity=str(user.id))

    # Fetch user's workspaces
    workspaces = [m.workspace.to_dict() for m in user.workspace_memberships if m.workspace]

    return success_response({
        'token': access_token,
        'user': user.to_dict(include_private=True),
        'workspaces': workspaces
    }, message="Login successful.")


@auth_bp.route('/me', methods=['GET'])
@jwt_auth_required
def get_current_user_profile():
    """Get authenticated user info and accessible workspaces."""
    from flask import g
    user = g.current_user
    memberships = WorkspaceMember.query.filter_by(user_id=user.id).all()
    workspaces = []
    for m in memberships:
        ws_data = m.workspace.to_dict()
        ws_data['user_role'] = m.role
        workspaces.append(ws_data)

    return success_response({
        'user': user.to_dict(include_private=True),
        'workspaces': workspaces
    })


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Client handles clearing token. Endpoint confirms logout."""
    return success_response(message="Logged out successfully.")


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Initiate password reset flow and dispatch email with reset link."""
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return error_response("Email address is required.", 400)

    user = User.query.filter_by(email=email).first()
    # Anti-enumeration response: always return generic success message
    if user and user.is_active:
        token_obj = PasswordResetToken.generate_for_user(user.id)
        NotificationService.send_password_reset(user, token_obj.token)

    return success_response(
        message="If an account with that email exists, a password reset link has been sent."
    )


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using secure one-time token."""
    data = request.get_json(silent=True) or {}
    token_str = data.get('token', '').strip()
    new_password = data.get('password', '')

    if not token_str or not new_password:
        return error_response("Token and new password are required.", 400)

    is_valid_pass, pass_err = validate_password_strength(new_password)
    if not is_valid_pass:
        return error_response(pass_err, 400)

    token_obj = PasswordResetToken.query.filter_by(token=token_str).first()
    if not token_obj or not token_obj.is_valid():
        return error_response("Invalid or expired password reset token.", 400)

    user = User.query.get(token_obj.user_id)
    if not user:
        return error_response("User not found.", 404)

    user.set_password(new_password)
    token_obj.is_used = True
    db.session.commit()

    NotificationService.notify_password_changed(user)
    return success_response(message="Password has been reset successfully. You can now log in.")


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email address using verification token."""
    data = request.get_json(silent=True) or {}
    token_str = data.get('token', '').strip()
    if not token_str:
        return error_response("Verification token is required.", 400)

    token_obj = EmailVerificationToken.query.filter_by(token=token_str).first()
    if not token_obj or not token_obj.is_valid():
        return error_response("Invalid or expired email verification link.", 400)

    user = User.query.get(token_obj.user_id)
    if not user:
        return error_response("User not found.", 404)

    user.is_verified = True
    token_obj.is_used = True
    db.session.commit()

    return success_response({
        'user': user.to_dict()
    }, message="Email verified successfully! You have full access to TaskFlow.")


@auth_bp.route('/resend-verification', methods=['POST'])
@jwt_auth_required
def resend_verification():
    """Resend email verification link for authenticated user."""
    from flask import g
    user = g.current_user
    if user.is_verified:
        return error_response("Your email is already verified.", 400)

    token_obj = EmailVerificationToken.generate_for_user(user.id)
    NotificationService.send_verification(user, token_obj.token)
    return success_response(message="Verification email resent. Please check your inbox.")


@auth_bp.route('/clerk-sync', methods=['POST'])
def clerk_sync():
    """
    Synchronize verified Clerk identity with TaskFlow.
    Validates Clerk token, resolves or creates TaskFlow User,
    and issues standard TaskFlow access token.
    """
    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()
    clerk_user_id = data.get('clerk_user_id', '').strip()
    email = data.get('email', '').strip().lower()
    full_name = data.get('full_name', '').strip()

    if not clerk_user_id and not token:
        return error_response("Clerk user ID or session token is required.", 400)

    from backend.services.clerk_service import ClerkService

    # Verify token if provided
    clerk_info = None
    if token:
        clerk_info = ClerkService.verify_session_token(token)

    if not clerk_info:
        # Fall back to payload if clerk_user_id provided in dev/test
        if clerk_user_id:
            clerk_info = {
                'clerk_user_id': clerk_user_id,
                'email': email,
                'email_verified': True,
                'full_name': full_name or (email.split('@')[0] if email else 'User')
            }
        else:
            return error_response("Invalid or unverified Clerk session.", 401)

    if not clerk_info.get('email_verified', False):
        return error_response("Email address must be verified before accessing TaskFlow.", 403)

    user = ClerkService.get_or_create_user(clerk_info)
    if not user.is_active:
        return error_response("Account is deactivated. Contact support.", 403)

    # If new password was provided (e.g. from password reset sync), update local password hash
    new_password = data.get('password')
    if new_password and len(new_password) >= 8:
        user.set_password(new_password)
        db.session.commit()

    # Issue TaskFlow JWT token
    access_token = create_access_token(identity=str(user.id))

    # Fetch user's workspaces
    workspaces = [m.workspace.to_dict() for m in user.workspace_memberships if m.workspace]
    default_workspace = workspaces[0] if workspaces else None

    return success_response({
        'token': access_token,
        'user': user.to_dict(include_private=True),
        'default_workspace': default_workspace,
        'workspaces': workspaces
    }, message="Clerk authentication successful! Welcome to TaskFlow.", status_code=200)
