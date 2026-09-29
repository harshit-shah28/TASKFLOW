from flask import Blueprint, request, g
from backend.models import db, Task, Project, User, Tag, WorkspaceMember
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required
from backend.dsa.trie import Trie

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
@jwt_auth_required
def global_search():
    """
    Global search endpoint powered by Trie prefix matching and relational fallbacks.
    Returns grouped results for Tasks, Projects, Users, and Tags.
    """
    workspace_id = request.args.get('workspace_id')
    q = request.args.get('q', '').strip()
    
    if not workspace_id:
        return error_response("Workspace ID is required.", 400)
    if not q or len(q) < 1:
        return success_response({
            'query': q,
            'results': {'tasks': [], 'projects': [], 'users': [], 'tags': []},
            'total_matches': 0
        })

    ws_id = int(workspace_id)
    
    # Initialize workspace Trie for instant O(k) prefix matching
    trie = Trie()

    # 1. Index and match Projects
    projects = Project.query.filter_by(workspace_id=ws_id, is_archived=False).all()
    for p in projects:
        trie.insert(p.name, {
            'type': 'project',
            'id': p.id,
            'title': p.name,
            'color': p.color,
            'status': p.status,
            'subtitle': f"Project • {p.status}"
        })

    # 2. Index and match Tasks
    tasks = Task.query.join(Project, Task.project_id == Project.id).filter(Project.workspace_id == ws_id).all()
    for t in tasks:
        trie.insert(t.title, {
            'type': 'task',
            'id': t.id,
            'title': t.title,
            'project_id': t.project_id,
            'project_name': t.project.name if t.project else '',
            'status': t.status,
            'priority': t.priority,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'subtitle': f"Task in {t.project.name if t.project else 'Project'} • {t.status}"
        })

    # 3. Index and match Workspace Members
    members = WorkspaceMember.query.filter_by(workspace_id=ws_id).all()
    for m in members:
        if m.user:
            trie.insert(m.user.full_name, {
                'type': 'user',
                'id': m.user.id,
                'title': m.user.full_name,
                'email': m.user.email,
                'avatar_url': m.user.avatar_url,
                'role': m.role,
                'subtitle': f"Member • {m.role}"
            })

    # 4. Index and match Tags
    tags = Tag.query.filter_by(workspace_id=ws_id).all()
    for tag in tags:
        trie.insert(tag.name, {
            'type': 'tag',
            'id': tag.id,
            'title': tag.name,
            'color': tag.color,
            'subtitle': "Tag"
        })

    # Execute Trie prefix search
    trie_matches = trie.search_prefix(q, limit=25)

    # Group matches by type
    grouped = {
        'tasks': [m for m in trie_matches if m['type'] == 'task'],
        'projects': [m for m in trie_matches if m['type'] == 'project'],
        'users': [m for m in trie_matches if m['type'] == 'user'],
        'tags': [m for m in trie_matches if m['type'] == 'tag']
    }
    
    total = sum(len(items) for items in grouped.values())

    return success_response({
        'query': q,
        'results': grouped,
        'total_matches': total,
        'engine': 'DSA_Trie_Prefix_Engine'
    })
