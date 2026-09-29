import re
from flask import Blueprint, request, g
from backend.models import db, Comment, Task, User, WorkspaceMember
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required
from backend.services.notification_service import NotificationService
from backend.services.activity_service import ActivityService
from backend.utils.email_templates import render_task_mention_email
from backend.services.email_service import EmailService

comment_bp = Blueprint('comments', __name__)


@comment_bp.route('', methods=['GET'])
@jwt_auth_required
def get_comments():
    task_id = request.args.get('task_id')
    if not task_id:
        return error_response("Task ID is required.", 400)
        
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    comments = Comment.query.filter_by(task_id=task.id).order_by(Comment.created_at.asc()).all()
    return success_response([c.to_dict() for c in comments])


@comment_bp.route('', methods=['POST'])
@jwt_auth_required
def add_comment():
    data = request.get_json(silent=True) or {}
    task_id = data.get('task_id')
    content = data.get('content', '').strip()
    
    if not task_id or not content:
        return error_response("Task ID and comment content are required.", 400)
        
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=task.project.workspace_id, user_id=g.current_user.id).first()
    if not membership:
        return error_response("Access denied.", 403)
        
    comment = Comment(
        task_id=task.id,
        user_id=g.current_user.id,
        content=content
    )
    db.session.add(comment)
    db.session.commit()

    # 1. Notify assignees and creator
    NotificationService.notify_task_comment(task, comment, g.current_user)

    # 2. Parse @mentions (e.g., @john or @email)
    mentions = re.findall(r'@([a-zA-Z0-9_.+-]+)', content)
    for target in mentions:
        mentioned_user = User.query.filter(
            db.or_(
                User.email.ilike(f"{target}%"),
                User.full_name.ilike(f"{target}%")
            )
        ).first()
        if mentioned_user and mentioned_user.id != g.current_user.id:
            NotificationService.create_in_app_notification(
                user_id=mentioned_user.id,
                notif_type='mention',
                title=f"{g.current_user.full_name} mentioned you in '{task.title}'",
                message=f"\"{content[:100]}\"",
                related_entity_type='task',
                related_entity_id=task.id
            )
            # Dispatch mention email if preferences permit
            prefs = mentioned_user.email_preferences
            if prefs.get('email_notifications_enabled') and prefs.get('mention'):
                app_url = request.host_url.rstrip('/')
                task_url = f"{app_url}/tasks/{task.id}"
                subj, html = render_task_mention_email(
                    user_name=mentioned_user.full_name,
                    author_name=g.current_user.full_name,
                    task_title=task.title,
                    comment_text=content,
                    task_url=task_url
                )
                EmailService.send_html_email(
                    recipient_email=mentioned_user.email,
                    subject=subj,
                    html_content=html,
                    user_id=mentioned_user.id,
                    email_type='mention'
                )

    ActivityService.log_activity(
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        action='comment_added',
        user_id=g.current_user.id,
        details={'task_title': task.title}
    )

    return success_response(comment.to_dict(), message="Comment posted.", status_code=201)


@comment_bp.route('/<int:comment_id>', methods=['PUT'])
@jwt_auth_required
def edit_comment(comment_id):
    comment = Comment.query.get(comment_id)
    if not comment:
        return error_response("Comment not found.", 404)
        
    if comment.user_id != g.current_user.id:
        return error_response("You can only edit your own comments.", 403)
        
    data = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()
    if not content:
        return error_response("Comment content cannot be empty.", 400)
        
    comment.content = content
    db.session.commit()
    return success_response(comment.to_dict(), message="Comment updated.")


@comment_bp.route('/<int:comment_id>', methods=['DELETE'])
@jwt_auth_required
def delete_comment(comment_id):
    comment = Comment.query.get(comment_id)
    if not comment:
        return error_response("Comment not found.", 404)
        
    # User owns comment, or is workspace Owner/Admin
    is_author = (comment.user_id == g.current_user.id)
    membership = WorkspaceMember.query.filter_by(workspace_id=comment.task.project.workspace_id, user_id=g.current_user.id).first()
    is_admin = membership and membership.role in ('Owner', 'Admin')
    
    if not is_author and not is_admin:
        return error_response("Access denied.", 403)
        
    db.session.delete(comment)
    db.session.commit()
    return success_response(message="Comment deleted.")
