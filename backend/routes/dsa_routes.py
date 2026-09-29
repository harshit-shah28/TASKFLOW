import time
from datetime import datetime
from flask import Blueprint, request, g
from backend.models import db, Task, Project, Folder, TaskList, Workspace, TaskDependency
from backend.utils.response import success_response, error_response
from backend.middleware.auth_middleware import jwt_auth_required
from backend.dsa.n_ary_tree import NAryTree, TreeNode
from backend.dsa.trie import Trie
from backend.dsa.hash_map import CustomHashMap
from backend.dsa.priority_queue import PriorityQueue
from backend.dsa.event_queue import notification_event_queue
from backend.dsa.dependency_graph import TaskDependencyGraph
from backend.dsa.sorting_utils import merge_sort, quick_sort

dsa_bp = Blueprint('dsa', __name__)

PRIORITY_WEIGHTS = {'Urgent': 4, 'High': 3, 'Normal': 2, 'Low': 1}


@dsa_bp.route('/overview', methods=['GET'])
@jwt_auth_required
def get_dsa_overview():
    """Returns documentation and live metrics for all 7 custom DSA modules."""
    return success_response({
        'modules': [
            {
                'name': 'N-Ary Tree',
                'file': 'backend/dsa/n_ary_tree.py',
                'purpose': 'Models arbitrary-depth hierarchy: Workspace -> Projects -> Folders -> Lists -> Tasks -> Subtasks.',
                'complexity': 'Search: O(V + E) DFS, Path: O(Depth)',
                'active_use': 'Project tree explorer and breadcrumb navigation'
            },
            {
                'name': 'Trie (Prefix Tree)',
                'file': 'backend/dsa/trie.py',
                'purpose': 'Instant prefix matching and token autocomplete across tasks, projects, users, and tags.',
                'complexity': 'Insert: O(L), Prefix Search: O(P + M) where P=prefix length, M=match count',
                'active_use': 'Global topbar search input and real-time suggestion dropdown'
            },
            {
                'name': 'Custom Hash Map',
                'file': 'backend/dsa/hash_map.py',
                'purpose': 'Separate-chaining hash map with dynamic doubling resize for fast in-memory task/member lookups.',
                'complexity': 'Average Put/Get: O(1), Worst Case: O(N)',
                'active_use': 'In-memory workspace entity caching & session lookup'
            },
            {
                'name': 'Priority Queue (Binary Heap)',
                'file': 'backend/dsa/priority_queue.py',
                'purpose': 'Max-Heap & Min-Heap prioritizing urgent work, deadline proximity, and critical path items.',
                'complexity': 'Push: O(log N), Pop: O(log N), Peek: O(1)',
                'active_use': 'Dashboard urgent tasks ordering & deadline scheduler'
            },
            {
                'name': 'FIFO Event Queue',
                'file': 'backend/dsa/event_queue.py',
                'purpose': 'Thread-safe bounded circular FIFO queue buffering real-time notifications and audit log events.',
                'complexity': 'Enqueue: O(1), Dequeue: O(1)',
                'active_use': 'Asynchronous notification and activity pipeline buffering'
            },
            {
                'name': 'Dependency Graph (DAG)',
                'file': 'backend/dsa/dependency_graph.py',
                'purpose': 'Directed Acyclic Graph detecting cycle deadlocks and performing Topological Sorting for task order.',
                'complexity': 'Cycle Detection: O(V + E), Topological Sort: O(V + E)',
                'active_use': 'Task dependency validator & auto-blocker resolver'
            },
            {
                'name': 'Custom Sorting (MergeSort & QuickSort)',
                'file': 'backend/dsa/sorting_utils.py',
                'purpose': 'Stable MergeSort and 3-way QuickSort algorithms for multi-field task ordering.',
                'complexity': 'MergeSort: Guaranteed O(N log N) stable, QuickSort: Avg O(N log N)',
                'active_use': 'Task list & board view multi-attribute sorting'
            }
        ],
        'live_stats': {
            'event_queue_buffered': notification_event_queue.size(),
            'event_queue_history_count': len(notification_event_queue.get_recent_history(100))
        }
    })


@dsa_bp.route('/priority-tasks', methods=['GET'])
@jwt_auth_required
def get_priority_heap_tasks():
    """Demonstrates live Priority Queue Heap extraction of tasks."""
    workspace_id = request.args.get('workspace_id')
    if not workspace_id:
        return error_response("Workspace ID is required.", 400)
        
    tasks = Task.query.join(Project, Task.project_id == Project.id).filter(
        Project.workspace_id == int(workspace_id),
        Task.status != 'Completed'
    ).all()

    # Build Max-Heap Priority Queue
    pq = PriorityQueue(mode='max')
    for t in tasks:
        # Score calculation: base priority (1-4) * 100 + penalty for due dates
        score = PRIORITY_WEIGHTS.get(t.priority, 2) * 100.0
        if t.due_date:
            days_left = (t.due_date - datetime.utcnow()).total_seconds() / 86400.0
            if days_left < 0:
                score += 500.0 # Huge boost for overdue items
            elif days_left <= 1:
                score += 250.0
            elif days_left <= 3:
                score += 100.0
        pq.push(score, t.to_dict(include_subtasks=False))

    sorted_tasks = pq.to_sorted_list()
    return success_response({
        'heap_size': len(tasks),
        'prioritized_tasks': sorted_tasks
    })


@dsa_bp.route('/dependency-analysis', methods=['GET'])
@jwt_auth_required
def analyze_dependencies():
    """Runs Topological Sort and Cycle Detection on project task dependencies."""
    project_id = request.args.get('project_id')
    if not project_id:
        return error_response("Project ID is required.", 400)
        
    tasks = Task.query.filter_by(project_id=int(project_id)).all()
    task_map = {t.id: t.title for t in tasks}

    deps = TaskDependency.query.join(Task, TaskDependency.task_id == Task.id).filter(
        Task.project_id == int(project_id)
    ).all()

    graph = TaskDependencyGraph()
    for t in tasks:
        graph.add_node(t.id)
    for d in deps:
        graph.add_dependency(task_id=d.task_id, depends_on_id=d.depends_on_task_id)

    has_cycle = graph.has_cycle()
    is_valid_dag, order_ids = graph.topological_sort()

    recommended_execution_sequence = [
        {'id': tid, 'title': task_map.get(tid, f"Task #{tid}")}
        for tid in order_ids if tid in task_map
    ]

    return success_response({
        'has_cycle': has_cycle,
        'is_valid_dag': is_valid_dag,
        'total_dependencies': len(deps),
        'recommended_execution_sequence': recommended_execution_sequence
    })
