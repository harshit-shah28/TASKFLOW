"""
DSA Module 6: Dependency Graph (Directed Acyclic Graph / DAG)
Models task dependency relationships, prevents circular deadlocks,
and computes optimal execution paths via Topological Sorting.
"""
from typing import Any, Dict, List, Set, Tuple
from collections import defaultdict, deque


class TaskDependencyGraph:
    """
    Directed Graph where an edge (U -> V) represents:
    "Task V depends on Task U" (i.e. Task U must be completed before Task V can proceed).
    """
    
    def __init__(self):
        self.nodes: Set[Any] = set()
        # Adjacency list: node -> list of tasks that depend on it (downstream)
        self.adj: Dict[Any, List[Any]] = defaultdict(list)
        # Reverse adjacency: node -> list of tasks it is waiting on (upstream)
        self.reverse_adj: Dict[Any, List[Any]] = defaultdict(list)

    def add_node(self, task_id: Any) -> None:
        self.nodes.add(task_id)

    def add_dependency(self, task_id: Any, depends_on_id: Any) -> None:
        """
        Register that task_id depends on depends_on_id.
        Edge: depends_on_id -> task_id.
        """
        self.nodes.add(task_id)
        self.nodes.add(depends_on_id)
        
        if task_id not in self.adj[depends_on_id]:
            self.adj[depends_on_id].append(task_id)
        if depends_on_id not in self.reverse_adj[task_id]:
            self.reverse_adj[task_id].append(depends_on_id)

    def would_create_cycle(self, task_id: Any, depends_on_id: Any) -> bool:
        """
        Pre-check: verifies if adding (depends_on_id -> task_id) creates a cycle.
        A cycle would occur if task_id can already reach depends_on_id.
        """
        if task_id == depends_on_id:
            return True
            
        # BFS from task_id along existing forward edges to see if depends_on_id is reachable
        visited = set()
        queue = deque([task_id])
        while queue:
            curr = queue.popleft()
            if curr == depends_on_id:
                return True
            for nxt in self.adj.get(curr, []):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
        return False

    def has_cycle(self) -> bool:
        """Cycle detection using 3-state DFS (0=unvisited, 1=visiting, 2=visited)."""
        state: Dict[Any, int] = {node: 0 for node in self.nodes}

        def _dfs(u: Any) -> bool:
            state[u] = 1 # Visiting
            for v in self.adj.get(u, []):
                if state.get(v, 0) == 1:
                    return True # Cycle detected
                if state.get(v, 0) == 0 and _dfs(v):
                    return True
            state[u] = 2 # Visited
            return False

        for node in list(self.nodes):
            if state.get(node, 0) == 0:
                if _dfs(node):
                    return True
        return False

    def topological_sort(self) -> Tuple[bool, List[Any]]:
        """
        Kahn's Algorithm for Topological Sort.
        Returns (is_valid_dag: bool, execution_order: list).
        If graph has cycles, is_valid_dag will be False.
        """
        in_degree: Dict[Any, int] = {node: 0 for node in self.nodes}
        for u in self.nodes:
            for v in self.adj.get(u, []):
                in_degree[v] = in_degree.get(v, 0) + 1

        queue = deque([node for node, deg in in_degree.items() if deg == 0])
        order: List[Any] = []

        while queue:
            curr = queue.popleft()
            order.append(curr)
            for neighbor in self.adj.get(curr, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        is_valid = len(order) == len(self.nodes)
        return is_valid, order

    def get_upstream_blockers(self, task_id: Any) -> List[Any]:
        """Tasks that must be completed before task_id can be done."""
        return list(self.reverse_adj.get(task_id, []))

    def get_downstream_dependents(self, task_id: Any) -> List[Any]:
        """Tasks that are currently waiting on task_id."""
        return list(self.adj.get(task_id, []))
