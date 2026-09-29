from flask import Blueprint, request, g
from backend.models import ActivityLog
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required

activity_bp = Blueprint('activity', __name__)


@activity_bp.route('', methods=['GET'])
@jwt_auth_required
def get_activity():
    workspace_id = request.args.get('workspace_id')
    project_id = request.args.get('project_id')
    task_id = request.args.get('task_id')
    limit = int(request.args.get('limit', 40))

    if not workspace_id:
        return error_response("Workspace ID is required.", 400)

    query = ActivityLog.query.filter_by(workspace_id=int(workspace_id))

    if project_id:
        query = query.filter_by(project_id=int(project_id))
    if task_id:
        query = query.filter_by(task_id=int(task_id))

    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return success_response([log.to_dict() for log in logs])
