from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class BaseModel:
    """Base mixin providing common fields and helper serialization methods."""
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    def save(self):
        """Save instance to database session."""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """Delete instance from database session."""
        db.session.delete(self)
        db.session.commit()
        return True
