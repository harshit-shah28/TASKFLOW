import json
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models.base import db, BaseModel


class User(db.Model, BaseModel):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True) # Nullable for pure OAuth accounts
    full_name = db.Column(db.String(150), nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_platform_admin = db.Column(db.Boolean, default=False, nullable=False)
    theme_preference = db.Column(db.String(20), default='system', nullable=False)
    
    # Auth provider details
    auth_provider = db.Column(db.String(50), default='local', nullable=False) # 'local', 'google', 'github', 'clerk'
    provider_id = db.Column(db.String(150), nullable=True, index=True)
    clerk_user_id = db.Column(db.String(150), nullable=True, unique=True, index=True)
    
    # Notification & Email preferences stored as serialized JSON
    _email_preferences = db.Column('email_preferences', db.Text, nullable=True)
    
    # Relationships
    workspace_memberships = db.relationship('WorkspaceMember', back_populates='user', cascade='all, delete-orphan')
    created_tasks = db.relationship('Task', back_populates='creator', foreign_keys='Task.creator_id')
    task_assignments = db.relationship('TaskAssignee', back_populates='user', cascade='all, delete-orphan')
    comments = db.relationship('Comment', back_populates='user', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', back_populates='user', cascade='all, delete-orphan')
    activity_logs = db.relationship('ActivityLog', back_populates='user', cascade='all, delete-orphan')
    email_logs = db.relationship('EmailLog', back_populates='user', cascade='all, delete-orphan')
    
    def set_password(self, password: str):
        """Hash and set user password securely."""
        self.password_hash = generate_password_hash(password, method='scrypt')
        
    def check_password(self, password: str) -> bool:
        """Verify plain password against hashed password."""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    @property
    def email_preferences(self) -> dict:
        """Return email preferences dict with robust defaults."""
        defaults = {
            'email_notifications_enabled': True,
            'task_assigned': True,
            'task_reassigned': True,
            'task_status_changed': True,
            'task_priority_changed': True,
            'comment_added': True,
            'mention': True,
            'due_date_reminder': True,
            'overdue_alert': True,
            'workspace_activity': True,
            'security_alerts': True # Cannot be disabled
        }
        if not self._email_preferences:
            return defaults
        try:
            saved = json.loads(self._email_preferences)
            defaults.update(saved)
            defaults['security_alerts'] = True # Always True
            return defaults
        except Exception:
            return defaults
            
    @email_preferences.setter
    def email_preferences(self, prefs: dict):
        if not isinstance(prefs, dict):
            prefs = {}
        # Ensure security alerts are always active
        prefs['security_alerts'] = True
        self._email_preferences = json.dumps(prefs)
        
    def to_dict(self, include_private: bool = False) -> dict:
        """Serialize user object to dictionary."""
        data = {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'is_verified': self.is_verified,
            'is_active': self.is_active,
            'is_platform_admin': bool(self.is_platform_admin and self.email == 'lead_architect@taskflow.dev'),
            'theme_preference': self.theme_preference,
            'auth_provider': self.auth_provider,
            'clerk_user_id': self.clerk_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_private:
            data['email_preferences'] = self.email_preferences
            data['provider_id'] = self.provider_id
        return data
