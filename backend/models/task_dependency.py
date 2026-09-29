from backend.models.base import db, BaseModel


class TaskDependency(db.Model, BaseModel):
    __tablename__ = 'task_dependencies'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    depends_on_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    dependency_type = db.Column(db.String(30), default='waiting_on', nullable=False) # 'waiting_on', 'blocking'
    
    __table_args__ = (
        db.UniqueConstraint('task_id', 'depends_on_task_id', name='uq_task_dependency'),
    )
    
    task = db.relationship('Task', foreign_keys=[task_id], back_populates='dependencies')
    depends_on_task = db.relationship('Task', foreign_keys=[depends_on_task_id], back_populates='dependents')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'task_id': self.task_id,
            'depends_on_task_id': self.depends_on_task_id,
            'dependency_type': self.dependency_type,
            'depends_on_task_title': self.depends_on_task.title if self.depends_on_task else None,
            'depends_on_task_status': self.depends_on_task.status if self.depends_on_task else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
