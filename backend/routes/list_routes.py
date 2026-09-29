from flask import Blueprint, request, g
from backend.models import db, TaskList, Project, WorkspaceMember
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required

list_bp = Blueprint('lists', __name__)


@list_bp.route('', methods=['POST'])
@jwt_auth_required
def create_list():
    data = request.get_json(silent=True) or {}
    project_id = data.get('project_id')
    folder_id = data.get('folder_id')
    name = data.get('name', '').strip()
    
    if not project_id or not name:
        return error_response("Project ID and List name are required.", 400)
        
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    task_list = TaskList(
        project_id=project.id,
        folder_id=folder_id,
        name=name,
        position=data.get('position', len(project.lists))
    )
    db.session.add(task_list)
    db.session.commit()
    return success_response(task_list.to_dict(), message="List created.", status_code=201)


@list_bp.route('/<int:list_id>', methods=['PUT'])
@jwt_auth_required
def update_list(list_id):
    task_list = TaskList.query.get(list_id)
    if not task_list:
        return error_response("List not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=task_list.project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    data = request.get_json(silent=True) or {}
    if 'name' in data and data['name'].strip():
        task_list.name = data['name'].strip()
    if 'folder_id' in data:
        task_list.folder_id = data['folder_id']
    if 'position' in data:
        task_list.position = data['position']
        
    db.session.commit()
    return success_response(task_list.to_dict(), message="List updated.")


@list_bp.route('/<int:list_id>', methods=['DELETE'])
@jwt_auth_required
def delete_list(list_id):
    task_list = TaskList.query.get(list_id)
    if not task_list:
        return error_response("List not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=task_list.project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    db.session.delete(task_list)
    db.session.commit()
    return success_response(message="List deleted.")
