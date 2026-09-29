import secrets
from datetime import datetime, timedelta, timezone
from backend.models.base import db, BaseModel


class EmailVerificationToken(db.Model, BaseModel):
    __tablename__ = 'email_verification_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    
    user = db.relationship('User', backref=db.backref('verification_tokens', cascade='all, delete-orphan'))
    
    @classmethod
    def generate_for_user(cls, user_id: int, expires_in_hours: int = 24):
        token_str = secrets.token_urlsafe(64)
        expiration = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        token_obj = cls(user_id=user_id, token=token_str, expires_at=expiration)
        db.session.add(token_obj)
        db.session.commit()
        return token_obj
        
    def is_valid(self) -> bool:
        if self.is_used:
            return False
        # Handle naive or aware datetimes
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return exp > now


class PasswordResetToken(db.Model, BaseModel):
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    
    user = db.relationship('User', backref=db.backref('reset_tokens', cascade='all, delete-orphan'))
    
    @classmethod
    def generate_for_user(cls, user_id: int, expires_in_hours: int = 2):
        token_str = secrets.token_urlsafe(64)
        expiration = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        token_obj = cls(user_id=user_id, token=token_str, expires_at=expiration)
        db.session.add(token_obj)
        db.session.commit()
        return token_obj
        
    def is_valid(self) -> bool:
        if self.is_used:
            return False
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return exp > now
