import secrets
from datetime import datetime, timedelta, timezone
from backend.models.base import db, BaseModel


class WorkspaceInvitation(db.Model, BaseModel):
    __tablename__ = 'workspace_invitations'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    role = db.Column(db.String(20), default='Member', nullable=False)  # 'Admin', 'Member', 'Viewer'
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    invited_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # 'pending', 'accepted', 'cancelled', 'expired'
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    workspace = db.relationship('Workspace', backref=db.backref('invitations', cascade='all, delete-orphan'))
    invited_by = db.relationship('User', foreign_keys=[invited_by_id])

    @classmethod
    def create_or_refresh(cls, workspace_id: int, email: str, role: str, invited_by_id: int, expires_in_days: int = 7):
        """Create a new invitation or refresh an existing pending/expired invitation."""
        normalized_email = email.strip().lower()
        now = datetime.now(timezone.utc)
        expiration = now + timedelta(days=expires_in_days)

        # Check for existing invitation for this workspace + email
        existing = cls.query.filter_by(
            workspace_id=workspace_id,
            email=normalized_email
        ).filter(cls.status.in_(['pending', 'expired', 'cancelled'])).first()

        if existing:
            existing.token = secrets.token_urlsafe(48)
            existing.role = role
            existing.invited_by_id = invited_by_id
            existing.status = 'pending'
            existing.expires_at = expiration
            existing.accepted_at = None
            db.session.commit()
            return existing

        token_str = secrets.token_urlsafe(48)
        invitation = cls(
            workspace_id=workspace_id,
            email=normalized_email,
            role=role,
            token=token_str,
            invited_by_id=invited_by_id,
            status='pending',
            expires_at=expiration
        )
        db.session.add(invitation)
        db.session.commit()
        return invitation

    def is_valid(self) -> bool:
        """Check if invitation is still pending and unexpired."""
        if self.status != 'pending':
            return False

        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if exp <= now:
            self.status = 'expired'
            db.session.commit()
            return False

        return True

    def to_dict(self, base_url: str = 'http://localhost:5173') -> dict:
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'workspace_name': self.workspace.name if self.workspace else None,
            'email': self.email,
            'role': self.role,
            'token': self.token,
            'status': self.status,
            'invited_by_id': self.invited_by_id,
            'inviter_name': self.invited_by.full_name if self.invited_by else None,
            'inviter_email': self.invited_by.email if self.invited_by else None,
            'invite_url': f"{base_url}/invite/{self.token}",
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None
        }
