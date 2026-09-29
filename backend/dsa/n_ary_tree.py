"""
DSA Module 1: N-Ary Tree
Represents the organizational hierarchy of TaskFlow:
Workspace -> Projects -> Folders -> Lists -> Tasks -> Subtasks
"""
from typing import Any, List, Optional, Callable


class TreeNode:
    """A node in the N-ary tree representing a hierarchical entity."""
    
    def __init__(self, node_id: Any, node_type: str, title: str, data: Optional[dict] = None):
        self.node_id = node_id
        self.node_type = node_type  # 'workspace', 'project', 'folder', 'list', 'task', 'subtask'
        self.title = title
        self.data = data or {}
        self.children: List['TreeNode'] = []
        self.parent: Optional['TreeNode'] = None

    def add_child(self, child_node: 'TreeNode') -> 'TreeNode':
        """Attach a child node to this node."""
        child_node.parent = self
        self.children.append(child_node)
        return child_node

    def remove_child(self, child_node_id: Any) -> bool:
        """Remove a child node by its ID."""
        for i, child in enumerate(self.children):
            if child.node_id == child_node_id:
                child.parent = None
                del self.children[i]
                return True
        return False

    def to_dict(self) -> dict:
        """Convert node and descendants to recursive JSON dictionary."""
        return {
            'id': self.node_id,
            'type': self.node_type,
            'title': self.title,
            'data': self.data,
            'children': [child.to_dict() for child in self.children]
        }


class NAryTree:
    """N-Ary tree managing the hierarchical structures and queries."""
    
    def __init__(self, root: Optional[TreeNode] = None):
        self.root = root

    def find_node(self, node_id: Any, current: Optional[TreeNode] = None) -> Optional[TreeNode]:
        """DFS traversal to locate a node by its ID."""
        if current is None:
            current = self.root
        if current is None:
            return None
        if current.node_id == node_id:
            return current
        for child in current.children:
            found = self.find_node(node_id, child)
            if found:
                return found
        return None

    def get_path_to_root(self, node_id: Any) -> List[dict]:
        """Return the breadcrumb trail from root to the target node."""
        target = self.find_node(node_id)
        if not target:
            return []
        path = []
        curr = target
        while curr:
            path.append({'id': curr.node_id, 'type': curr.node_type, 'title': curr.title})
            curr = curr.parent
        return list(reversed(path))

    def count_nodes_by_type(self, node_type: str, current: Optional[TreeNode] = None) -> int:
        """Count total elements of a given type in the subtree."""
        if current is None:
            current = self.root
        if current is None:
            return 0
        count = 1 if current.node_type == node_type else 0
        for child in current.children:
            count += self.count_nodes_by_type(node_type, child)
        return count

    def breadth_first_traversal(self, visitor: Optional[Callable[[TreeNode], None]] = None) -> List[dict]:
        """Level-order BFS traversal returning flattened hierarchy."""
        if not self.root:
            return []
        queue = [self.root]
        result = []
        while queue:
            node = queue.pop(0)
            if visitor:
                visitor(node)
            result.append({'id': node.node_id, 'type': node.node_type, 'title': node.title})
            for child in node.children:
                queue.append(child)
        return result
