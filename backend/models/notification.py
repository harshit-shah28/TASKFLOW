from backend.models.base import db, BaseModel


class Notification(db.Model, BaseModel):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False) # 'task_assigned', 'comment_added', 'mention', 'due_date', etc.
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    related_entity_type = db.Column(db.String(50), nullable=True) # 'task', 'project', 'workspace'
    related_entity_id = db.Column(db.Integer, nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    
    user = db.relationship('User', back_populates='notifications')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'related_entity_type': self.related_entity_type,
            'related_entity_id': self.related_entity_id,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
