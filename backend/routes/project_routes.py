from flask import Blueprint, request, g
from backend.models import db, Project, Folder, TaskList, Task, WorkspaceMember
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required, workspace_role_required
from backend.services.activity_service import ActivityService
from backend.dsa.n_ary_tree import NAryTree, TreeNode

project_bp = Blueprint('projects', __name__)


@project_bp.route('', methods=['GET'])
@workspace_role_required(minimum_role='Viewer')
def get_projects():
    workspace_id = request.args.get('workspace_id') or request.headers.get('X-Workspace-Id')
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    
    query = Project.query.filter_by(workspace_id=int(workspace_id))
    if not include_archived:
        query = query.filter_by(is_archived=False)
        
    projects = query.all()
    return success_response([p.to_dict() for p in projects])


@project_bp.route('', methods=['POST'])
@workspace_role_required(minimum_role='Member')
def create_project():
    data = request.get_json(silent=True) or {}
    workspace_id = data.get('workspace_id')
    name = data.get('name', '').strip()
    
    if not name:
        return error_response("Project name is required.", 400)
        
    project = Project(
        workspace_id=int(workspace_id),
        name=name,
        description=data.get('description', ''),
        color=data.get('color', '#6366f1'),
        icon=data.get('icon', 'folder'),
        status='Active',
        creator_id=g.current_user.id
    )
    db.session.add(project)
    db.session.flush()
    
    # Create default Task List for the new project
    default_list = TaskList(
        project_id=project.id,
        name='General Tasks',
        position=0
    )
    db.session.add(default_list)
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=project.workspace_id,
        project_id=project.id,
        action='project_created',
        user_id=g.current_user.id,
        details={'name': project.name}
    )
    
    return success_response(project.to_dict(include_hierarchy=True), message="Project created.", status_code=201)


@project_bp.route('/<int:project_id>', methods=['GET'])
@jwt_auth_required
def get_project_details(project_id):
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    # Check workspace membership
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership:
        return error_response("Access denied.", 403)
        
    return success_response(project.to_dict(include_hierarchy=True))


@project_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_auth_required
def update_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role in ('Viewer',):
        return error_response("Access denied.", 403)
        
    data = request.get_json(silent=True) or {}
    if 'name' in data and data['name'].strip():
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']
    if 'color' in data:
        project.color = data['color']
    if 'icon' in data:
        project.icon = data['icon']
    if 'status' in data:
        project.status = data['status']
        
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=project.workspace_id,
        project_id=project.id,
        action='project_updated',
        user_id=g.current_user.id,
        details={'name': project.name}
    )
    return success_response(project.to_dict(), message="Project updated.")


@project_bp.route('/<int:project_id>/archive', methods=['PATCH'])
@jwt_auth_required
def archive_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role in ('Viewer',):
        return error_response("Access denied.", 403)
        
    project.is_archived = not project.is_archived
    db.session.commit()
    
    action = 'project_archived' if project.is_archived else 'project_unarchived'
    ActivityService.log_activity(
        workspace_id=project.workspace_id,
        project_id=project.id,
        action=action,
        user_id=g.current_user.id
    )
    return success_response(project.to_dict(), message=f"Project {'archived' if project.is_archived else 'unarchived'}.")


@project_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_auth_required
def delete_project(project_id):
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role not in ('Admin', 'Owner'):
        return error_response("Only Admins or Owners can delete projects.", 403)
        
    workspace_id = project.workspace_id
    project_name = project.name
    db.session.delete(project)
    db.session.commit()
    
    ActivityService.log_activity(
        workspace_id=workspace_id,
        action='project_deleted',
        user_id=g.current_user.id,
        details={'name': project_name}
    )
    return success_response(message="Project deleted.")


@project_bp.route('/<int:project_id>/tree', methods=['GET'])
@jwt_auth_required
def get_project_tree(project_id):
    """
    Constructs and returns an N-Ary Tree data structure representation
    of the project hierarchy (Project -> Folders -> Lists -> Tasks -> Subtasks).
    Demonstrates live DSA N-Ary tree integration.
    """
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    root_node = TreeNode(
        node_id=f"proj-{project.id}",
        node_type='project',
        title=project.name,
        data={'color': project.color, 'icon': project.icon, 'status': project.status}
    )
    
    # 1. Folders
    folder_nodes = {}
    for f in project.folders:
        f_node = TreeNode(node_id=f"folder-{f.id}", node_type='folder', title=f.name, data={'color': f.color})
        root_node.add_child(f_node)
        folder_nodes[f.id] = f_node
        
    # 2. Lists
    list_nodes = {}
    for lst in project.lists:
        l_node = TreeNode(node_id=f"list-{lst.id}", node_type='list', title=lst.name)
        if lst.folder_id and lst.folder_id in folder_nodes:
            folder_nodes[lst.folder_id].add_child(l_node)
        else:
            root_node.add_child(l_node)
        list_nodes[lst.id] = l_node
        
    # 3. Tasks & Subtasks
    task_nodes = {}
    # Fetch root tasks (parent_task_id is None)
    root_tasks = Task.query.filter_by(project_id=project.id, parent_task_id=None).all()
    for t in root_tasks:
        t_node = TreeNode(
            node_id=f"task-{t.id}",
            node_type='task',
            title=t.title,
            data={'status': t.status, 'priority': t.priority, 'due_date': t.due_date.isoformat() if t.due_date else None}
        )
        if t.task_list_id and t.task_list_id in list_nodes:
            list_nodes[t.task_list_id].add_child(t_node)
        else:
            root_node.add_child(t_node)
        task_nodes[t.id] = t_node
        
        # Subtasks
        for sub in t.subtasks:
            s_node = TreeNode(
                node_id=f"subtask-{sub.id}",
                node_type='subtask',
                title=sub.title,
                data={'status': sub.status, 'priority': sub.priority}
            )
            t_node.add_child(s_node)

    tree = NAryTree(root_node)
    return success_response({
        'tree': root_node.to_dict(),
        'dsa_metrics': {
            'total_folders': tree.count_nodes_by_type('folder'),
            'total_lists': tree.count_nodes_by_type('list'),
            'total_tasks': tree.count_nodes_by_type('task'),
            'total_subtasks': tree.count_nodes_by_type('subtask')
        }
    })
