from datetime import datetime, timezone
from backend.models.base import db, BaseModel


class TaskAssignee(db.Model, BaseModel):
    __tablename__ = 'task_assignees'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    __table_args__ = (
        db.UniqueConstraint('task_id', 'user_id', name='uq_task_assignee'),
    )
    
    task = db.relationship('Task', back_populates='assignee_associations')
    user = db.relationship('User', back_populates='task_assignments')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'assigned_at': self.created_at.isoformat() if self.created_at else None
        }
