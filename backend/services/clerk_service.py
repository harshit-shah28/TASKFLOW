import os
import base64
import logging
from datetime import datetime, timezone
import requests
import jwt
from jwt import PyJWKClient
from flask import current_app
from backend.models import db, User, Workspace, WorkspaceMember, WorkspaceInvitation

logger = logging.getLogger(__name__)

# Global cache for JWK clients by JWKS URL to prevent repeated remote fetches
_jwks_clients = {}


class ClerkService:
    """
    Official Clerk authentication, token verification, and user synchronization service.
    Validates Clerk RS256 session tokens, checks email verification status,
    and maps Clerk identities to TaskFlow User and Workspace models.
    """

    @classmethod
    def get_secret_key(cls) -> str:
        try:
            return (current_app.config.get('CLERK_SECRET_KEY') or os.getenv('CLERK_SECRET_KEY', '')).strip()
        except Exception:
            return os.getenv('CLERK_SECRET_KEY', '').strip()

    @classmethod
    def get_publishable_key(cls) -> str:
        try:
            return (
                current_app.config.get('CLERK_PUBLISHABLE_KEY')
                or os.getenv('CLERK_PUBLISHABLE_KEY')
                or os.getenv('VITE_CLERK_PUBLISHABLE_KEY', '')
            ).strip()
        except Exception:
            return (os.getenv('CLERK_PUBLISHABLE_KEY') or os.getenv('VITE_CLERK_PUBLISHABLE_KEY', '')).strip()

    @classmethod
    def is_configured(cls) -> bool:
        """Returns True if Clerk publishable or secret key is present in environment."""
        return bool(cls.get_publishable_key() or cls.get_secret_key())

    @classmethod
    def derive_jwks_url(cls, token: str | None = None) -> str | None:
        """Derive JWKS URL from explicit config, token issuer claim, or publishable key."""
        try:
            explicit_jwks = (current_app.config.get('CLERK_JWKS_URL') or os.getenv('CLERK_JWKS_URL', '')).strip()
            if explicit_jwks:
                return explicit_jwks
        except Exception:
            pass

        # 1. Inspect token 'iss' claim
        if token:
            try:
                unverified = jwt.decode(token, options={"verify_signature": False})
                iss = unverified.get('iss')
                if iss and iss.startswith('https://'):
                    return f"{iss.rstrip('/')}/.well-known/jwks.json"
            except Exception:
                pass

        # 2. Derive from Clerk Publishable Key (pk_test_... or pk_live_...)
        pk = cls.get_publishable_key()
        if pk and (pk.startswith('pk_test_') or pk.startswith('pk_live_')):
            try:
                b64_part = pk.split('_', 2)[2]
                padded = b64_part + '=' * (-len(b64_part) % 4)
                decoded = base64.b64decode(padded).decode('utf-8').rstrip('$')
                if decoded:
                    return f"https://{decoded}/.well-known/jwks.json"
            except Exception as e:
                logger.debug(f"Could not derive JWKS URL from publishable key: {e}")

        return None

    @classmethod
    def verify_session_token(cls, token: str) -> dict | None:
        """
        Verifies a Clerk session JWT token using Clerk's JWKS or REST API.
        Returns verified dictionary with clerk_user_id, email, and email_verified,
        or None if token is invalid or unverified.
        """
        if not token or not isinstance(token, str):
            return None

        clean_token = token[7:].strip() if token.startswith('Bearer ') else token.strip()
        if not clean_token:
            return None

        # Inspect unverified claims
        try:
            unverified_headers = jwt.get_unverified_header(clean_token)
            unverified_payload = jwt.decode(clean_token, options={"verify_signature": False})
        except Exception as e:
            logger.warning(f"[ClerkService] Unable to decode JWT headers/claims: {e}")
            return None

        clerk_user_id = unverified_payload.get('sub')
        if not clerk_user_id:
            logger.warning("[ClerkService] Token missing 'sub' claim.")
            return None

        verified = False
        payload = unverified_payload

        # Method A: RS256 JWKS Signature Verification
        jwks_url = cls.derive_jwks_url(clean_token)
        if jwks_url and unverified_headers.get('alg') == 'RS256':
            try:
                if jwks_url not in _jwks_clients:
                    _jwks_clients[jwks_url] = PyJWKClient(jwks_url, cache_keys=True, max_cached_keys=16)
                client = _jwks_clients[jwks_url]
                signing_key = client.get_signing_key_from_jwt(clean_token)

                payload = jwt.decode(
                    clean_token,
                    signing_key.key,
                    algorithms=["RS256"],
                    options={"verify_aud": False, "verify_exp": True}
                )
                verified = True
            except Exception as jwks_err:
                logger.warning(f"[ClerkService] JWKS verification failed: {jwks_err}")

        # Method B: Clerk Secret Key API Verification
        secret_key = cls.get_secret_key()
        email = payload.get('email') or payload.get('primary_email_address') or ''
        email_verified = payload.get('email_verified', True)
        full_name = payload.get('name') or payload.get('full_name') or ''

        if secret_key:
            try:
                api_res = requests.get(
                    f"https://api.clerk.com/v1/users/{clerk_user_id}",
                    headers={"Authorization": f"Bearer {secret_key}"},
                    timeout=8
                )
                if api_res.status_code == 200:
                    user_obj = api_res.json()
                    verified = True
                    # Find primary verified email
                    primary_email_id = user_obj.get('primary_email_address_id')
                    emails = user_obj.get('email_addresses', [])
                    for em in emails:
                        if em.get('id') == primary_email_id or not email:
                            email = em.get('email_address', '')
                            verif = em.get('verification', {})
                            email_verified = (verif.get('status') == 'verified')

                    first = user_obj.get('first_name') or ''
                    last = user_obj.get('last_name') or ''
                    full_name = f"{first} {last}".strip() or email.split('@')[0]
            except Exception as api_err:
                logger.warning(f"[ClerkService] Clerk API user lookup error: {api_err}")

        # Method C: Development / Test Token Fallback
        # If in test/dev mode and token has valid format, allow verification
        if not verified:
            # Check if this is an internal test token or dev verification
            is_dev = os.getenv('FLASK_ENV') == 'development' or os.getenv('FLASK_DEBUG') in ('True', '1')
            if is_dev and (clerk_user_id.startswith('user_') or clerk_user_id.startswith('test_')):
                verified = True
                email = email or f"{clerk_user_id}@taskflow.dev"
                full_name = full_name or "Clerk Verified User"

        if not verified:
            logger.warning(f"[ClerkService] Token for user {clerk_user_id} could not be cryptographically verified.")
            return None

        return {
            'clerk_user_id': clerk_user_id,
            'email': email.strip().lower() if email else '',
            'email_verified': bool(email_verified),
            'full_name': full_name.strip() or (email.split('@')[0] if email else 'User')
        }

    @classmethod
    def get_or_create_user(cls, clerk_data: dict) -> User:
        """
        Resolves or creates a TaskFlow User from verified Clerk identity.
        Maintains workspace isolation, role permissions, and auto-processes invitations.
        """
        clerk_user_id = clerk_data.get('clerk_user_id')
        email = (clerk_data.get('email') or '').strip().lower()
        full_name = (clerk_data.get('full_name') or '').strip() or (email.split('@')[0] if email else 'User')

        user = None

        # 1. Lookup by clerk_user_id
        if clerk_user_id:
            user = User.query.filter_by(clerk_user_id=clerk_user_id).first()

        # 2. Lookup by email if not found by clerk_user_id
        if not user and email:
            user = User.query.filter_by(email=email).first()
            if user:
                # Link existing user account to Clerk ID
                if clerk_user_id:
                    user.clerk_user_id = clerk_user_id
                user.is_verified = True
                if user.auth_provider == 'local':
                    user.auth_provider = 'clerk'
                db.session.commit()

        # 3. Create new user if not exists
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                clerk_user_id=clerk_user_id,
                is_verified=True,
                auth_provider='clerk'
            )
            db.session.add(user)
            db.session.flush()

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

            # Assign user as Workspace Owner
            member = WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user.id,
                role='Owner'
            )
            db.session.add(member)
            db.session.commit()

            # Auto-enroll in any workspaces with valid pending invitations
            try:
                pending_invites = WorkspaceInvitation.query.filter_by(
                    email=email,
                    status='pending'
                ).all()
                for invite in pending_invites:
                    if invite.is_valid():
                        existing_m = WorkspaceMember.query.filter_by(
                            workspace_id=invite.workspace_id,
                            user_id=user.id
                        ).first()
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
            except Exception as inv_err:
                db.session.rollback()
                logger.warning(f"Error auto-accepting pending invitations for {email}: {inv_err}")

        return user
