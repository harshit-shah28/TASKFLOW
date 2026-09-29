from flask import Blueprint, request, g
from backend.models import db, Folder, Project, WorkspaceMember
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required

folder_bp = Blueprint('folders', __name__)


@folder_bp.route('', methods=['POST'])
@jwt_auth_required
def create_folder():
    data = request.get_json(silent=True) or {}
    project_id = data.get('project_id')
    name = data.get('name', '').strip()
    
    if not project_id or not name:
        return error_response("Project ID and Folder name are required.", 400)
        
    project = Project.query.get(project_id)
    if not project:
        return error_response("Project not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    folder = Folder(
        project_id=project.id,
        name=name,
        color=data.get('color', '#8b5cf6'),
        position=data.get('position', len(project.folders))
    )
    db.session.add(folder)
    db.session.commit()
    return success_response(folder.to_dict(), message="Folder created.", status_code=201)


@folder_bp.route('/<int:folder_id>', methods=['PUT'])
@jwt_auth_required
def update_folder(folder_id):
    folder = Folder.query.get(folder_id)
    if not folder:
        return error_response("Folder not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=folder.project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role == 'Viewer':
        return error_response("Access denied.", 403)
        
    data = request.get_json(silent=True) or {}
    if 'name' in data and data['name'].strip():
        folder.name = data['name'].strip()
    if 'color' in data:
        folder.color = data['color']
    if 'position' in data:
        folder.position = data['position']
        
    db.session.commit()
    return success_response(folder.to_dict(), message="Folder updated.")


@folder_bp.route('/<int:folder_id>', methods=['DELETE'])
@jwt_auth_required
def delete_folder(folder_id):
    folder = Folder.query.get(folder_id)
    if not folder:
        return error_response("Folder not found.", 404)
        
    membership = WorkspaceMember.query.filter_by(workspace_id=folder.project.workspace_id, user_id=g.current_user.id).first()
    if not membership or membership.role in ('Viewer',):
        return error_response("Access denied.", 403)
        
    db.session.delete(folder)
    db.session.commit()
    return success_response(message="Folder deleted.")
