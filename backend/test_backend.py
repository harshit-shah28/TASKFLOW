import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import app
from backend.models.base import db
from backend.models import (
    User, Workspace, WorkspaceMember, Project, Folder, TaskList, Task,
    TaskAssignee, Tag, TaskTag, TaskDependency, Comment, Notification,
    ActivityLog, EmailLog
)

def test_initialization():
    print("Testing TaskFlow Backend Initialization...")
    with app.app_context():
        # Verify database tables
        db.create_all()
        print("[OK] Database tables verified.")
        
        # Test creating and querying a dummy user
        test_email = "architect_test@taskflow.dev"
        user = User.query.filter_by(email=test_email).first()
        if not user:
            user = User(
                email=test_email,
                full_name="TaskFlow Architect",
                is_verified=True
            )
            user.set_password("SecurePassword123!")
            db.session.add(user)
            db.session.commit()
            print("[OK] User creation and password hashing verified.")
            
        assert user.check_password("SecurePassword123!"), "Password hash verification failed!"
        print("[OK] Password verification succeeded.")
        
        # Verify workspace creation
        ws = Workspace.query.filter_by(owner_id=user.id).first()
        if not ws:
            ws = Workspace(
                name="Test Workspace",
                slug=f"test-ws-{user.id}",
                owner_id=user.id
            )
            db.session.add(ws)
            db.session.flush()
            member = WorkspaceMember(workspace_id=ws.id, user_id=user.id, role='Owner')
            db.session.add(member)
            db.session.commit()
            print("[OK] Workspace & Owner membership verified.")
            
        # Clean up test user and workspace
        db.session.delete(user)
        if ws:
            db.session.delete(ws)
        db.session.commit()
        print("[OK] Database rollback/cleanup succeeded.")
        
    print("\nALL BACKEND CHECKS PASSED SUCCESSFULLY! :)")

if __name__ == '__main__':
    test_initialization()
