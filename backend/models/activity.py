import json
from backend.models.base import db, BaseModel


class ActivityLog(db.Model, BaseModel):
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False) # e.g. 'task_created', 'status_changed'
    details_json = db.Column('details', db.Text, nullable=True)
    
    workspace = db.relationship('Workspace', back_populates='activity_logs')
    project = db.relationship('Project', back_populates='activity_logs')
    task = db.relationship('Task', back_populates='activity_logs')
    user = db.relationship('User', back_populates='activity_logs')
    
    @property
    def details(self) -> dict:
        if not self.details_json:
            return {}
        try:
            return json.loads(self.details_json)
        except Exception:
            return {'raw': self.details_json}
            
    @details.setter
    def details(self, data: dict):
        if isinstance(data, (dict, list)):
            self.details_json = json.dumps(data)
        else:
            self.details_json = str(data) if data is not None else None
            
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else None,
            'task_id': self.task_id,
            'task_title': self.task.title if self.task else None,
            'user_id': self.user_id,
            'user_name': self.user.full_name if self.user else 'System',
            'user_avatar': self.user.avatar_url if self.user else None,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
