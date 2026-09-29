from datetime import datetime, timezone
from backend.models.base import db, BaseModel


class Task(db.Model, BaseModel):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    task_list_id = db.Column(db.Integer, db.ForeignKey('task_lists.id', ondelete='CASCADE'), nullable=True, index=True)
    parent_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    title = db.Column(db.String(255), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    
    # Statuses: 'To Do', 'In Progress', 'Review', 'Blocked', 'Completed'
    status = db.Column(db.String(50), default='To Do', nullable=False, index=True)
    # Priorities: 'Urgent', 'High', 'Normal', 'Low'
    priority = db.Column(db.String(20), default='Normal', nullable=False, index=True)
    
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True, index=True)
    
    estimated_hours = db.Column(db.Float, default=0.0, nullable=True)
    actual_hours = db.Column(db.Float, default=0.0, nullable=True)
    position = db.Column(db.Integer, default=0, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    project = db.relationship('Project', back_populates='tasks')
    task_list = db.relationship('TaskList', back_populates='tasks')
    creator = db.relationship('User', back_populates='created_tasks', foreign_keys=[creator_id])
    
    # Subtasks hierarchy
    parent_task = db.relationship('Task', remote_side=[id], back_populates='subtasks')
    subtasks = db.relationship('Task', back_populates='parent_task', cascade='all, delete-orphan', order_by='Task.position')
    
    # Assignees & Tags
    assignee_associations = db.relationship('TaskAssignee', back_populates='task', cascade='all, delete-orphan')
    tag_associations = db.relationship('TaskTag', back_populates='task', cascade='all, delete-orphan')
    
    # Dependencies
    dependencies = db.relationship('TaskDependency', foreign_keys='TaskDependency.task_id', back_populates='task', cascade='all, delete-orphan')
    dependents = db.relationship('TaskDependency', foreign_keys='TaskDependency.depends_on_task_id', back_populates='depends_on_task', cascade='all, delete-orphan')
    
    # Comments & Activity
    comments = db.relationship('Comment', back_populates='task', cascade='all, delete-orphan', order_by='Comment.created_at.desc()')
    activity_logs = db.relationship('ActivityLog', back_populates='task', cascade='all, delete-orphan')
    
    def mark_completed(self):
        self.status = 'Completed'
        self.completed_at = datetime.now(timezone.utc)
        
    def reopen(self, target_status: str = 'To Do'):
        self.status = target_status
        self.completed_at = None
        
    def to_dict(self, include_subtasks: bool = True, include_details: bool = False) -> dict:
        assignees = [a.user.to_dict() for a in self.assignee_associations if a.user]
        tags = [t.tag.to_dict() for t in self.tag_associations if t.tag]
        
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else None,
            'task_list_id': self.task_list_id,
            'task_list_name': self.task_list.name if self.task_list else None,
            'folder_id': self.task_list.folder_id if self.task_list and self.task_list.folder_id else None,
            'parent_task_id': self.parent_task_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'estimated_hours': self.estimated_hours,
            'actual_hours': self.actual_hours,
            'position': self.position,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'creator_id': self.creator_id,
            'creator_name': self.creator.full_name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'assignees': assignees,
            'tags': tags,
            'subtasks_count': len(self.subtasks),
            'comments_count': len(self.comments),
        }
        
        if include_subtasks:
            data['subtasks'] = [s.to_dict(include_subtasks=False) for s in self.subtasks]
            
        if include_details:
            data['dependencies'] = [d.to_dict() for d in self.dependencies]
            data['dependents'] = [d.to_dict() for d in self.dependents]
            data['comments'] = [c.to_dict() for c in self.comments]
            
        return data
