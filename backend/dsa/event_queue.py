"""
DSA Module 5: Event Queue (FIFO Queue)
Buffers asynchronous events (notifications, email delivery jobs, audit logs) for linear processing.
"""
from typing import Any, List, Optional
from collections import deque
import threading


class EventQueue:
    """
    Thread-safe FIFO event processing queue with bounded capacity
    and recent event history tracking.
    """
    
    def __init__(self, max_capacity: int = 1000):
        self._queue = deque()
        self._history = deque(maxlen=200) # Keep recent 200 events for auditing
        self.max_capacity = max_capacity
        self._lock = threading.Lock()

    def enqueue(self, event: Any) -> bool:
        """Add an event to the end of the queue. Returns True if accepted."""
        with self._lock:
            if len(self._queue) >= self.max_capacity:
                return False
            self._queue.append(event)
            self._history.append(event)
            return True

    def dequeue(self) -> Optional[Any]:
        """Remove and return the oldest event in FIFO order."""
        with self._lock:
            if not self._queue:
                return None
            return self._queue.popleft()

    def peek(self) -> Optional[Any]:
        """View the next event to be processed without popping."""
        with self._lock:
            if not self._queue:
                return None
            return self._queue[0]

    def is_empty(self) -> bool:
        with self._lock:
            return len(self._queue) == 0

    def size(self) -> int:
        with self._lock:
            return len(self._queue)

    def get_recent_history(self, limit: int = 50) -> List[Any]:
        """Fetch recently enqueued events."""
        with self._lock:
            items = list(self._history)
            return items[-limit:]
            
    def clear(self) -> None:
        with self._lock:
            self._queue.clear()
            self._history.clear()


# Global in-memory notification & event queue instance
notification_event_queue = EventQueue()
