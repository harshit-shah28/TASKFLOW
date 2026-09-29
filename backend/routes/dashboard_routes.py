from datetime import datetime, timezone
from flask import Blueprint, request, g
from backend.models import (
    db, Task, Project, WorkspaceMember, TaskAssignee, ActivityLog
)
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('', methods=['GET'])
@jwt_auth_required
def get_dashboard_metrics():
    """
    Returns live aggregated productivity statistics, status and priority distributions,
    and project progress calculations for a workspace.
    """
    workspace_id = request.args.get('workspace_id')
    if not workspace_id:
        return error_response("Workspace ID is required.", 400)
        
    ws_id = int(workspace_id)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    # All root tasks in this workspace
    all_tasks = Task.query.join(Project, Task.project_id == Project.id).filter(
        Project.workspace_id == ws_id,
        Task.parent_task_id == None
    ).all()

    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.status == 'Completed')
    pending_tasks = total_tasks - completed_tasks

    # Overdue tasks (due date in past and status != Completed)
    overdue_tasks = 0
    for t in all_tasks:
        if t.due_date and t.status != 'Completed':
            due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if due_dt < now:
                overdue_tasks += 1

    # Tasks due today
    due_today = 0
    for t in all_tasks:
        if t.due_date and t.status != 'Completed':
            due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if today_start <= due_dt <= today_end:
                due_today += 1

    # Tasks assigned to current user
    assigned_to_me_count = Task.query.join(Project, Task.project_id == Project.id).join(
        TaskAssignee, Task.id == TaskAssignee.task_id
    ).filter(
        Project.workspace_id == ws_id,
        TaskAssignee.user_id == g.current_user.id,
        Task.status != 'Completed'
    ).count()

    # Active projects count
    active_projects = Project.query.filter_by(workspace_id=ws_id, is_archived=False).all()
    active_projects_count = len(active_projects)

    # Team members count
    team_members_count = WorkspaceMember.query.filter_by(workspace_id=ws_id).count()

    # Status distribution for charts
    status_counts = {
        'To Do': sum(1 for t in all_tasks if t.status == 'To Do'),
        'In Progress': sum(1 for t in all_tasks if t.status == 'In Progress'),
        'Review': sum(1 for t in all_tasks if t.status == 'Review'),
        'Blocked': sum(1 for t in all_tasks if t.status == 'Blocked'),
        'Completed': completed_tasks
    }
    status_chart_data = [{'name': status, 'value': count} for status, count in status_counts.items()]

    # Priority distribution for charts
    priority_counts = {
        'Urgent': sum(1 for t in all_tasks if t.priority == 'Urgent'),
        'High': sum(1 for t in all_tasks if t.priority == 'High'),
        'Normal': sum(1 for t in all_tasks if t.priority == 'Normal'),
        'Low': sum(1 for t in all_tasks if t.priority == 'Low')
    }
    priority_chart_data = [{'priority': p, 'count': c} for p, c in priority_counts.items()]

    # Project progress metrics
    project_progress = []
    for p in active_projects[:6]:
        progress_info = p.calculate_progress()
        project_progress.append({
            'id': p.id,
            'name': p.name,
            'color': p.color,
            'total': progress_info['total'],
            'completed': progress_info['completed'],
            'percentage': progress_info['percentage']
        })

    # Recent activity logs (latest 10)
    recent_activities = ActivityLog.query.filter_by(workspace_id=ws_id).order_by(
        ActivityLog.created_at.desc()
    ).limit(10).all()

    # Productivity completion rate
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    return success_response({
        'overview': {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'overdue_tasks': overdue_tasks,
            'due_today': due_today,
            'assigned_to_me': assigned_to_me_count,
            'active_projects': active_projects_count,
            'team_members': team_members_count,
            'completion_rate': completion_rate
        },
        'status_distribution': status_chart_data,
        'priority_distribution': priority_chart_data,
        'project_progress': project_progress,
        'recent_activities': [a.to_dict() for a in recent_activities]
    })
