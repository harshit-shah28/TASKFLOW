from datetime import datetime
from flask import Blueprint, request, g
from backend.models import (
    db, Task, Project, TaskList, TaskAssignee, Tag, TaskTag,
    TaskDependency, User, WorkspaceMember
)
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required
from backend.services.notification_service import NotificationService
from backend.services.activity_service import ActivityService
from backend.dsa.dependency_graph import TaskDependencyGraph
from backend.dsa.sorting_utils import merge_sort

task_bp = Blueprint('tasks', __name__)

VALID_STATUSES = ['To Do', 'In Progress', 'Review', 'Blocked', 'Completed']
VALID_PRIORITIES = ['Urgent', 'High', 'Normal', 'Low']
PRIORITY_WEIGHTS = {'Urgent': 4, 'High': 3, 'Normal': 2, 'Low': 1}


@task_bp.route('', methods=['GET'])
@jwt_auth_required
def get_tasks():
    """
    Search, filter, and sort tasks across projects, lists, statuses, assignees, and priorities.
    Employs custom MergeSort for sorting.
    """
    workspace_id = request.args.get('workspace_id')
    project_id = request.args.get('project_id')
    task_list_id = request.args.get('task_list_id')
    status = request.args.get('status')
    priority = request.args.get('priority')
    assignee_id = request.args.get('assignee_id')
    tag_id = request.args.get('tag_id')
    search_q = request.args.get('q', '').strip()
    include_subtasks = request.args.get('include_subtasks', 'false').lower() == 'true'
    sort_by = request.args.get('sort_by', 'position') # 'priority', 'due_date', 'created_at', 'title', 'position'
    sort_order = request.args.get('sort_order', 'asc') # 'asc', 'desc'

    query = Task.query.join(Project, Task.project_id == Project.id)

    if workspace_id:
        query = query.filter(Project.workspace_id == int(workspace_id))
    if project_id:
        query = query.filter(Task.project_id == int(project_id))
    if task_list_id:
        query = query.filter(Task.task_list_id == int(task_list_id))
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if not include_subtasks:
        query = query.filter(Task.parent_task_id == None) # Only root tasks

    if assignee_id:
        query = query.join(TaskAssignee, Task.id == TaskAssignee.task_id).filter(TaskAssignee.user_id == int(assignee_id))

    if tag_id:
        query = query.join(TaskTag, Task.id == TaskTag.task_id).filter(TaskTag.tag_id == int(tag_id))

    if search_q:
        query = query.filter(db.or_(
            Task.title.ilike(f"%{search_q}%"),
            Task.description.ilike(f"%{search_q}%")
        ))

    tasks = query.all()
    task_dicts = [t.to_dict(include_subtasks=True) for t in tasks]

    # Apply DSA MergeSort for ordering
    reverse = (sort_order.lower() == 'desc')
    if sort_by == 'priority':
        task_dicts = merge_sort(task_dicts, key_fn=lambda t: PRIORITY_WEIGHTS.get(t.get('priority', 'Normal'), 2), reverse=not reverse)
    elif sort_by == 'due_date':
        task_dicts = merge_sort(task_dicts, key_fn=lambda t: t.get('due_date') or ('9999-12-31' if not reverse else '0000-01-01'), reverse=reverse)
    elif sort_by == 'created_at':
        task_dicts = merge_sort(task_dicts, key_fn=lambda t: t.get('created_at', ''), reverse=reverse)
    elif sort_by == 'title':
        task_dicts = merge_sort(task_dicts, key_fn=lambda t: t.get('title', '').lower(), reverse=reverse)
    else:
        task_dicts = merge_sort(task_dicts, key_fn=lambda t: t.get('position', 0), reverse=reverse)

    return success_response(task_dicts)


@task_bp.route('', methods=['POST'])
@jwt_auth_required
def create_task():
    data = request.get_json(silent=True) or {}
    project_id = data.get('project_id')
    title = data.get('title', '').strip()
    
    if not project_id or not title:
        return error_response("Project ID and Task title are required.", 400)
        
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    task_list_id = data.get('task_list_id')
    if not task_list_id and project.lists:
        task_list_id = project.lists[0].id
        
    status = data.get('status', 'To Do')
    if status not in VALID_STATUSES:
        status = 'To Do'
        
    priority = data.get('priority', 'Normal')
    if priority not in VALID_PRIORITIES:
        priority = 'Normal'
        
    start_date = None
    if data.get('start_date'):
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        except Exception:
            pass

    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except Exception:
            pass

    task = Task(
        project_id=project.id,
        task_list_id=task_list_id,
        parent_task_id=data.get('parent_task_id'),
        title=title,
        description=data.get('description', ''),
        status=status,
        priority=priority,
        creator_id=g.current_user.id,
        start_date=start_date,
        due_date=due_date,
        estimated_hours=float(data.get('estimated_hours', 0.0) or 0.0),
        position=data.get('position', len(project.tasks))
    )
    db.session.add(task)
    db.session.flush()

    # Assignees
    assignee_ids = data.get('assignee_ids', [])
    for uid in assignee_ids:
        assignee_user = User.query.get(uid)
        if assignee_user:
            assignee = TaskAssignee(task_id=task.id, user_id=uid)
            db.session.add(assignee)
            NotificationService.notify_task_assigned(task, assignee_user, g.current_user)

    # Tags
    tag_ids = data.get('tag_ids', [])
    for tid in tag_ids:
        tt = TaskTag(task_id=task.id, tag_id=tid)
        db.session.add(tt)

    db.session.commit()

    ActivityService.log_activity(
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        action='task_created',
        user_id=g.current_user.id,
        details={'title': task.title, 'priority': task.priority, 'status': task.status}
    )

    return success_response(task.to_dict(include_details=True), message="Task created.", status_code=201)


@task_bp.route('/<int:task_id>', methods=['GET'])
@jwt_auth_required
def get_task_details(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=task.project.workspace_id, user_id=g.current_user.id).first()
    if not membership:
        return error_response("Access denied.", 403)
        
    return success_response(task.to_dict(include_subtasks=True, include_details=True))


@task_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_auth_required
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=task.project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    data = request.get_json(silent=True) or {}
    
    if 'title' in data and data['title'].strip():
        task.title = data['title'].strip()
    if 'description' in data:
        task.description = data['description']
    if 'task_list_id' in data:
        task.task_list_id = data['task_list_id']
    if 'estimated_hours' in data:
        task.estimated_hours = float(data['estimated_hours'] or 0.0)
    if 'actual_hours' in data:
        task.actual_hours = float(data['actual_hours'] or 0.0)
    if 'position' in data:
        task.position = int(data['position'])
        
    if 'start_date' in data:
        if data['start_date']:
            try:
                task.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            except Exception:
                pass
        else:
            task.start_date = None

    if 'due_date' in data:
        if data['due_date']:
            try:
                task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except Exception:
                pass
        else:
            task.due_date = None

    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        action='task_updated',
        user_id=g.current_user.id,
        details={'title': task.title}
    )
    return success_response(task.to_dict(include_details=True), message="Task updated.")


@task_bp.route('/<int:task_id>/status', methods=['PATCH'])
@jwt_auth_required
def update_task_status(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    if new_status not in VALID_STATUSES:
        return error_response(f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}", 400)
        
    old_status = task.status
    if new_status == 'Completed':
        task.mark_completed()
    else:
        task.reopen(new_status)
        
    db.session.commit()

    # Notify assignees
    for a in task.assignee_associations:
        if a.user_id != g.current_user.id and a.user:
            NotificationService.create_in_app_notification(
                user_id=a.user_id,
                notif_type='status_changed',
                title=f"Task '{task.title}' updated to {new_status}",
                message=f"{g.current_user.full_name} moved task from {old_status} to {new_status}.",
                related_entity_type='task',
                related_entity_id=task.id
            )

    ActivityService.log_activity(
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        action='status_changed',
        user_id=g.current_user.id,
        details={'old_status': old_status, 'new_status': new_status, 'task_title': task.title}
    )
    return success_response(task.to_dict(include_details=True), message=f"Task moved to {new_status}.")


@task_bp.route('/<int:task_id>/priority', methods=['PATCH'])
@jwt_auth_required
def update_task_priority(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    data = request.get_json(silent=True) or {}
    new_priority = data.get('priority')
    if new_priority not in VALID_PRIORITIES:
        return error_response(f"Invalid priority. Must be one of: {', '.join(VALID_PRIORITIES)}", 400)
        
    old_priority = task.priority
    task.priority = new_priority
    db.session.commit()

    ActivityService.log_activity(
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        action='priority_changed',
        user_id=g.current_user.id,
        details={'old_priority': old_priority, 'new_priority': new_priority, 'task_title': task.title}
    )
    return success_response(task.to_dict(include_details=True), message=f"Priority updated to {new_priority}.")


@task_bp.route('/<int:task_id>/assignees', methods=['POST'])
@jwt_auth_required
def add_task_assignee(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id')
    if not user_id:
        return error_response("User ID is required.", 400)
        
    target_user = User.query.get(user_id)
    if not target_user:
        return error_response("User not found.", 404)
        
    existing = TaskAssignee.query.filter_by(task_id=task.id, user_id=target_user.id).first()
    if existing:
        return success_response(task.to_dict(include_details=True), message="User already assigned.")
        
    assignee = TaskAssignee(task_id=task.id, user_id=target_user.id)
    db.session.add(assignee)
    db.session.commit()

    NotificationService.notify_task_assigned(task, target_user, g.current_user)
    
    ActivityService.log_activity(
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        action='task_assigned',
        user_id=g.current_user.id,
        details={'assignee_name': target_user.full_name, 'task_title': task.title}
    )
    return success_response(task.to_dict(include_details=True), message=f"Assigned to {target_user.full_name}.")


@task_bp.route('/<int:task_id>/assignees/<int:user_id>', methods=['DELETE'])
@jwt_auth_required
def remove_task_assignee(task_id, user_id):
    assignee = TaskAssignee.query.filter_by(task_id=task_id, user_id=user_id).first()
    if not assignee:
        return error_response("Assignee not found on this task.", 404)
        
    task = assignee.task
    db.session.delete(assignee)
    db.session.commit()
    return success_response(task.to_dict(include_details=True), message="Assignee removed.")


@task_bp.route('/<int:task_id>/tags', methods=['POST'])
@jwt_auth_required
def add_task_tag(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    data = request.get_json(silent=True) or {}
    tag_id = data.get('tag_id')
    if not tag_id:
        return error_response("Tag ID is required.", 400)
        
    existing = TaskTag.query.filter_by(task_id=task.id, tag_id=tag_id).first()
    if not existing:
        tt = TaskTag(task_id=task.id, tag_id=tag_id)
        db.session.add(tt)
        db.session.commit()
        
    return success_response(task.to_dict(include_details=True), message="Tag added to task.")


@task_bp.route('/<int:task_id>/tags/<int:tag_id>', methods=['DELETE'])
@jwt_auth_required
def remove_task_tag(task_id, tag_id):
    tt = TaskTag.query.filter_by(task_id=task_id, tag_id=tag_id).first()
    if tt:
        db.session.delete(tt)
        db.session.commit()
    task = Task.query.get(task_id)
    return success_response(task.to_dict(include_details=True) if task else {}, message="Tag removed.")


@task_bp.route('/<int:task_id>/subtasks', methods=['POST'])
@jwt_auth_required
def create_subtask(task_id):
    parent = Task.query.get(task_id)
    if not parent:
        return error_response("Parent task not found.", 404)
        
    data = request.get_json(silent=True) or {}
    title = data.get('title', '').strip()
    if not title:
        return error_response("Subtask title is required.", 400)
        
    subtask = Task(
        project_id=parent.project_id,
        task_list_id=parent.task_list_id,
        parent_task_id=parent.id,
        title=title,
        status='To Do',
        priority=data.get('priority', 'Normal'),
        creator_id=g.current_user.id,
        position=len(parent.subtasks)
    )
    db.session.add(subtask)
    db.session.commit()
    
    return success_response(subtask.to_dict(include_subtasks=False), message="Subtask created.", status_code=201)


@task_bp.route('/<int:task_id>/dependencies', methods=['POST'])
@jwt_auth_required
def add_task_dependency(task_id):
    """
    Adds a dependency between two tasks.
    Uses DSA TaskDependencyGraph cycle detection to ensure NO circular deadlocks!
    """
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    data = request.get_json(silent=True) or {}
    depends_on_task_id = data.get('depends_on_task_id')
    dep_type = data.get('dependency_type', 'waiting_on')
    
    if not depends_on_task_id:
        return error_response("Target task ID (depends_on_task_id) is required.", 400)
    if int(depends_on_task_id) == task.id:
        return error_response("A task cannot depend on itself.", 400)
        
    depends_on_task = Task.query.get(depends_on_task_id)
    if not depends_on_task:
        return error_response("Dependent target task not found.", 404)
        
    # Build live DAG from existing dependencies in this project to test for cycles
    existing_deps = TaskDependency.query.join(Task, TaskDependency.task_id == Task.id).filter(Task.project_id == task.project_id).all()
    graph = TaskDependencyGraph()
    for d in existing_deps:
        graph.add_dependency(task_id=d.task_id, depends_on_id=d.depends_on_task_id)
        
    # DSA Cycle Detection check
    if graph.would_create_cycle(task_id=task.id, depends_on_id=depends_on_task.id):
        return error_response(
            "Circular dependency detected! Adding this dependency would create a deadlock graph cycle.",
            400,
            errors={'dsa_error': 'CYCLE_DETECTED'}
        )
        
    existing = TaskDependency.query.filter_by(task_id=task.id, depends_on_task_id=depends_on_task.id).first()
    if existing:
        return success_response(task.to_dict(include_details=True), message="Dependency already registered.")
        
    dep = TaskDependency(
        task_id=task.id,
        depends_on_task_id=depends_on_task.id,
        dependency_type=dep_type
    )
    db.session.add(dep)
    db.session.commit()
    
    return success_response(task.to_dict(include_details=True), message="Dependency linked successfully.")


@task_bp.route('/<int:task_id>/dependencies/<int:dep_id>', methods=['DELETE'])
@jwt_auth_required
def remove_task_dependency(task_id, dep_id):
    dep = TaskDependency.query.filter_by(task_id=task_id, depends_on_task_id=dep_id).first()
    if dep:
        db.session.delete(dep)
        db.session.commit()
    task = Task.query.get(task_id)
    return success_response(task.to_dict(include_details=True) if task else {}, message="Dependency removed.")


@task_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_auth_required
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return error_response("Task not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=task.project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    workspace_id = task.project.workspace_id
    project_id = task.project_id
    title = task.title
    db.session.delete(task)
    db.session.commit()

    ActivityService.log_activity(
        workspace_id=workspace_id,
        project_id=project_id,
        action='task_deleted',
        user_id=g.current_user.id,
        details={'title': title}
    )
    return success_response(message="Task deleted.")
