from backend.models.base import db, BaseModel


class TaskList(db.Model, BaseModel):
    __tablename__ = 'task_lists'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id', ondelete='CASCADE'), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, default=0, nullable=False)
    
    # Relationships
    project = db.relationship('Project', back_populates='lists')
    folder = db.relationship('Folder', back_populates='lists')
    tasks = db.relationship('Task', back_populates='task_list', cascade='all, delete-orphan', order_by='Task.position')
    
    def to_dict(self, include_tasks: bool = False) -> dict:
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'folder_id': self.folder_id,
            'name': self.name,
            'position': self.position,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'tasks_count': len(self.tasks)
        }
        if include_tasks:
            data['tasks'] = [t.to_dict() for t in self.tasks if t.parent_task_id is None]
        return data
