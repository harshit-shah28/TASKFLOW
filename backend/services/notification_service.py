import logging
from flask import current_app
from backend.models.base import db
from backend.models.notification import Notification
from backend.models.user import User
from backend.services.email_service import EmailService
from backend.utils.email_templates import (
    render_welcome_email,
    render_verification_email,
    render_password_reset_email,
    render_password_changed_email,
    render_task_assigned_email,
    render_task_comment_email,
    render_task_mention_email,
    render_due_date_reminder_email,
    render_overdue_task_email,
    render_workspace_invite_email,
    render_security_alert_email
)
from backend.dsa.event_queue import notification_event_queue

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Unified notification orchestrator handling both in-app database alerts
    and transactional HTML emails, with user preference filtering and event queue buffering.
    """

    @classmethod
    def create_in_app_notification(
        cls,
        user_id: int,
        notif_type: str,
        title: str,
        message: str,
        related_entity_type: str | None = None,
        related_entity_id: int | None = None
    ) -> Notification:
        """Create and persist an in-app notification."""
        notif = Notification(
            user_id=user_id,
            type=notif_type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            is_read=False
        )
        db.session.add(notif)
        db.session.commit()
        
        # Buffer into DSA Event Queue for audit & analytics
        notification_event_queue.enqueue({
            'type': notif_type,
            'user_id': user_id,
            'title': title,
            'created_at': notif.created_at.isoformat() if notif.created_at else None
        })
        return notif

    @classmethod
    def send_welcome(cls, user: User):
        """Send welcome email and create initial notification."""
        cls.create_in_app_notification(
            user_id=user.id,
            notif_type='welcome',
            title="Welcome to TaskFlow! 🎉",
            message="Your account is active. Start by creating a workspace or inviting your team.",
            related_entity_type='user',
            related_entity_id=user.id
        )
        app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        subject, html = render_welcome_email(user.full_name, app_url)
        EmailService.send_html_email(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            user_id=user.id,
            email_type='welcome'
        )

    @classmethod
    def send_verification(cls, user: User, token_str: str):
        """Send email verification link."""
        app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        verify_url = f"{app_url}/verify-email?token={token_str}"
        subject, html = render_verification_email(user.full_name, verify_url)
        EmailService.send_html_email(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            user_id=user.id,
            email_type='verify_email'
        )

    @classmethod
    def send_password_reset(cls, user: User, token_str: str):
        """Send password reset link."""
        app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{app_url}/reset-password?token={token_str}"
        subject, html = render_password_reset_email(user.full_name, reset_url)
        EmailService.send_html_email(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            user_id=user.id,
            email_type='password_reset'
        )

    @classmethod
    def notify_password_changed(cls, user: User):
        """Notify user that their password was updated."""
        cls.create_in_app_notification(
            user_id=user.id,
            notif_type='security',
            title="Password Changed",
            message="Your account password was successfully updated.",
            related_entity_type='user',
            related_entity_id=user.id
        )
        app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        subject, html = render_password_changed_email(user.full_name, app_url)
        EmailService.send_html_email(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            user_id=user.id,
            email_type='password_changed'
        )

    @classmethod
    def notify_task_assigned(cls, task, assignee: User, assigner: User):
        """Trigger in-app and email notification when a task is assigned."""
        if assignee.id == assigner.id:
            return # Don't notify self-assignment
            
        title = f"Assigned to Task: {task.title}"
        msg = f"{assigner.full_name} assigned you to '{task.title}' in {task.project.name if task.project else 'workspace'}."
        
        cls.create_in_app_notification(
            user_id=assignee.id,
            notif_type='task_assigned',
            title=title,
            message=msg,
            related_entity_type='task',
            related_entity_id=task.id
        )
        
        prefs = assignee.email_preferences
        if prefs.get('email_notifications_enabled') and prefs.get('task_assigned'):
            app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
            task_url = f"{app_url}/tasks/{task.id}"
            due_str = task.due_date.strftime('%b %d, %Y') if task.due_date else None
            project_name = task.project.name if task.project else "General"
            
            subject, html = render_task_assigned_email(
                user_name=assignee.full_name,
                task_title=task.title,
                project_name=project_name,
                priority=task.priority,
                due_date=due_str,
                task_url=task_url
            )
            EmailService.send_html_email(
                recipient_email=assignee.email,
                subject=subject,
                html_content=html,
                user_id=assignee.id,
                email_type='task_assigned'
            )

    @classmethod
    def notify_task_comment(cls, task, comment, author: User):
        """Notify assignees and creator when a new comment is posted."""
        app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        task_url = f"{app_url}/tasks/{task.id}"
        
        # Collect distinct recipients (task creator + all assignees except comment author)
        recipient_ids = set()
        if task.creator_id and task.creator_id != author.id:
            recipient_ids.add(task.creator_id)
        for a in task.assignee_associations:
            if a.user_id != author.id:
                recipient_ids.add(a.user_id)
                
        for uid in recipient_ids:
            target_user = User.query.get(uid)
            if not target_user:
                continue
                
            cls.create_in_app_notification(
                user_id=target_user.id,
                notif_type='comment_added',
                title=f"New Comment on '{task.title}'",
                message=f"{author.full_name}: \"{comment.content[:80]}{'...' if len(comment.content) > 80 else ''}\"",
                related_entity_type='task',
                related_entity_id=task.id
            )
            
            prefs = target_user.email_preferences
            if prefs.get('email_notifications_enabled') and prefs.get('comment_added'):
                subject, html = render_task_comment_email(
                    user_name=target_user.full_name,
                    author_name=author.full_name,
                    task_title=task.title,
                    comment_text=comment.content,
                    task_url=task_url
                )
                EmailService.send_html_email(
                    recipient_email=target_user.email,
                    subject=subject,
                    html_content=html,
                    user_id=target_user.id,
                    email_type='task_comment'
                )

    @classmethod
    def notify_workspace_invite(cls, workspace, inviter: User, recipient_email: str, role: str, token: str | None = None, registered_user: User | None = None):
        """Notify an invited team member with secure invitation link."""
        app_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        invite_url = f"{app_url}/invite/{token}" if token else f"{app_url}/dashboard"
        
        if registered_user:
            cls.create_in_app_notification(
                user_id=registered_user.id,
                notif_type='workspace_invite',
                title=f"Invitation to Workspace: {workspace.name}",
                message=f"{inviter.full_name} invited you to join '{workspace.name}' as {role}.",
                related_entity_type='workspace',
                related_entity_id=workspace.id
            )
            
        subject, html = render_workspace_invite_email(
            inviter_name=inviter.full_name,
            recipient_email=recipient_email,
            workspace_name=workspace.name,
            role=role,
            invite_url=invite_url
        )
        EmailService.send_html_email(
            recipient_email=recipient_email,
            subject=subject,
            html_content=html,
            user_id=registered_user.id if registered_user else None,
            email_type='workspace_invite'
        )
