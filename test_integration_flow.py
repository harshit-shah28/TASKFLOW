import time
import requests
import json

BASE_URL = "http://localhost:5173/api"
FRONTEND_URL = "http://localhost:5173"

def run_integration_tests():
    print("====================================================")
    print("TASKFLOW LOCAL INTEGRATION VERIFICATION")
    print("====================================================")

    session = requests.Session()
    results = {}

    # --- 1. FRONTEND SERVER & PROXY CHECK ---
    print("\n--- 1. Testing Frontend Server & Vite Proxy ---")
    try:
        fe_res = session.get(FRONTEND_URL, timeout=5)
        assert fe_res.status_code == 200
        assert '<div id="root">' in fe_res.text
        print("[OK] Frontend HTML served at http://localhost:5173 (HTTP 200)")
        results['frontend_server'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Frontend server: {e}")
        results['frontend_server'] = f'FAIL: {e}'

    try:
        proxy_res = session.get(f"{BASE_URL}/health", timeout=5)
        assert proxy_res.status_code == 200
        data = proxy_res.json()
        assert data.get('success') is True
        print("[OK] Vite Proxy /api -> Flask Backend operational (HTTP 200)")
        results['vite_proxy'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Vite proxy /api: {e}")
        results['vite_proxy'] = f'FAIL: {e}'

    # --- 2. AUTHENTICATION FLOWS ---
    print("\n--- 2. Testing Authentication Flows ---")
    timestamp = int(time.time())
    test_email = f"qa_engineer_{timestamp}@taskflow.dev"
    test_password = "SecurePassword123!"
    test_name = "QA Verification Engineer"

    # Register
    token = None
    user_id = None
    try:
        reg_res = session.post(f"{BASE_URL}/auth/register", json={
            'email': test_email,
            'password': test_password,
            'full_name': test_name
        })
        assert reg_res.status_code == 201, f"Status: {reg_res.status_code}, Body: {reg_res.text}"
        reg_data = reg_res.json()['data']
        token = reg_data['token']
        user_id = reg_data['user']['id']
        print(f"[OK] Register flow verified: User #{user_id} ({test_email})")
        results['auth_register'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Register flow: {e}")
        results['auth_register'] = f'FAIL: {e}'

    # Login
    try:
        login_res = session.post(f"{BASE_URL}/auth/login", json={
            'email': test_email,
            'password': test_password
        })
        assert login_res.status_code == 200
        token = login_res.json()['data']['token']
        print("[OK] Login flow verified: JWT token acquired")
        results['auth_login'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Login flow: {e}")
        results['auth_login'] = f'FAIL: {e}'

    headers = {'Authorization': f'Bearer {token}'}

    # Protected Routes & Current User (/api/auth/me)
    try:
        # Without token -> 401
        unauth_res = requests.get(f"{BASE_URL}/auth/me")
        assert unauth_res.status_code == 401
        
        # With token -> 200
        me_res = session.get(f"{BASE_URL}/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()['data']
        assert me_data['user']['email'] == test_email
        print("[OK] Current User (/api/auth/me) & Protected route enforcement verified")
        results['auth_current_user'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Current user flow: {e}")
        results['auth_current_user'] = f'FAIL: {e}'

    # Forgot Password Flow
    try:
        forgot_res = session.post(f"{BASE_URL}/auth/forgot-password", json={'email': test_email})
        assert forgot_res.status_code == 200
        print("[OK] Forgot Password request endpoint verified")
        results['auth_forgot_password'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Forgot password flow: {e}")
        results['auth_forgot_password'] = f'FAIL: {e}'

    # Logout Confirmation
    try:
        logout_res = session.post(f"{BASE_URL}/auth/logout", headers=headers)
        assert logout_res.status_code == 200
        print("[OK] Logout endpoint verified")
        results['auth_logout'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Logout flow: {e}")
        results['auth_logout'] = f'FAIL: {e}'

    # --- 3. WORKSPACE MANAGEMENT ---
    print("\n--- 3. Testing Workspace Management ---")
    workspace_id = None
    try:
        ws_res = session.post(f"{BASE_URL}/workspaces", json={
            'name': f"Enterprise Workspace {timestamp}",
            'description': "Testing full workspace lifecycle"
        }, headers=headers)
        assert ws_res.status_code == 201
        ws_data = ws_res.json()['data']
        workspace_id = ws_data['id']
        headers['X-Workspace-Id'] = str(workspace_id)
        print(f"[OK] Workspace created: ID #{workspace_id} ({ws_data['name']})")

        # View workspace
        view_ws = session.get(f"{BASE_URL}/workspaces/{workspace_id}", headers=headers)
        assert view_ws.status_code == 200
        print(f"[OK] Workspace details retrieved (Role: {view_ws.json()['data']['my_role']})")

        # Members list
        members_res = session.get(f"{BASE_URL}/workspaces/{workspace_id}/members", headers=headers)
        assert members_res.status_code == 200
        assert len(members_res.json()['data']) >= 1
        print(f"[OK] Workspace members list verified (Count: {len(members_res.json()['data'])})")
        results['workspace_crud'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Workspace management: {e}")
        results['workspace_crud'] = f'FAIL: {e}'

    # --- 4. PROJECT & HIERARCHY ---
    print("\n--- 4. Testing Project, Folders & Lists Hierarchy ---")
    project_id = None
    folder_id = None
    list_id = None
    try:
        # Create Project
        proj_res = session.post(f"{BASE_URL}/projects", json={
            'workspace_id': workspace_id,
            'name': f"Cloud Infrastructure {timestamp}",
            'description': "Core infrastructure development sprint",
            'color': '#8b5cf6',
            'icon': 'server'
        }, headers=headers)
        assert proj_res.status_code == 201
        project_id = proj_res.json()['data']['id']
        print(f"[OK] Project created: ID #{project_id}")

        # Create Folder
        folder_res = session.post(f"{BASE_URL}/folders", json={
            'project_id': project_id,
            'name': "Sprint 1 Infrastructure",
            'color': '#3b82f6'
        }, headers=headers)
        assert folder_res.status_code == 201
        folder_id = folder_res.json()['data']['id']
        print(f"[OK] Folder created: ID #{folder_id}")

        # Create List
        list_res = session.post(f"{BASE_URL}/lists", json={
            'project_id': project_id,
            'folder_id': folder_id,
            'name': "Kubernetes Migration"
        }, headers=headers)
        assert list_res.status_code == 201
        list_id = list_res.json()['data']['id']
        print(f"[OK] Task List created: ID #{list_id} (Parent Folder #{folder_id})")
        results['project_hierarchy'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Project hierarchy: {e}")
        results['project_hierarchy'] = f'FAIL: {e}'

    # --- 5. TASK OPERATIONS ---
    print("\n--- 5. Testing Task Operations ---")
    task_id = None
    task_id_2 = None
    try:
        # Create Task
        t_res = session.post(f"{BASE_URL}/tasks", json={
            'project_id': project_id,
            'task_list_id': list_id,
            'title': "Configure Terraform Helm Providers",
            'description': "Deploy ingress-nginx, cert-manager, and metrics-server on EKS",
            'priority': "High",
            'status': "To Do",
            'due_date': "2026-10-20T23:59:59Z",
            'estimated_hours': 6.0,
            'assignee_ids': [user_id]
        }, headers=headers)
        assert t_res.status_code == 201
        task_id = t_res.json()['data']['id']
        print(f"[OK] Task created: ID #{task_id} with assignee User #{user_id}")

        # Second task for dependency test
        t2_res = session.post(f"{BASE_URL}/tasks", json={
            'project_id': project_id,
            'task_list_id': list_id,
            'title': "Deploy Ingress Controller",
            'priority': "Urgent",
            'status': "To Do"
        }, headers=headers)
        task_id_2 = t2_res.json()['data']['id']

        # Change Status
        st_res = session.patch(f"{BASE_URL}/tasks/{task_id}/status", json={'status': 'In Progress'}, headers=headers)
        assert st_res.status_code == 200
        assert st_res.json()['data']['status'] == 'In Progress'
        print("[OK] Task status updated to 'In Progress'")

        # Change Priority
        pr_res = session.patch(f"{BASE_URL}/tasks/{task_id}/priority", json={'priority': 'Urgent'}, headers=headers)
        assert pr_res.status_code == 200
        assert pr_res.json()['data']['priority'] == 'Urgent'
        print("[OK] Task priority updated to 'Urgent'")

        # Add Subtask
        sub_res = session.post(f"{BASE_URL}/tasks/{task_id}/subtasks", json={'title': 'Verify TLS Certificates'}, headers=headers)
        assert sub_res.status_code == 201
        print("[OK] Subtask attached and persisted")

        # Add Comment with @mention
        comm_res = session.post(f"{BASE_URL}/comments", json={
            'task_id': task_id,
            'content': "Testing comment stream with @QA verification engineer tag!"
        }, headers=headers)
        assert comm_res.status_code == 201
        print("[OK] Comment posted with @mention handling")

        # Add Dependency (task_id_2 depends on task_id)
        dep_res = session.post(f"{BASE_URL}/tasks/{task_id_2}/dependencies", json={
            'depends_on_task_id': task_id,
            'dependency_type': 'waiting_on'
        }, headers=headers)
        assert dep_res.status_code == 200
        print("[OK] Task dependency linked (Task #2 waiting on Task #1)")

        # Verify DAG cycle detection (Try making task_id depend on task_id_2 -> should be rejected 400!)
        cycle_res = session.post(f"{BASE_URL}/tasks/{task_id}/dependencies", json={
            'depends_on_task_id': task_id_2
        }, headers=headers)
        assert cycle_res.status_code == 400
        print("[OK] DAG cycle detection rejected circular dependency as expected (HTTP 400)")

        results['task_operations'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Task operations: {e}")
        results['task_operations'] = f'FAIL: {e}'

    # --- 6. VIEWS & QUERY INTEGRATION ---
    print("\n--- 6. Testing Views & Query Integration ---")
    try:
        # List View query
        list_view = session.get(f"{BASE_URL}/tasks?project_id={project_id}&sort_by=priority", headers=headers)
        assert list_view.status_code == 200
        assert len(list_view.json()['data']) >= 2
        print(f"[OK] List View query with MergeSort priority: {len(list_view.json()['data'])} tasks")

        # Kanban View query
        kanban_view = session.get(f"{BASE_URL}/tasks?project_id={project_id}&status=In Progress", headers=headers)
        assert kanban_view.status_code == 200
        assert len(kanban_view.json()['data']) >= 1
        print(f"[OK] Kanban View status query: {len(kanban_view.json()['data'])} tasks in 'In Progress'")

        # Calendar View query
        cal_view = session.get(f"{BASE_URL}/tasks?workspace_id={workspace_id}", headers=headers)
        assert cal_view.status_code == 200
        print(f"[OK] Calendar View query: {len(cal_view.json()['data'])} tasks returned")

        # N-Ary Hierarchy Tree View
        tree_res = session.get(f"{BASE_URL}/projects/{project_id}/tree", headers=headers)
        assert tree_res.status_code == 200
        t_data = tree_res.json()['data']
        assert t_data['dsa_metrics']['total_tasks'] >= 2
        print(f"[OK] N-Ary Tree View: {t_data['dsa_metrics']['total_tasks']} tasks in project tree")

        # Dependency Graph (DAG) View
        dag_res = session.get(f"{BASE_URL}/dsa/dependency-analysis?project_id={project_id}", headers=headers)
        assert dag_res.status_code == 200
        d_data = dag_res.json()['data']
        assert d_data['is_valid_dag'] is True
        assert len(d_data['recommended_execution_sequence']) >= 2
        print(f"[OK] DAG Topological Sort sequence: {[s['title'] for s in d_data['recommended_execution_sequence']]}")

        results['views_queries'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Views & query integration: {e}")
        results['views_queries'] = f'FAIL: {e}'

    # --- 7. OTHER SYSTEM SERVICES ---
    print("\n--- 7. Testing Other System Features ---")
    try:
        # Global Search with Trie
        search_res = session.get(f"{BASE_URL}/search?workspace_id={workspace_id}&q=Terra", headers=headers)
        assert search_res.status_code == 200
        s_data = search_res.json()['data']
        assert s_data['total_matches'] >= 1
        print(f"[OK] Trie Global Search found {s_data['total_matches']} matches for 'Terra'")

        # Notifications
        notif_res = session.get(f"{BASE_URL}/notifications", headers=headers)
        assert notif_res.status_code == 200
        print(f"[OK] Notifications retrieved (Count: {len(notif_res.json()['data']['notifications'])})")

        # Dashboard Metrics
        dash_res = session.get(f"{BASE_URL}/dashboard?workspace_id={workspace_id}", headers=headers)
        assert dash_res.status_code == 200
        metrics = dash_res.json()['data']['overview']
        print(f"[OK] Dashboard Metrics: {metrics['total_tasks']} tasks, {metrics['active_projects']} active projects")

        # My Tasks
        my_tasks_res = session.get(f"{BASE_URL}/tasks?workspace_id={workspace_id}&assignee_id={user_id}", headers=headers)
        assert my_tasks_res.status_code == 200
        assert len(my_tasks_res.json()['data']) >= 1
        print(f"[OK] My Tasks endpoint: {len(my_tasks_res.json()['data'])} assigned tasks")

        # Settings: Profile Update
        prof_res = session.put(f"{BASE_URL}/users/profile", json={
            'full_name': "Verified Senior Architect",
            'bio': "Lead System Architect testing TaskFlow"
        }, headers=headers)
        assert prof_res.status_code == 200
        assert prof_res.json()['data']['full_name'] == "Verified Senior Architect"
        print("[OK] Profile settings update verified")

        # Settings: Email Preferences
        pref_res = session.put(f"{BASE_URL}/users/preferences", json={
            'email_notifications_enabled': True,
            'task_assigned': True,
            'due_date_reminder': False
        }, headers=headers)
        assert pref_res.status_code == 200
        assert pref_res.json()['data']['due_date_reminder'] is False
        print("[OK] Email Preferences update verified")

        results['other_services'] = 'PASS'
    except Exception as e:
        print(f"[FAIL] Other system features: {e}")
        results['other_services'] = f'FAIL: {e}'

    # --- 8. EMAIL & OAUTH STATUS VERIFICATION ---
    print("\n--- 8. Testing Email & OAuth Status ---")
    try:
        email_status_res = session.get(f"{BASE_URL}/email/status", headers=headers)
        assert email_status_res.status_code == 200
        smtp_info = email_status_res.json()['data']
        print(f"[INFO] SMTP Configured: {smtp_info['configured']} (Host: '{smtp_info['smtp_server']}')")
        results['email_status'] = 'CONFIGURED' if smtp_info['configured'] else 'NOT_CONFIGURED (SAFE FALLBACK ACTIVE)'

        oauth_status_res = session.get(f"{BASE_URL}/auth/oauth/status")
        assert oauth_status_res.status_code == 200
        oauth_info = oauth_status_res.json()['data']
        print(f"[INFO] Google OAuth: {oauth_info['google']['configured']}, GitHub OAuth: {oauth_info['github']['configured']}")
        results['oauth_status'] = 'READY'
    except Exception as e:
        print(f"[FAIL] Email / OAuth status check: {e}")
        results['email_oauth_status'] = f'FAIL: {e}'

    print("\n====================================================")
    print("INTEGRATION VERIFICATION SUMMARY")
    print("====================================================")
    for test_name, status in results.items():
        print(f"  {test_name.ljust(25)}: {status}")

    all_passed = all(v in ('PASS', 'READY', 'CONFIGURED', 'NOT_CONFIGURED (SAFE FALLBACK ACTIVE)') for v in results.values())
    if all_passed:
        print("\nALL VERIFICATION FLOWS EXECUTED AND CONFIRMED OPERATIONAL!")
    else:
        print("\nSOME CHECKS FAILED. SEE DETAILS ABOVE.")

if __name__ == '__main__':
    run_integration_tests()
