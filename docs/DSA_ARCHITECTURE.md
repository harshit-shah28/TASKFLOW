# TaskFlow DSA Architecture Documentation

TaskFlow integrates **7 custom, non-trivial Data Structures and Algorithms (DSA)** directly into its SaaS backend and user experience. None of these are mere toy demonstrations; each structure solves a concrete architectural requirement.

---

## 1. N-Ary Tree (Multi-way Tree)
- **Source File:** `backend/dsa/n_ary_tree.py`
- **Application Feature:** Project and Workspace Organization Hierarchy (`Workspace -> Projects -> Folders -> TaskLists -> Tasks -> Subtasks`)
- **Why It Is Useful:** Relational databases store parent foreign keys, but operations like rendering arbitrary-depth sidebar hierarchies, computing breadcrumb path-to-root, and calculating recursive subtask completion metrics are best solved with an N-ary tree traversal (DFS & BFS).
- **Time Complexity:**
  - Finding Node: $O(V + E)$ via DFS
  - Breadcrumb Path to Root: $O(d)$ where $d$ is depth
  - Subtree Metric Aggregation: $O(N)$
- **Endpoints:** `GET /api/projects/:id/tree`

---

## 2. Trie (Prefix Tree)
- **Source File:** `backend/dsa/trie.py`
- **Application Feature:** Global Search & Autocomplete (Ctrl+K Topbar Modal)
- **Why It Is Useful:** Full-table SQL `LIKE '%query%'` queries require full table scans that degrade linearly as projects grow. The Trie indexes every word and sub-token in task titles, project names, member names, and tags. Keystrokes are matched in $O(k)$ time relative only to the length of the search string.
- **Time Complexity:**
  - Insertion: $O(L)$ where $L$ is token length
  - Prefix Search: $O(P + M)$ where $P$ is prefix length and $M$ is the number of descendant matches
- **Endpoints:** `GET /api/search?workspace_id=...&q=...`

---

## 3. Custom Hash Map (Separate Chaining with Dynamic Rehashing)
- **Source File:** `backend/dsa/hash_map.py`
- **Application Feature:** In-Memory Workspace Entity & Permission Cache
- **Why It Is Useful:** Implements a hash table with polynomial rolling hashing, linked-list separate chaining for collision resolution, and automated array doubling when the load factor exceeds 0.75. Used for caching frequent workspace permissions and entity lookups without repeated database hits.
- **Time Complexity:**
  - Put / Get / Remove: Average $O(1)$, Worst Case $O(N)$

---

## 4. Priority Queue (Binary Heap)
- **Source File:** `backend/dsa/priority_queue.py`
- **Application Feature:** Task Urgency & Nearest-Deadline Scheduler
- **Why It Is Useful:** Supports both Max-Heap (for Urgent > High > Normal > Low priority scores) and Min-Heap (for nearest due date proximity). Enables the Dashboard and Task Scheduler to retrieve the highest priority work without re-sorting the entire task database.
- **Time Complexity:**
  - Push: $O(\log N)$
  - Pop (Extract Max/Min): $O(\log N)$
  - Peek Top: $O(1)$
- **Endpoints:** `GET /api/dsa/priority-tasks?workspace_id=...`

---

## 5. FIFO Event Queue
- **Source File:** `backend/dsa/event_queue.py`
- **Application Feature:** Transactional Notification & Email Delivery Buffer
- **Why It Is Useful:** Thread-safe circular FIFO buffer with capacity bounds that buffers in-app notifications and email dispatch jobs. Prevents latency spikes on primary user mutation requests and guarantees chronological audit logging.
- **Time Complexity:**
  - Enqueue: $O(1)$
  - Dequeue: $O(1)$
- **Endpoints:** `GET /api/dsa/overview` (live queue telemetry)

---

## 6. Dependency Graph (Directed Acyclic Graph / DAG)
- **Source File:** `backend/dsa/dependency_graph.py`
- **Application Feature:** Task Blockers & Execution Sequencing
- **Why It Is Useful:**
  1. **Cycle Detection:** Uses 3-color DFS to detect circular dependencies (e.g. Task A waits on Task B, which waits on Task A) and rejects invalid blocker links before persistence.
  2. **Topological Sort:** Implements Kahn's Algorithm to generate the optimal step-by-step execution path for project deliverables.
- **Time Complexity:**
  - Cycle Detection: $O(V + E)$
  - Topological Sorting: $O(V + E)$
- **Endpoints:** `POST /api/tasks/:id/dependencies`, `GET /api/dsa/dependency-analysis?project_id=...`

---

## 7. Custom Sorting (MergeSort & QuickSort)
- **Source File:** `backend/dsa/sorting_utils.py`
- **Application Feature:** Multi-Attribute Task & Board Ordering
- **Why It Is Useful:**
  - **MergeSort:** Stable divide-and-conquer sorting algorithm with guaranteed $O(N \log N)$ complexity. Essential when preserving secondary order (e.g., sort by priority, preserving creation date order).
  - **QuickSort:** In-place 3-way partitioning algorithm for rapid in-memory rearrangements.
- **Time Complexity:**
  - MergeSort: $O(N \log N)$ in all cases
  - QuickSort: Average $O(N \log N)$
- **Endpoints:** `GET /api/tasks?sort_by=priority|due_date|title|created_at`
