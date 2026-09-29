from backend.models.base import db, BaseModel


class Comment(db.Model, BaseModel):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    
    task = db.relationship('Task', back_populates='comments')
    user = db.relationship('User', back_populates='comments')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'author_name': self.user.full_name if self.user else 'Unknown',
            'author_avatar': self.user.avatar_url if self.user else None,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
