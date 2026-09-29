from datetime import datetime, timezone
from backend.models.base import db, BaseModel


class EmailLog(db.Model, BaseModel):
    __tablename__ = 'email_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    recipient_email = db.Column(db.String(255), nullable=False, index=True)
    email_type = db.Column(db.String(100), nullable=False) # 'welcome', 'verify_email', 'reset_password', 'task_assigned', etc.
    subject = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='queued', nullable=False) # 'sent', 'failed', 'queued', 'skipped_unconfigured'
    sent_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    
    user = db.relationship('User', back_populates='email_logs')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'recipient_email': self.recipient_email,
            'email_type': self.email_type,
            'subject': self.subject,
            'status': self.status,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
