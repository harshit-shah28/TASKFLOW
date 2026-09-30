from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, g
from sqlalchemy import func, desc, asc
from backend.models import (
    db, User, Workspace, WorkspaceMember, Project, Task,
    Message, WorkspaceInvitation, ActivityLog, TaskAssignee
)
from backend.middleware.auth_middleware import platform_admin_required
from backend.utils.response import success_response, error_response

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/overview', methods=['GET'])
@platform_admin_required
def get_admin_overview():
    """
    Return comprehensive, live platform metrics for the internal admin dashboard.
    Platform-level visibility only - strictly real data, zero mocks.
    """
    try:
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        verified_users = User.query.filter_by(is_verified=True).count()
        platform_admins = User.query.filter_by(is_platform_admin=True).count()

        total_workspaces = Workspace.query.count()
        total_projects = Project.query.count()

        total_tasks = Task.query.count()
        completed_tasks = Task.query.filter_by(status='Completed').count()
        open_tasks = Task.query.filter(Task.status != 'Completed').count()

        total_messages = Message.query.count()
        total_invitations = WorkspaceInvitation.query.count()
        pending_invitations = WorkspaceInvitation.query.filter_by(status='pending').count()
        accepted_invitations = WorkspaceInvitation.query.filter_by(status='accepted').count()

        total_activity_logs = ActivityLog.query.count()

        # Auth provider breakdown
        auth_providers = (
            db.session.query(User.auth_provider, func.count(User.id))
            .group_by(User.auth_provider)
            .all()
        )
        provider_stats = {provider or 'local': count for provider, count in auth_providers}

        return success_response({
            'users': {
                'total': total_users,
                'active': active_users,
                'inactive': total_users - active_users,
                'verified': verified_users,
                'unverified': total_users - verified_users,
                'platform_admins': platform_admins,
                'providers': provider_stats,
            },
            'workspaces': {
                'total': total_workspaces,
            },
            'projects': {
                'total': total_projects,
            },
            'tasks': {
                'total': total_tasks,
                'completed': completed_tasks,
                'open': open_tasks,
                'completion_rate': round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0,
            },
            'collaboration': {
                'total_messages': total_messages,
                'total_invitations': total_invitations,
                'pending_invitations': pending_invitations,
                'accepted_invitations': accepted_invitations,
                'total_activity_logs': total_activity_logs,
            },
            'plan_billing_status': {
                'model_configured': False,
                'status_message': 'No billing or subscription tiers configured in TaskFlow database. All workspaces operate under standard unlimited development tier.',
            }
        }, message="Platform administration overview fetched successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch overview metrics: {str(e)}", 500)


@admin_bp.route('/users', methods=['GET'])
@platform_admin_required
def get_admin_users():
    """
    Paginated, searchable, and filterable list of platform users.
    Sanitized output: NEVER exposes password hashes, secrets, or reset tokens.
    """
    try:
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(100, max(1, request.args.get('per_page', 20, type=int)))
        search = request.args.get('search', '').strip().lower()
        is_active = request.args.get('is_active', type=str)
        is_verified = request.args.get('is_verified', type=str)
        is_admin = request.args.get('is_platform_admin', type=str)
        sort_by = request.args.get('sort_by', '-created_at')

        query = User.query

        if search:
            query = query.filter(
                (func.lower(User.email).like(f"%{search}%")) |
                (func.lower(User.full_name).like(f"%{search}%"))
            )

        if is_active is not None and is_active != '':
            query = query.filter(User.is_active == (is_active.lower() in ('true', '1')))

        if is_verified is not None and is_verified != '':
            query = query.filter(User.is_verified == (is_verified.lower() in ('true', '1')))

        if is_admin is not None and is_admin != '':
            query = query.filter(User.is_platform_admin == (is_admin.lower() in ('true', '1')))

        # Sorting
        if sort_by == 'email':
            query = query.order_by(asc(User.email))
        elif sort_by == '-email':
            query = query.order_by(desc(User.email))
        elif sort_by == 'name':
            query = query.order_by(asc(User.full_name))
        elif sort_by == '-name':
            query = query.order_by(desc(User.full_name))
        elif sort_by == 'created_at':
            query = query.order_by(asc(User.created_at))
        else:
            query = query.order_by(desc(User.created_at))

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        user_list = []
        for u in paginated.items:
            # Calculate related count metrics safely
            workspaces_count = len(u.workspace_memberships) if u.workspace_memberships else 0
            tasks_assigned_count = len(u.task_assignments) if u.task_assignments else 0
            user_list.append({
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'avatar_url': u.avatar_url,
                'is_verified': bool(u.is_verified),
                'is_active': bool(u.is_active),
                'is_platform_admin': bool(u.is_platform_admin),
                'auth_provider': u.auth_provider,
                'clerk_user_id': u.clerk_user_id,
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'workspaces_count': workspaces_count,
                'tasks_assigned_count': tasks_assigned_count
            })

        return success_response({
            'users': user_list,
            'pagination': {
                'total': paginated.total,
                'page': paginated.page,
                'per_page': paginated.per_page,
                'pages': paginated.pages
            }
        }, message="Platform users fetched successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch users: {str(e)}", 500)


@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PATCH'])
@platform_admin_required
def toggle_user_active_status(user_id):
    """
    Activate or deactivate a user account.
    Self-deactivation is prohibited for platform administrators.
    """
    if g.current_user.id == user_id:
        return error_response("Self-deactivation of your platform administrator account is prohibited.", 400)

    user = User.query.get(user_id)
    if not user:
        return error_response("User not found.", 404)

    user.is_active = not user.is_active
    db.session.commit()

    # Log action
    try:
        from backend.services.activity_service import ActivityService
        # Find any workspace associated with the target user or default 1
        ws_id = user.workspace_memberships[0].workspace_id if user.workspace_memberships else 1
        ActivityService.log_activity(
            workspace_id=ws_id,
            action='admin_user_status_changed',
            user_id=g.current_user.id,
            details={
                'target_user_id': user.id,
                'target_email': user.email,
                'new_status': 'active' if user.is_active else 'deactivated'
            }
        )
    except Exception:
        pass

    return success_response({
        'id': user.id,
        'email': user.email,
        'is_active': user.is_active
    }, message=f"User {'activated' if user.is_active else 'deactivated'} successfully.")


@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['PATCH'])
@platform_admin_required
def toggle_user_platform_admin(user_id):
    """
    Grant or revoke platform administrator privileges.
    Self-demotion is prohibited to prevent lockout.
    """
    if g.current_user.id == user_id:
        return error_response("You cannot revoke your own platform administrator privileges.", 400)

    user = User.query.get(user_id)
    if not user:
        return error_response("User not found.", 404)

    if user.email in ('demo.pm@taskflow.dev', 'demo.engineering@taskflow.dev', 'demo.marketing@taskflow.dev', 'demo.design@taskflow.dev', 'demo.member@taskflow.dev'):
        return error_response("Standard demo accounts cannot be granted platform administrator privileges.", 400)

    user.is_platform_admin = not user.is_platform_admin
    db.session.commit()

    return success_response({
        'id': user.id,
        'email': user.email,
        'is_platform_admin': user.is_platform_admin
    }, message=f"Platform administrator privileges {'granted to' if user.is_platform_admin else 'revoked from'} {user.email}.")


@admin_bp.route('/workspaces', methods=['GET'])
@platform_admin_required
def get_admin_workspaces():
    """
    Paginated, searchable list of all workspaces across the platform.
    Includes owner info, member counts, project counts, and task counts.
    """
    try:
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(100, max(1, request.args.get('per_page', 20, type=int)))
        search = request.args.get('search', '').strip().lower()

        query = Workspace.query

        if search:
            query = query.filter(
                (func.lower(Workspace.name).like(f"%{search}%")) |
                (func.lower(Workspace.slug).like(f"%{search}%"))
            )

        query = query.order_by(desc(Workspace.created_at))
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        ws_list = []
        for ws in paginated.items:
            owner = ws.owner
            # Calculate project and task counts
            project_ids = [p.id for p in ws.projects] if ws.projects else []
            task_count = Task.query.filter(Task.project_id.in_(project_ids)).count() if project_ids else 0

            ws_list.append({
                'id': ws.id,
                'name': ws.name,
                'slug': ws.slug,
                'description': ws.description,
                'owner': {
                    'id': owner.id if owner else None,
                    'email': owner.email if owner else 'Unknown',
                    'full_name': owner.full_name if owner else 'Unknown'
                },
                'members_count': len(ws.members) if ws.members else 0,
                'projects_count': len(ws.projects) if ws.projects else 0,
                'tasks_count': task_count,
                'created_at': ws.created_at.isoformat() if ws.created_at else None
            })

        return success_response({
            'workspaces': ws_list,
            'pagination': {
                'total': paginated.total,
                'page': paginated.page,
                'per_page': paginated.per_page,
                'pages': paginated.pages
            }
        }, message="Platform workspaces fetched successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch workspaces: {str(e)}", 500)


@admin_bp.route('/analytics', methods=['GET'])
@platform_admin_required
def get_admin_analytics():
    """
    Real time-series and categorical aggregations for platform analytics.
    Zero mocks: all statistics reflect actual database records.
    """
    try:
        # 1. Task status distribution
        status_rows = (
            db.session.query(Task.status, func.count(Task.id))
            .group_by(Task.status)
            .all()
        )
        status_distribution = [{'status': s or 'Unspecified', 'count': c} for s, c in status_rows]

        # 2. Task priority distribution
        priority_rows = (
            db.session.query(Task.priority, func.count(Task.id))
            .group_by(Task.priority)
            .all()
        )
        priority_distribution = [{'priority': p or 'Normal', 'count': c} for p, c in priority_rows]

        # 3. User Auth provider distribution
        provider_rows = (
            db.session.query(User.auth_provider, func.count(User.id))
            .group_by(User.auth_provider)
            .all()
        )
        provider_distribution = [{'provider': p or 'local', 'count': c} for p, c in provider_rows]

        # 4. Top workspaces by task volume
        top_workspaces = []
        all_workspaces = Workspace.query.all()
        for ws in all_workspaces:
            p_ids = [p.id for p in ws.projects] if ws.projects else []
            t_count = Task.query.filter(Task.project_id.in_(p_ids)).count() if p_ids else 0
            top_workspaces.append({
                'id': ws.id,
                'name': ws.name,
                'tasks_count': t_count,
                'members_count': len(ws.members) if ws.members else 0
            })
        top_workspaces.sort(key=lambda x: x['tasks_count'], reverse=True)
        top_workspaces = top_workspaces[:5]

        # 5. Registration timeline (monthly / recent daily buckets)
        users = User.query.order_by(asc(User.created_at)).all()
        timeline_map = {}
        for u in users:
            if u.created_at:
                date_key = u.created_at.strftime('%Y-%m-%d')
                timeline_map[date_key] = timeline_map.get(date_key, 0) + 1

        registration_timeline = [{'date': k, 'count': v} for k, v in sorted(timeline_map.items())][-14:]

        return success_response({
            'status_distribution': status_distribution,
            'priority_distribution': priority_distribution,
            'provider_distribution': provider_distribution,
            'top_workspaces': top_workspaces,
            'registration_timeline': registration_timeline,
        }, message="Admin analytics fetched successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch analytics: {str(e)}", 500)


@admin_bp.route('/activity', methods=['GET'])
@platform_admin_required
def get_admin_activity():
    """
    Paginated audit logs across all platform workspaces.
    Shows who performed what action, when, and on which entity.
    """
    try:
        page = max(1, request.args.get('page', 1, type=int))
        per_page = min(100, max(1, request.args.get('per_page', 25, type=int)))
        action = request.args.get('action', '').strip()
        workspace_id = request.args.get('workspace_id', type=int)

        query = ActivityLog.query

        if action:
            query = query.filter(ActivityLog.action.like(f"%{action}%"))

        if workspace_id:
            query = query.filter_by(workspace_id=workspace_id)

        query = query.order_by(desc(ActivityLog.created_at))
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        activities = []
        for a in paginated.items:
            activities.append({
                'id': a.id,
                'action': a.action,
                'workspace_id': a.workspace_id,
                'workspace_name': a.workspace.name if a.workspace else None,
                'project_name': a.project.name if a.project else None,
                'task_title': a.task.title if a.task else None,
                'user_id': a.user_id,
                'user_name': a.user.full_name if a.user else 'System',
                'user_email': a.user.email if a.user else None,
                'user_avatar': a.user.avatar_url if a.user else None,
                'details': a.details,
                'created_at': a.created_at.isoformat() if a.created_at else None
            })

        return success_response({
            'activities': activities,
            'pagination': {
                'total': paginated.total,
                'page': paginated.page,
                'per_page': paginated.per_page,
                'pages': paginated.pages
            }
        }, message="Platform audit logs fetched successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch activity logs: {str(e)}", 500)
