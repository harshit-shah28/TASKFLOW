from backend.models.base import db, BaseModel


class Folder(db.Model, BaseModel):
    __tablename__ = 'folders'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(30), default='#8b5cf6', nullable=False)
    position = db.Column(db.Integer, default=0, nullable=False)
    
    # Relationships
    project = db.relationship('Project', back_populates='folders')
    lists = db.relationship('TaskList', back_populates='folder', cascade='all, delete-orphan', order_by='TaskList.position')
    
    def to_dict(self, include_lists: bool = True) -> dict:
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'color': self.color,
            'position': self.position,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_lists:
            data['lists'] = [l.to_dict() for l in self.lists]
        return data
