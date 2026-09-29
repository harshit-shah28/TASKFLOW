import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.dsa.n_ary_tree import NAryTree, TreeNode
from backend.dsa.trie import Trie
from backend.dsa.hash_map import CustomHashMap
from backend.dsa.priority_queue import PriorityQueue
from backend.dsa.event_queue import EventQueue
from backend.dsa.dependency_graph import TaskDependencyGraph
from backend.dsa.sorting_utils import merge_sort, quick_sort

def test_dsa():
    print("Testing TaskFlow Custom DSA Modules...")

    # 1. N-Ary Tree
    root = TreeNode(1, 'workspace', 'Acme Corp')
    proj = TreeNode(10, 'project', 'SaaS App')
    root.add_child(proj)
    folder = TreeNode(100, 'folder', 'Sprint 1')
    proj.add_child(folder)
    task = TreeNode(1000, 'task', 'Setup Auth')
    folder.add_child(task)
    
    tree = NAryTree(root)
    assert tree.find_node(1000).title == 'Setup Auth'
    path = tree.get_path_to_root(1000)
    assert len(path) == 4
    assert [p['title'] for p in path] == ['Acme Corp', 'SaaS App', 'Sprint 1', 'Setup Auth']
    print("[OK] N-Ary Tree hierarchy & traversal verified.")

    # 2. Trie
    trie = Trie()
    trie.insert("Deploy database cluster", {'id': 1, 'type': 'task'})
    trie.insert("Design landing page", {'id': 2, 'type': 'task'})
    trie.insert("DevOps Pipeline", {'id': 3, 'type': 'project'})
    
    matches = trie.search_prefix("de")
    assert len(matches) == 3
    matches_pipe = trie.search_prefix("pip")
    assert len(matches_pipe) == 1
    assert matches_pipe[0]['id'] == 3
    print("[OK] Trie prefix search & autocomplete verified.")

    # 3. Custom Hash Map
    hmap = CustomHashMap(initial_capacity=4)
    for i in range(20):
        hmap.put(f"key_{i}", f"val_{i}")
    assert hmap.size() == 20
    assert hmap.get("key_7") == "val_7"
    assert hmap.contains("key_15")
    assert hmap.remove("key_7")
    assert hmap.get("key_7") is None
    print("[OK] Custom Hash Map separate chaining & dynamic resize verified.")

    # 4. Priority Queue (Binary Heap)
    pq = PriorityQueue(mode='max')
    pq.push(10, "Low task")
    pq.push(100, "Urgent critical task")
    pq.push(50, "High priority task")
    assert pq.pop() == "Urgent critical task"
    assert pq.pop() == "High priority task"
    assert pq.pop() == "Low task"
    print("[OK] Priority Queue binary heap verified.")

    # 5. FIFO Event Queue
    eq = EventQueue(max_capacity=10)
    eq.enqueue({'action': 'task_created', 'id': 1})
    eq.enqueue({'action': 'status_updated', 'id': 2})
    assert eq.size() == 2
    assert eq.dequeue()['action'] == 'task_created'
    assert eq.dequeue()['action'] == 'status_updated'
    assert eq.is_empty()
    print("[OK] FIFO Event Queue verified.")

    # 6. Dependency Graph & DAG Cycle Detection
    graph = TaskDependencyGraph()
    # Task 3 depends on Task 2; Task 2 depends on Task 1 (1 -> 2 -> 3)
    graph.add_dependency(task_id=2, depends_on_id=1)
    graph.add_dependency(task_id=3, depends_on_id=2)
    assert not graph.has_cycle()
    is_valid, order = graph.topological_sort()
    assert is_valid
    assert order == [1, 2, 3]

    # Test cycle rejection
    assert graph.would_create_cycle(task_id=1, depends_on_id=3)
    print("[OK] Dependency Graph cycle detection & topological sort verified.")

    # 7. Custom Sorting (MergeSort & QuickSort)
    raw = [
        {'id': 1, 'priority': 1, 'due': '2026-04-10'},
        {'id': 2, 'priority': 4, 'due': '2026-03-01'},
        {'id': 3, 'priority': 2, 'due': '2026-03-15'},
    ]
    sorted_merge = merge_sort(raw, key_fn=lambda x: x['priority'], reverse=True)
    assert [x['id'] for x in sorted_merge] == [2, 3, 1]
    
    sorted_quick = quick_sort(raw, key_fn=lambda x: x['due'])
    assert [x['id'] for x in sorted_quick] == [2, 3, 1]
    print("[OK] MergeSort and QuickSort algorithms verified.")

    print("\nALL 7 DSA MODULES TESTED AND FULLY OPERATIONAL! :)")

if __name__ == '__main__':
    test_dsa()
