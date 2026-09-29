from backend.models.base import db, BaseModel


class Workspace(db.Model, BaseModel):
    __tablename__ = 'workspaces'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id])
    members = db.relationship('WorkspaceMember', back_populates='workspace', cascade='all, delete-orphan')
    projects = db.relationship('Project', back_populates='workspace', cascade='all, delete-orphan')
    tags = db.relationship('Tag', back_populates='workspace', cascade='all, delete-orphan')
    activity_logs = db.relationship('ActivityLog', back_populates='workspace', cascade='all, delete-orphan')
    
    def get_member_role(self, user_id: int) -> str | None:
        """Return the role string of a user within this workspace, or None."""
        member = WorkspaceMember.query.filter_by(workspace_id=self.id, user_id=user_id).first()
        return member.role if member else None
        
    def to_dict(self, include_members_count: bool = True) -> dict:
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'avatar_url': self.avatar_url,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_members_count:
            data['members_count'] = len(self.members)
            data['projects_count'] = len(self.projects)
        return data


class WorkspaceMember(db.Model, BaseModel):
    __tablename__ = 'workspace_members'
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = db.Column(db.String(20), default='Member', nullable=False) # Owner, Admin, Member, Viewer
    
    __table_args__ = (
        db.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_user'),
    )
    
    workspace = db.relationship('Workspace', back_populates='members')
    user = db.relationship('User', back_populates='workspace_memberships')
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.created_at.isoformat() if self.created_at else None,
            'user': self.user.to_dict() if self.user else None
        }
