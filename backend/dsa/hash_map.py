"""
DSA Module 3: Custom Hash Map with Separate Chaining
Provides O(1) average-time in-memory caching and rapid lookup of tasks and members.
"""
from typing import Any, List, Optional, Tuple


class HashNode:
    def __init__(self, key: Any, value: Any):
        self.key = key
        self.value = value
        self.next: Optional['HashNode'] = None


class CustomHashMap:
    """
    Separate Chaining Hash Map with dynamic doubling resizing
    when load factor exceeds 0.75.
    """
    
    def __init__(self, initial_capacity: int = 16, load_factor: float = 0.75):
        self.capacity = initial_capacity
        self.load_factor = load_factor
        self.count = 0
        self.buckets: List[Optional[HashNode]] = [None] * self.capacity

    def _hash(self, key: Any) -> int:
        return abs(hash(str(key))) % self.capacity

    def put(self, key: Any, value: Any) -> None:
        """Insert or update a key-value pair."""
        if (self.count + 1) / self.capacity > self.load_factor:
            self._resize(self.capacity * 2)

        index = self._hash(key)
        head = self.buckets[index]

        # Check if key exists in bucket
        curr = head
        while curr:
            if curr.key == key:
                curr.value = value
                return
            curr = curr.next

        # Insert new node at head of linked chain
        new_node = HashNode(key, value)
        new_node.next = self.buckets[index]
        self.buckets[index] = new_node
        self.count += 1

    def get(self, key: Any, default: Any = None) -> Any:
        """Retrieve value for key, or default if missing."""
        index = self._hash(key)
        curr = self.buckets[index]
        while curr:
            if curr.key == key:
                return curr.value
            curr = curr.next
        return default

    def contains(self, key: Any) -> bool:
        """Check if key exists."""
        return self.get(key) is not None

    def remove(self, key: Any) -> bool:
        """Remove a key and return True if existed."""
        index = self._hash(key)
        curr = self.buckets[index]
        prev = None

        while curr:
            if curr.key == key:
                if prev:
                    prev.next = curr.next
                else:
                    self.buckets[index] = curr.next
                self.count -= 1
                return True
            prev = curr
            curr = curr.next
        return False

    def _resize(self, new_capacity: int) -> None:
        """Rehash all existing nodes into a new larger bucket array."""
        old_buckets = self.buckets
        self.capacity = new_capacity
        self.buckets = [None] * self.capacity
        self.count = 0

        for head in old_buckets:
            curr = head
            while curr:
                self.put(curr.key, curr.value)
                curr = curr.next

    def size(self) -> int:
        return self.count

    def items(self) -> List[Tuple[Any, Any]]:
        result = []
        for head in self.buckets:
            curr = head
            while curr:
                result.append((curr.key, curr.value))
                curr = curr.next
        return result

    def clear(self) -> None:
        self.buckets = [None] * self.capacity
        self.count = 0
