"""
DSA Module 4: Priority Queue (Binary Heap)
Enables O(log n) insertion and extraction of urgent tasks and nearest deadlines.
"""
from typing import Any, List, Optional, Tuple


class PriorityQueue:
    """
    Binary Heap implementation supporting both Min-Heap (mode='min')
    and Max-Heap (mode='max').
    Each entry is a tuple: (score, insertion_order, item).
    """
    
    def __init__(self, mode: str = 'max'):
        self.mode = mode.lower()
        if self.mode not in ('min', 'max'):
            raise ValueError("Mode must be 'min' or 'max'")
        self.heap: List[Tuple[float, int, Any]] = []
        self._counter = 0

    def _compare(self, score_a: float, score_b: float) -> bool:
        if self.mode == 'max':
            return score_a > score_b
        return score_a < score_b

    def push(self, score: float, item: Any) -> None:
        """Insert an item with priority score. O(log n)"""
        self._counter += 1
        entry = (score, self._counter, item)
        self.heap.append(entry)
        self._sift_up(len(self.heap) - 1)

    def pop(self) -> Optional[Any]:
        """Extract the highest (or lowest) priority item. O(log n)"""
        if not self.heap:
            return None
        if len(self.heap) == 1:
            return self.heap.pop()[2]

        top_item = self.heap[0][2]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return top_item

    def peek(self) -> Optional[Any]:
        """View the top item without removing it. O(1)"""
        if not self.heap:
            return None
        return self.heap[0][2]

    def _sift_up(self, index: int) -> None:
        parent = (index - 1) // 2
        while index > 0 and self._compare(self.heap[index][0], self.heap[parent][0]):
            self.heap[index], self.heap[parent] = self.heap[parent], self.heap[index]
            index = parent
            parent = (index - 1) // 2

    def _sift_down(self, index: int) -> None:
        n = len(self.heap)
        while True:
            best = index
            left = 2 * index + 1
            right = 2 * index + 2

            if left < n and self._compare(self.heap[left][0], self.heap[best][0]):
                best = left
            if right < n and self._compare(self.heap[right][0], self.heap[best][0]):
                best = right

            if best != index:
                self.heap[index], self.heap[best] = self.heap[best], self.heap[index]
                index = best
            else:
                break

    def is_empty(self) -> bool:
        return len(self.heap) == 0

    def size(self) -> int:
        return len(self.heap)

    def to_sorted_list(self) -> List[Any]:
        """Extract all items in priority order non-destructively."""
        # Work on a clone
        clone = PriorityQueue(mode=self.mode)
        clone.heap = list(self.heap)
        res = []
        while not clone.is_empty():
            res.append(clone.pop())
        return res
