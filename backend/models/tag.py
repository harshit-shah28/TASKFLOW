from backend.models.base import db, BaseModel


class Tag(db.Model, BaseModel):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(30), default='#3b82f6', nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('workspace_id', 'name', name='uq_workspace_tag_name'),
    )
    
    workspace = db.relationship('Workspace', back_populates='tags')
    task_associations = db.relationship('TaskTag', back_populates='tag', cascade='all, delete-orphan')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'name': self.name,
            'color': self.color
        }


class TaskTag(db.Model, BaseModel):
    __tablename__ = 'task_tags'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    tag_id = db.Column(db.Integer, db.ForeignKey('tags.id', ondelete='CASCADE'), nullable=False, index=True)
    
    __table_args__ = (
        db.UniqueConstraint('task_id', 'tag_id', name='uq_task_tag'),
    )
    
    task = db.relationship('Task', back_populates='tag_associations')
    tag = db.relationship('Tag', back_populates='task_associations')
