"""
DSA Module 7: Custom Sorting Utilities
Implements MergeSort (stable, guaranteed O(n log n)) and QuickSort
for multi-attribute sorting of tasks, projects, and activities.
"""
from typing import Any, Callable, List


def merge_sort(items: List[Any], key_fn: Callable[[Any], Any] = lambda x: x, reverse: bool = False) -> List[Any]:
    """
    Stable MergeSort algorithm with custom comparator key.
    Guaranteed O(n log n) time complexity.
    """
    if len(items) <= 1:
        return list(items)

    mid = len(items) // 2
    left = merge_sort(items[:mid], key_fn=key_fn, reverse=reverse)
    right = merge_sort(items[mid:], key_fn=key_fn, reverse=reverse)

    return _merge(left, right, key_fn, reverse)


def _merge(left: List[Any], right: List[Any], key_fn: Callable[[Any], Any], reverse: bool) -> List[Any]:
    merged = []
    i = j = 0

    while i < len(left) and j < len(right):
        val_left = key_fn(left[i])
        val_right = key_fn(right[j])

        # Handle None comparisons safely
        if val_left is None and val_right is not None:
            take_left = reverse
        elif val_right is None and val_left is not None:
            take_left = not reverse
        elif val_left is None and val_right is None:
            take_left = True
        else:
            take_left = (val_left >= val_right) if reverse else (val_left <= val_right)

        if take_left:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged


def quick_sort(items: List[Any], key_fn: Callable[[Any], Any] = lambda x: x, reverse: bool = False) -> List[Any]:
    """
    In-place / 3-way partition QuickSort algorithm.
    Average O(n log n) time complexity.
    """
    arr = list(items)
    _quicksort_helper(arr, 0, len(arr) - 1, key_fn, reverse)
    return arr


def _quicksort_helper(arr: List[Any], low: int, high: int, key_fn: Callable[[Any], Any], reverse: bool):
    if low < high:
        p_index = _partition(arr, low, high, key_fn, reverse)
        _quicksort_helper(arr, low, p_index - 1, key_fn, reverse)
        _quicksort_helper(arr, p_index + 1, high, key_fn, reverse)


def _partition(arr: List[Any], low: int, high: int, key_fn: Callable[[Any], Any], reverse: bool) -> int:
    pivot_val = key_fn(arr[high])
    i = low - 1

    for j in range(low, high):
        val_j = key_fn(arr[j])
        
        # Comparison logic with safe None handling
        should_swap = False
        if val_j is not None and pivot_val is not None:
            should_swap = (val_j >= pivot_val) if reverse else (val_j <= pivot_val)
        elif val_j is None and pivot_val is not None:
            should_swap = reverse
        elif val_j is not None and pivot_val is None:
            should_swap = not reverse

        if should_swap:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
