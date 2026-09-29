import os
import requests
from flask import Blueprint, request, current_app, redirect
from flask_jwt_extended import create_access_token
from backend.models import db, User, Workspace, WorkspaceMember
from backend.utils.response import success_response, error_response
from backend.services.notification_service import NotificationService

oauth_bp = Blueprint('oauth', __name__)


@oauth_bp.route('/status', methods=['GET'])
def get_oauth_status():
    """Report which OAuth providers are configured in the current environment."""
    config = current_app.config
    google_configured = bool(config.get('GOOGLE_CLIENT_ID') and config.get('GOOGLE_CLIENT_SECRET'))
    github_configured = bool(config.get('GITHUB_CLIENT_ID') and config.get('GITHUB_CLIENT_SECRET'))
    
    return success_response({
        'google': {
            'configured': google_configured,
            'client_id': config.get('GOOGLE_CLIENT_ID', '') if google_configured else None
        },
        'github': {
            'configured': github_configured,
            'client_id': config.get('GITHUB_CLIENT_ID', '') if github_configured else None
        }
    })


@oauth_bp.route('/google/url', methods=['GET'])
def get_google_auth_url():
    """Generates the Google OAuth 2.0 authorization URL."""
    config = current_app.config
    client_id = config.get('GOOGLE_CLIENT_ID')
    redirect_uri = config.get('GOOGLE_REDIRECT_URI')
    
    if not client_id or not config.get('GOOGLE_CLIENT_SECRET'):
        return error_response(
            "Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
            400,
            errors={'provider': 'google', 'configured': False}
        )
        
    scope = "openid email profile"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return success_response({'url': auth_url})


@oauth_bp.route('/google/callback', methods=['POST'])
def handle_google_callback():
    """Exchanges Google auth code for token and retrieves profile info."""
    data = request.get_json(silent=True) or {}
    code = data.get('code')
    if not code:
        return error_response("Authorization code from Google is required.", 400)
        
    config = current_app.config
    client_id = config.get('GOOGLE_CLIENT_ID')
    client_secret = config.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = config.get('GOOGLE_REDIRECT_URI')
    
    if not client_id or not client_secret:
        return error_response("Google OAuth credentials missing on backend.", 500)
        
    try:
        # 1. Exchange code for access token
        token_res = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            },
            headers={'Accept': 'application/json'},
            timeout=10
        )
        token_data = token_res.json()
        if 'error' in token_data:
            return error_response(f"Google OAuth error: {token_data.get('error_description', token_data['error'])}", 400)
            
        access_token = token_data.get('access_token')
        
        # 2. Fetch user profile
        user_res = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        user_info = user_res.json()
        
        email = user_info.get('email', '').strip().lower()
        if not email:
            return error_response("Could not retrieve email from Google profile.", 400)
            
        full_name = user_info.get('name') or user_info.get('given_name') or email.split('@')[0]
        avatar_url = user_info.get('picture')
        google_sub = user_info.get('sub')
        
        # 3. Find or create user
        user = User.query.filter_by(email=email).first()
        is_new = False
        if not user:
            is_new = True
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                is_verified=True, # Google emails are pre-verified
                auth_provider='google',
                provider_id=google_sub
            )
            db.session.add(user)
            db.session.flush()
            
            # Create default personal workspace
            workspace = Workspace(
                name=f"{user.full_name}'s Workspace",
                slug=f"ws-{user.id}",
                description="Personal workspace",
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
            
            NotificationService.send_welcome(user)
        else:
            # Update provider details if not set
            if not user.provider_id:
                user.auth_provider = 'google'
                user.provider_id = google_sub
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            user.is_verified = True
            db.session.commit()
            
        jwt_token = create_access_token(identity=str(user.id))
        return success_response({
            'token': jwt_token,
            'user': user.to_dict(include_private=True),
            'is_new_user': is_new
        }, message="Google authentication successful.")
        
    except Exception as e:
        return error_response(f"Google login failed: {str(e)}", 500)


@oauth_bp.route('/github/url', methods=['GET'])
def get_github_auth_url():
    """Generates the GitHub OAuth authorization URL."""
    config = current_app.config
    client_id = config.get('GITHUB_CLIENT_ID')
    redirect_uri = config.get('GITHUB_REDIRECT_URI')
    
    if not client_id or not config.get('GITHUB_CLIENT_SECRET'):
        return error_response(
            "GitHub OAuth is not configured on this server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.",
            400,
            errors={'provider': 'github', 'configured': False}
        )
        
    scope = "read:user user:email"
    auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}"
    )
    return success_response({'url': auth_url})


@oauth_bp.route('/github/callback', methods=['POST'])
def handle_github_callback():
    """Exchanges GitHub auth code for token and profile."""
    data = request.get_json(silent=True) or {}
    code = data.get('code')
    if not code:
        return error_response("Authorization code from GitHub is required.", 400)
        
    config = current_app.config
    client_id = config.get('GITHUB_CLIENT_ID')
    client_secret = config.get('GITHUB_CLIENT_SECRET')
    redirect_uri = config.get('GITHUB_REDIRECT_URI')
    
    if not client_id or not client_secret:
        return error_response("GitHub OAuth credentials missing on backend.", 500)
        
    try:
        token_res = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'redirect_uri': redirect_uri
            },
            headers={'Accept': 'application/json'},
            timeout=10
        )
        token_data = token_res.json()
        if 'error' in token_data:
            return error_response(f"GitHub OAuth error: {token_data.get('error_description', token_data['error'])}", 400)
            
        access_token = token_data.get('access_token')
        
        # Fetch GitHub user profile
        user_res = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'},
            timeout=10
        )
        user_info = user_res.json()
        
        email = user_info.get('email')
        # If email is private in GitHub, fetch emails list
        if not email:
            emails_res = requests.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'},
                timeout=10
            )
            emails_list = emails_res.json()
            for em in emails_list:
                if em.get('primary') and em.get('verified'):
                    email = em.get('email')
                    break
            if not email and emails_list:
                email = emails_list[0].get('email')
                
        if not email:
            return error_response("Could not retrieve a verified email address from GitHub.", 400)
            
        email = email.strip().lower()
        full_name = user_info.get('name') or user_info.get('login') or email.split('@')[0]
        avatar_url = user_info.get('avatar_url')
        github_id = str(user_info.get('id'))
        
        user = User.query.filter_by(email=email).first()
        is_new = False
        if not user:
            is_new = True
            user = User(
                email=email,
                full_name=full_name,
                avatar_url=avatar_url,
                is_verified=True,
                auth_provider='github',
                provider_id=github_id
            )
            db.session.add(user)
            db.session.flush()
            
            workspace = Workspace(
                name=f"{user.full_name}'s Workspace",
                slug=f"ws-{user.id}",
                description="Personal workspace",
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
            
            NotificationService.send_welcome(user)
        else:
            if not user.provider_id:
                user.auth_provider = 'github'
                user.provider_id = github_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            user.is_verified = True
            db.session.commit()
            
        jwt_token = create_access_token(identity=str(user.id))
        return success_response({
            'token': jwt_token,
            'user': user.to_dict(include_private=True),
            'is_new_user': is_new
        }, message="GitHub authentication successful.")
        
    except Exception as e:
        return error_response(f"GitHub login failed: {str(e)}", 500)
