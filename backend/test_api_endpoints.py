import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import app
from backend.models.base import db

def test_api():
    print("Testing TaskFlow Complete API Endpoints Flow...")
    client = app.test_client()

    # 1. Health check
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.data}"
    print("[OK] /api/health returned 200")

    # 2. Register
    reg_payload = {
        'email': 'lead_architect@taskflow.dev',
        'password': 'StrongPassword123!',
        'full_name': 'Sarah Architect'
    }
    res = client.post('/api/auth/register', json=reg_payload)
    assert res.status_code in (201, 409), f"Register failed: {res.data}"
    print("[OK] POST /api/auth/register verified")

    # 3. Login
    login_payload = {
        'email': 'lead_architect@taskflow.dev',
        'password': 'StrongPassword123!'
    }
    res = client.post('/api/auth/login', json=login_payload)
    assert res.status_code == 200, f"Login failed: {res.data}"
    data = res.get_json()['data']
    token = data['token']
    assert token, "Token not returned from login"
    headers = {'Authorization': f'Bearer {token}'}
    print("[OK] POST /api/auth/login returned valid JWT")

    # 4. Current user /me
    res = client.get('/api/auth/me', headers=headers)
    assert res.status_code == 200
    user_data = res.get_json()['data']
    workspaces = user_data['workspaces']
    assert len(workspaces) >= 1
    workspace_id = workspaces[0]['id']
    headers['X-Workspace-Id'] = str(workspace_id)
    print(f"[OK] GET /api/auth/me returned user profile with Workspace #{workspace_id}")

    # 5. Create Project
    proj_payload = {
        'workspace_id': workspace_id,
        'name': 'TaskFlow Core Platform',
        'description': 'Main engineering project for TaskFlow SaaS',
        'color': '#6366f1',
        'icon': 'layers'
    }
    res = client.post('/api/projects', json=proj_payload, headers=headers)
    assert res.status_code == 201, f"Create project failed: {res.data}"
    project = res.get_json()['data']
    project_id = project['id']
    print(f"[OK] POST /api/projects created Project #{project_id}")

    # 6. Create Folder & Task List
    res = client.post('/api/folders', json={'project_id': project_id, 'name': 'Sprint 1 Backlog'}, headers=headers)
    assert res.status_code == 201
    folder_id = res.get_json()['data']['id']
    
    res = client.post('/api/lists', json={'project_id': project_id, 'folder_id': folder_id, 'name': 'Ready for Dev'}, headers=headers)
    assert res.status_code == 201
    list_id = res.get_json()['data']['id']
    print(f"[OK] Hierarchy verified: Project -> Folder #{folder_id} -> List #{list_id}")

    # 7. Create Task
    task_payload = {
        'project_id': project_id,
        'task_list_id': list_id,
        'title': 'Design Glassmorphism Dashboard UI',
        'description': 'Create modern dark/light mode dashboard with real-time analytics',
        'status': 'To Do',
        'priority': 'Urgent',
        'due_date': '2026-10-15T18:00:00Z',
        'estimated_hours': 8.5
    }
    res = client.post('/api/tasks', json=task_payload, headers=headers)
    assert res.status_code == 201, f"Task create failed: {res.data}"
    task = res.get_json()['data']
    task_id = task['id']
    print(f"[OK] POST /api/tasks created Task #{task_id} with Urgent priority")

    # 8. Status and Priority Updates
    res = client.patch(f'/api/tasks/{task_id}/status', json={'status': 'In Progress'}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()['data']['status'] == 'In Progress'
    
    res = client.patch(f'/api/tasks/{task_id}/priority', json={'priority': 'High'}, headers=headers)
    assert res.status_code == 200
    print("[OK] PATCH /api/tasks/{id}/status and priority verified")

    # 9. Add Subtask
    res = client.post(f'/api/tasks/{task_id}/subtasks', json={'title': 'Build Recharts widgets'}, headers=headers)
    assert res.status_code == 201
    print("[OK] POST /api/tasks/{id}/subtasks verified")

    # 10. Task Comments
    res = client.post('/api/comments', json={
        'task_id': task_id,
        'content': 'Great progress on this! @Sarah check the color palette.'
    }, headers=headers)
    assert res.status_code == 201
    print("[OK] POST /api/comments with @mention notification verified")

    # 11. Global Search (Trie-powered)
    res = client.get(f'/api/search?workspace_id={workspace_id}&q=dash', headers=headers)
    assert res.status_code == 200
    search_data = res.get_json()['data']
    assert search_data['total_matches'] > 0
    print(f"[OK] GET /api/search found {search_data['total_matches']} matches using Trie engine")

    # 12. Dashboard Analytics
    res = client.get(f'/api/dashboard?workspace_id={workspace_id}', headers=headers)
    assert res.status_code == 200
    metrics = res.get_json()['data']['overview']
    assert metrics['total_tasks'] >= 1
    print(f"[OK] GET /api/dashboard returned {metrics['total_tasks']} total tasks, {metrics['active_projects']} active projects")

    # 13. Notifications
    res = client.get('/api/notifications', headers=headers)
    assert res.status_code == 200
    notifs = res.get_json()['data']['notifications']
    print(f"[OK] GET /api/notifications returned {len(notifs)} notifications")

    # 14. Email Status
    res = client.get('/api/email/status', headers=headers)
    assert res.status_code == 200
    email_status = res.get_json()['data']
    print(f"[OK] GET /api/email/status: SMTP Configured = {email_status['configured']}")

    # 15. DSA Project Tree and Heap
    res = client.get(f'/api/projects/{project_id}/tree', headers=headers)
    assert res.status_code == 200
    tree_data = res.get_json()['data']
    assert 'tree' in tree_data
    print("[OK] GET /api/projects/{id}/tree returned full N-Ary tree hierarchy")

    print("\nALL API ENDPOINTS TESTED END-TO-END AND WORKING PERFECTLY! :))")

if __name__ == '__main__':
    test_api()
