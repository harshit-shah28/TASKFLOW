from backend.models.base import db, BaseModel


class Project(db.Model, BaseModel):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    color = db.Column(db.String(30), default='#6366f1', nullable=False)
    icon = db.Column(db.String(50), default='folder', nullable=False)
    status = db.Column(db.String(30), default='Active', nullable=False) # Active, On Hold, Completed, Archived
    is_archived = db.Column(db.Boolean, default=False, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    workspace = db.relationship('Workspace', back_populates='projects')
    creator = db.relationship('User', foreign_keys=[creator_id])
    folders = db.relationship('Folder', back_populates='project', cascade='all, delete-orphan', order_by='Folder.position')
    lists = db.relationship('TaskList', back_populates='project', cascade='all, delete-orphan', order_by='TaskList.position')
    tasks = db.relationship('Task', back_populates='project', cascade='all, delete-orphan')
    activity_logs = db.relationship('ActivityLog', back_populates='project', cascade='all, delete-orphan')
    
    def calculate_progress(self) -> dict:
        """Calculate project completion rate based on tasks."""
        total = len(self.tasks)
        if total == 0:
            return {'total': 0, 'completed': 0, 'percentage': 0}
        completed = sum(1 for t in self.tasks if t.status == 'Completed')
        percentage = round((completed / total) * 100, 1)
        return {'total': total, 'completed': completed, 'percentage': percentage}
        
    def to_dict(self, include_hierarchy: bool = False) -> dict:
        progress = self.calculate_progress()
        data = {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'icon': self.icon,
            'status': self.status,
            'is_archived': self.is_archived,
            'creator_id': self.creator_id,
            'creator_name': self.creator.full_name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'task_stats': progress
        }
        if include_hierarchy:
            data['folders'] = [f.to_dict(include_lists=True) for f in self.folders]
            # Root lists that don't belong to any folder
            data['root_lists'] = [l.to_dict() for l in self.lists if l.folder_id is None]
        return data
