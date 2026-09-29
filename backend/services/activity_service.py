from backend.models.base import db
from backend.models.activity import ActivityLog


class ActivityService:
    @staticmethod
    def log_activity(
        workspace_id: int,
        action: str,
        user_id: int | None = None,
        project_id: int | None = None,
        task_id: int | None = None,
        details: dict | None = None
    ) -> ActivityLog:
        """Create and persist an activity log entry."""
        log = ActivityLog(
            workspace_id=workspace_id,
            action=action,
            user_id=user_id,
            project_id=project_id,
            task_id=task_id,
        )
        if details:
            log.details = details
            
        db.session.add(log)
        db.session.commit()
        return log
