import mimetypes
from datetime import datetime, timezone
from backend.models.base import db, BaseModel


class Conversation(db.Model, BaseModel):
    __tablename__ = 'conversations'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    type = db.Column(db.String(20), default='direct', nullable=False)  # 'direct' or 'channel'
    name = db.Column(db.String(100), nullable=True)  # Channel name (e.g. 'general')
    description = db.Column(db.String(255), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    last_message_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    workspace = db.relationship('Workspace', backref=db.backref('conversations', cascade='all, delete-orphan'))
    creator = db.relationship('User', foreign_keys=[created_by_id])
    members = db.relationship('ConversationMember', back_populates='conversation', cascade='all, delete-orphan')
    messages = db.relationship('Message', back_populates='conversation', cascade='all, delete-orphan', lazy='dynamic')
    attachments = db.relationship('Attachment', back_populates='conversation', cascade='all, delete-orphan')

    def to_dict(self, current_user_id: int | None = None) -> dict:
        members_data = [m.to_dict() for m in self.members]
        
        # Calculate unread count for current user
        unread_count = 0
        current_member = None
        other_user = None
        if current_user_id:
            for m in self.members:
                if m.user_id == current_user_id:
                    current_member = m
                elif self.type == 'direct' and m.user:
                    other_user = m.user.to_dict()
                    
            if current_member:
                query = Message.query.filter(
                    Message.conversation_id == self.id,
                    Message.sender_id != current_user_id
                )
                if current_member.last_read_message_id:
                    query = query.filter(Message.id > current_member.last_read_message_id)
                unread_count = query.count()

        # Latest message preview
        latest_msg = Message.query.filter_by(conversation_id=self.id).order_by(Message.id.desc()).first()
        last_message_data = latest_msg.to_dict() if latest_msg else None

        # Display name for UI
        display_name = self.name
        if self.type == 'direct':
            if other_user:
                display_name = other_user.get('full_name', 'Direct Message')
            else:
                display_name = "Direct Message"

        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'type': self.type,
            'name': self.name,
            'display_name': display_name,
            'description': self.description,
            'created_by_id': self.created_by_id,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'members': members_data,
            'other_user': other_user,
            'unread_count': unread_count,
            'last_message': last_message_data
        }


class ConversationMember(db.Model, BaseModel):
    __tablename__ = 'conversation_members'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    last_read_message_id = db.Column(db.Integer, nullable=True)
    last_read_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_user'),
    )

    conversation = db.relationship('Conversation', back_populates='members')
    user = db.relationship('User')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'last_read_message_id': self.last_read_message_id,
            'last_read_at': self.last_read_at.isoformat() if self.last_read_at else None,
            'user': self.user.to_dict() if self.user else None
        }


class Message(db.Model, BaseModel):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=True)
    message_type = db.Column(db.String(20), default='text', nullable=False)  # 'text', 'file', 'image', 'system'
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)

    conversation = db.relationship('Conversation', back_populates='messages')
    sender = db.relationship('User', backref=db.backref('chat_messages', cascade='all, delete-orphan'))
    attachments = db.relationship('Attachment', back_populates='message', cascade='all, delete-orphan')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender_id': self.sender_id,
            'sender': self.sender.to_dict() if self.sender else None,
            'content': '' if self.is_deleted else self.content,
            'message_type': self.message_type,
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
            'attachments': [a.to_dict() for a in self.attachments] if not self.is_deleted else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Attachment(db.Model, BaseModel):
    __tablename__ = 'attachments'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id', ondelete='CASCADE'), nullable=True, index=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    uploader_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # 'image', 'video', 'document', 'other'
    mime_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # in bytes

    message = db.relationship('Message', back_populates='attachments')
    conversation = db.relationship('Conversation', back_populates='attachments')
    uploader = db.relationship('User')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'message_id': self.message_id,
            'conversation_id': self.conversation_id,
            'uploader_id': self.uploader_id,
            'uploader_name': self.uploader.full_name if self.uploader else None,
            'original_name': self.original_name,
            'file_type': self.file_type,
            'mime_type': self.mime_type,
            'file_size': self.file_size,
            'download_url': f'/api/chat/attachments/{self.id}/download',
            'preview_url': f'/api/chat/attachments/{self.id}/preview',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
