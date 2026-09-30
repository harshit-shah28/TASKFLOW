# TASKFLOW: Enterprise Multi-Tier Project Management Platform
## DOCUMENT 1: Complete Technical Design & Architectural Project Report

---

## 1. Executive Summary & Problem Definition

Modern project management platforms frequently face a dual architectural challenge:
1. **Relational Database Overhead:** Traditional relational databases perform well for static CRUD records, but degrade rapidly when processing recursive hierarchical trees (e.g., workspaces, projects, folders, lists, subtasks), prefix autocompletion queries (`LIKE '%term%'`), deadline priority scheduling, and cycle-deadlock detection in complex dependency networks.
2. **Real-Time Collaboration Latency:** Distributed teams require instant bi-directional updates for messaging, task movement, status mutations, and event streaming without relying on resource-intensive HTTP polling.

**TASKFLOW** resolves these challenges by coupling a modular **Flask 3.0** backend and **React 19** frontend with **7 custom in-memory Data Structures and Algorithms (DSA)** alongside **Flask-SocketIO** for real-time collaboration. The architecture guarantees sub-millisecond in-memory computations for dependency graphs, trie lookups, priority queues, and organization trees, while preserving relational consistency in **SQLAlchemy / SQLite / PostgreSQL**.

---

## 2. High-Level Design (HLD)

### 2.1 Architectural Pattern
TaskFlow follows a **Layered Micro-Modular Architecture** enriched with an **In-Memory Computational Domain Layer** and an **Event-Driven WebSocket Gateway**.

```mermaid
flowchart TD
    subgraph ClientLayer ["Frontend Client Layer (React 19 + Vite)"]
        UI_App["Single Page Application (App.jsx)"]
        UI_Context["Global Contexts (AuthContext, ThemeContext, NotificationContext)"]
        UI_Pages["Views (Dashboard, Kanban, Calendar, DAG, Chat, Admin)"]
        UI_Axios["API Service (Axios Client with JWT Interceptors)"]
        UI_Socket["WebSocket Client (Socket.io-client)"]
    end

    subgraph GatewayLayer ["Network & Gateway Layer"]
        ViteProxy["Vite Dev Server Reverse Proxy (:5173/api)"]
        FlaskRouter["Flask Application Router (:5000)"]
        CORS["CORS & Request Normalizer"]
        SocketGateway["Flask-SocketIO Real-time Gateway"]
    end

    subgraph MiddlewareLayer ["Security & Middleware Layer"]
        AuthMiddleware["JWT Authentication Guard (@jwt_required_custom)"]
        RoleGuard["Workspace RBAC Guard (@workspace_role_required)"]
        AdminGuard["Platform Admin Guard (@admin_required)"]
        ClerkVerifier["Clerk Public-Key Session Verifier"]
    end

    subgraph ServiceLayer ["Application & Service Layer"]
        AuthService["Authentication & SSO Service"]
        WorkspaceService["Workspace & Member Service"]
        TaskService["Task Lifecycle & Subtask Engine"]
        ChatService["Team Chat & File Upload Service"]
        EmailService["Transactional Email Service (Resend + SMTP)"]
        AdminService["Platform Governance & Telemetry"]
    end

    subgraph DSALayer ["Custom In-Memory Algorithmic Core (DSA)"]
        NAryTree["N-Ary Tree (Multi-level Hierarchy)"]
        TrieEngine["Trie (Prefix Autocomplete Search)"]
        HashMapCache["Custom Hash Map (Separate Chaining)"]
        PriorityHeap["Binary Heap Priority Queue (Deadlines)"]
        EventQueue["FIFO Thread-Safe Event Queue (Audit/Buffer)"]
        DAGGraph["DAG Kahn's Topological Sort (Blockers)"]
        SortingAlgorithms["Custom MergeSort & QuickSort"]
    end

    subgraph PersistenceLayer ["Persistence & External Storage"]
        SQLAlchemyORM["SQLAlchemy ORM 2.x"]
        RelationalDB[("Database: SQLite / PostgreSQL")]
        FileStorage[("Secure Upload Storage (/uploads/chat)")]
        ExternalAPIs["External SaaS: Clerk OAuth & Resend API"]
    end

    UI_App --> UI_Context
    UI_Context --> UI_Pages
    UI_Pages --> UI_Axios
    UI_Pages --> UI_Socket

    UI_Axios --> ViteProxy --> FlaskRouter
    UI_Socket --> SocketGateway

    FlaskRouter --> CORS --> MiddlewareLayer
    SocketGateway --> MiddlewareLayer

    MiddlewareLayer --> ServiceLayer
    ServiceLayer <--> DSALayer
    ServiceLayer --> SQLAlchemyORM --> RelationalDB
    ChatService --> FileStorage
    AuthService --> ExternalAPIs
    EmailService --> ExternalAPIs
```

### 2.2 Technology Stack

| Layer | Component | Technology & Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Framework | React 19.0.0 | Component rendering, hooks, reactive UI |
| **Build Tool** | Bundler / Server | Vite 8.3.1 | Hot Module Replacement, optimized bundling |
| **Styling** | Utility CSS | Tailwind CSS 4.x + Lucide Icons | Responsive UI, dark/light theme |
| **Backend API** | Web Framework | Python 3.10+ / Flask 3.0.0 | RESTful API controllers, routing |
| **Real-time** | WebSockets | Flask-SocketIO 5.3.6 / Socket.IO | Bi-directional chat, typing indicators |
| **ORM / DB** | Persistence | SQLAlchemy 2.0 / SQLite / PostgreSQL | Relational modeling, migrations, foreign keys |
| **Auth** | Security | Flask-JWT-Extended + Clerk React SDK | Stateless JWT & Social SSO (Google/GitHub) |
| **Email** | Transactional | Resend HTTPS API / SMTP TLS | HTML templates, invite tokens, alerts |

---

## 3. Use Case Modeling

### 3.1 Primary Actors

1. **Platform Administrator:** Global system operator managing user access, tenant workspaces, platform-wide metrics, and audit streams.
2. **Workspace Owner:** Tenant creator with full governance over billing, workspace settings, role assignments, and project purges.
3. **Workspace Administrator:** Team manager provisioning projects, folders, task lists, and managing invitations.
4. **Workspace Member:** Day-to-day team member creating tasks, managing dependencies, posting comments, and chatting in channels.
5. **Workspace Viewer:** Read-only stakeholder inspecting boards, timeline charts, and project trees.
6. **External Invitee / Guest:** Prospective user receiving 7-day token invitations via email to join specific workspaces.

### 3.2 Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors ["System Actors"]
        Guest["External Invitee / Guest"]
        Member["Workspace Member"]
        Admin["Workspace Admin"]
        Owner["Workspace Owner"]
        SuperAdmin["Platform Administrator"]
    end

    subgraph AuthCases ["Authentication & Onboarding"]
        UC_Register["Register / Login (JWT)"]
        UC_GoogleSSO["Google / GitHub OAuth (Clerk)"]
        UC_AcceptInvite["Accept Workspace Invitation Token"]
    end

    subgraph CoreCases ["Project & Task Management"]
        UC_ViewTree["Inspect Hierarchical N-Ary Project Tree"]
        UC_ManageTasks["Create & Transition Tasks (Kanban / List)"]
        UC_LinkDependencies["Link Dependencies (DAG Cycle Check)"]
        UC_TopologicalSort["View Optimal Milestone Execution Sequence"]
        UC_GlobalSearch["Autocomplete Search (Ctrl+K Trie)"]
    end

    subgraph CollabCases ["Collaboration & Communications"]
        UC_RealTimeChat["Team Channel & Direct Messaging"]
        UC_UploadFiles["Share Image / File Attachments"]
        UC_TaskComments["Post Comments with @Mentions"]
        UC_ReceiveAlerts["In-App & Email Notifications"]
    end

    subgraph AdminCases ["Governance & Administration"]
        UC_InviteMembers["Invite Members via Email (7-Day Token)"]
        UC_ManageRoles["Promote / Demote Workspace Roles"]
        UC_PlatformAdmin["Inspect Global Telemetry & Suspend Users"]
    end

    Guest --> UC_Register
    Guest --> UC_GoogleSSO
    Guest --> UC_AcceptInvite

    Member --> UC_ViewTree
    Member --> UC_ManageTasks
    Member --> UC_LinkDependencies
    Member --> UC_GlobalSearch
    Member --> UC_RealTimeChat
    Member --> UC_UploadFiles
    Member --> UC_TaskComments
    Member --> UC_ReceiveAlerts

    Admin --> UC_InviteMembers
    Admin --> UC_TopologicalSort
    Admin --> UC_ManageTasks

    Owner --> UC_ManageRoles
    Owner --> UC_InviteMembers

    SuperAdmin --> UC_PlatformAdmin
```

---

## 4. Low-Level Design (LLD)

### 4.1 REST API Specification Matrix

| Endpoint | Method | Role Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | Register new user account and auto-resolve pending invitations |
| `/api/auth/login` | `POST` | Public | Authenticate credentials and issue standard 7-day JWT |
| `/api/auth/clerk-sync` | `POST` | Public | Synchronize verified Clerk / Google OAuth token with TaskFlow |
| `/api/auth/me` | `GET` | Authenticated | Retrieve authenticated user profile and accessible workspaces |
| `/api/workspaces` | `GET` / `POST` | Authenticated | List member workspaces or create new workspace |
| `/api/workspaces/:id/invitations` | `POST` | Admin / Owner | Send 7-day cryptographically secure invitation email |
| `/api/workspaces/invitations/:token` | `GET` / `POST` | Public / Auth | Inspect invitation validity and accept membership |
| `/api/projects` | `GET` / `POST` | Authenticated | List workspace projects or create a new project |
| `/api/projects/:id/tree` | `GET` | Member+ | Retrieve complete recursive N-Ary tree representation |
| `/api/tasks` | `GET` / `POST` | Member+ | Query tasks (sorted via MergeSort) or create task |
| `/api/tasks/:id/dependencies` | `POST` | Member+ | Add prerequisite task dependency with DAG cycle rejection |
| `/api/dsa/dependency-analysis` | `GET` | Member+ | Return Kahn's topological sort sequence and cycle status |
| `/api/search` | `GET` | Member+ | Multi-entity prefix search executed against the Trie engine |
| `/api/chat/conversations` | `GET` / `POST` | Member+ | List active channels/DMs or initialize a new conversation |
| `/api/chat/messages/:id/attachments`| `POST` | Member+ | Upload attachment with MIME validation and size limits |
| `/api/admin/users` | `GET` / `PATCH` | Platform Admin| List all system accounts or toggle active suspension state |
| `/api/admin/metrics` | `GET` | Platform Admin| Aggregated platform throughput, entity counts, storage stats |

---

### 4.2 Real-Time WebSocket Event Contract

The application establishes authenticated, duplex WebSockets via `flask_socketio`:

| Event Name | Direction | Payload Schema | Functional Action |
| :--- | :---: | :--- | :--- |
| `join_workspace` | Client $\rightarrow$ Server | `{ workspace_id: int }` | Subscribes socket to workspace broadcast room |
| `join_conversation`| Client $\rightarrow$ Server | `{ conversation_id: int }` | Joins individual chat room for live message distribution |
| `typing_start` | Client $\rightarrow$ Server | `{ conversation_id: int, user_name: str }` | Broadcasts live typing banner to conversation room |
| `typing_stop` | Client $\rightarrow$ Server | `{ conversation_id: int, user_name: str }` | Clears active typing status indicator |
| `new_message` | Server $\rightarrow$ Client | `{ id, content, sender, attachments, created_at }` | Real-time message append to all open client chat views |
| `notification_alert` | Server $\rightarrow$ Client | `{ id, title, message, type, link_url }` | Fires top-right toast alert and bumps inbox badge |

---

### 4.3 Algorithmic Core: 7 Custom In-Memory DSA Engines

#### 1. N-Ary Tree Hierarchy Engine (`backend/dsa/n_ary_tree.py`)
- **Structure:** Arbitrary-degree hierarchical tree with node classes storing references to parent, child dictionary, and entity payload.
- **Operations:**
  - `add_child(parent_id, node)`: $O(1)$ child append.
  - `get_path_to_root(node_id)`: $O(d)$ path accumulation for dynamic breadcrumbs.
  - `compute_subtree_metrics(node_id)`: Post-order DFS calculating total tasks, completed percentages, and overdue aggregates in $O(N)$ time.

#### 2. Trie Prefix Search Engine (`backend/dsa/trie.py`)
- **Structure:** 26+ character branching prefix tree containing terminal payload sets.
- **Operations:**
  - Tokenization: Splits multi-word phrases and tags (`#frontend`, `task-123`).
  - `insert(token, entity)`: $O(L)$ where $L$ is token character length.
  - `search_prefix(prefix)`: Traverses to prefix node in $O(P)$ and executes BFS gathering descendant payloads up to limit $M$ in $O(P + M)$ time.

#### 3. Custom Hash Map Cache (`backend/dsa/hash_map.py`)
- **Structure:** Array of linked lists (separate chaining collision resolution) utilizing polynomial rolling hash keys:
  $$\text{Hash}(S) = \sum_{i=0}^{k-1} S[i] \cdot p^i \pmod m$$
- **Operations:**
  - Automatic resizing when load factor $\lambda = \frac{N}{\text{buckets}} > 0.75$.
  - Array capacity doubles ($2B$) and all entries are re-hashed in $O(N)$ amortized time.
  - `get`, `put`, `remove`: Average $O(1)$, Worst case $O(N)$ under adversarial collision.

#### 4. Priority Queue Deadline Scheduler (`backend/dsa/priority_queue.py`)
- **Structure:** Array-backed complete binary heap implementing both Max-Heap (for priority scores) and Min-Heap (for earliest deadline timestamps).
- **Operations:**
  - `push(item)`: Appends to end and bubbles up (sift-up) in $O(\log N)$ time.
  - `pop()`: Replaces root with last element and sifts down in $O(\log N)$ time.
  - `peek()`: Inspects top priority item in $O(1)$ time.

#### 5. FIFO Event Queue (`backend/dsa/event_queue.py`)
- **Structure:** Circular bounded buffer with re-entrant thread locking (`threading.Lock`).
- **Operations:**
  - `enqueue(event)`: $O(1)$ atomic append with buffer full policy.
  - `dequeue()`: $O(1)$ atomic extraction for worker threads processing email dispatch and audit logging.

#### 6. Directed Acyclic Graph (DAG) Blocker Engine (`backend/dsa/dependency_graph.py`)
- **Structure:** Adjacency list graph representation storing directed edges $(u, v)$ where $u$ must complete before $v$.
- **Algorithms:**
  1. **Cycle Detection:** 3-Color Depth First Search (WHITE = unvisited, GRAY = active on recursion stack, BLACK = fully explored). If an edge targets a GRAY node, a cycle deadlock is detected, and the dependency is rejected ($O(V + E)$).
  2. **Kahn's Topological Sort:** Calculates in-degrees for all vertices; pushes vertices with $\text{in-degree} = 0$ into a queue; iteratively removes vertices, appends to sequence, and decrements neighbor in-degrees ($O(V + E)$).

#### 7. Custom MergeSort & QuickSort Utilities (`backend/dsa/sorting_utils.py`)
- **Structure:** Pure algorithmic implementations independent of standard library wrappers.
- **Operations:**
  - `mergesort(items, key, reverse)`: Stable $O(N \log N)$ sorting preserving relative order for multi-criteria table filtering.
  - `quicksort(items, key)`: In-place 3-way partition sorting with randomized pivot selection.

---

## 5. UML Class Diagram

```mermaid
classDiagram
    class BaseModel {
        +int id
        +datetime created_at
        +datetime updated_at
        +to_dict() dict
    }

    class User {
        +string email
        +string password_hash
        +string full_name
        +string avatar_url
        +bool is_verified
        +bool is_platform_admin
        +string auth_provider
        +string provider_id
        +set_password(password)
        +check_password(password) bool
        +to_dict() dict
    }

    class Workspace {
        +string name
        +string slug
        +int owner_id
        +to_dict() dict
    }

    class WorkspaceMember {
        +int workspace_id
        +int user_id
        +string role
    }

    class WorkspaceInvitation {
        +int workspace_id
        +string email
        +string role
        +string token
        +string status
        +datetime expires_at
        +int invited_by_id
        +is_valid() bool
        +create_or_refresh() WorkspaceInvitation
    }

    class Project {
        +int workspace_id
        +string name
        +string description
        +string color
        +string icon
        +string status
    }

    class Folder {
        +int project_id
        +string name
        +int parent_id
    }

    class TaskList {
        +int project_id
        +int folder_id
        +string name
        +int position
    }

    class Task {
        +int project_id
        +int list_id
        +int parent_id
        +string title
        +string description
        +string status
        +string priority
        +datetime due_date
        +int position
    }

    class TaskDependency {
        +int task_id
        +int depends_on_task_id
        +string dependency_type
    }

    class Comment {
        +int task_id
        +int user_id
        +string content
    }

    class Conversation {
        +int workspace_id
        +string type
        +string name
    }

    class Message {
        +int conversation_id
        +int sender_id
        +string content
    }

    class Attachment {
        +int message_id
        +string filename
        +string file_path
        +int file_size
        +string mime_type
    }

    class Notification {
        +int user_id
        +string title
        +string message
        +string type
        +bool is_read
        +string link_url
    }

    BaseModel <|-- User
    BaseModel <|-- Workspace
    BaseModel <|-- Project
    BaseModel <|-- Folder
    BaseModel <|-- TaskList
    BaseModel <|-- Task
    BaseModel <|-- Comment
    BaseModel <|-- Conversation
    BaseModel <|-- Message
    BaseModel <|-- Notification

    User "1" -- "many" Workspace : owns
    Workspace "1" -- "many" WorkspaceMember : contains
    User "1" -- "many" WorkspaceMember : participates
    Workspace "1" -- "many" WorkspaceInvitation : issues
    Workspace "1" -- "many" Project : organizes
    Project "1" -- "many" Folder : contains
    Project "1" -- "many" TaskList : groups
    Folder "1" -- "many" TaskList : structures
    TaskList "1" -- "many" Task : holds
    Task "1" -- "many" Task : subtasks
    Task "1" -- "many" TaskDependency : blocked_by
    Task "1" -- "many" Comment : discussion
    Workspace "1" -- "many" Conversation : hosts
    Conversation "1" -- "many" Message : exchanges
    Message "1" -- "many" Attachment : includes
    User "1" -- "many" Notification : receives
```

---

## 6. Data Flow Diagrams (DFD)

### 6.1 DFD Level 0 (Context Level Diagram)

```mermaid
flowchart TD
    UserClient["End User / Browser Client"]
    ClerkAuth["Clerk Identity Provider (OAuth)"]
    ResendMail["Resend Email API / SMTP"]
    
    System["TASKFLOW System Core (Port 5000 / 5173)"]

    UserClient -->|"1. User Credentials / Actions / Chat Messages"| System
    System -->|"2. UI State, Real-Time Socket Feeds, JWTs"| UserClient

    System -->|"3. Social Token Verification"| ClerkAuth
    ClerkAuth -->|"4. Verified User Identity & Profile"| System

    System -->|"5. Transactional HTML Email Payloads"| ResendMail
    ResendMail -->|"6. Delivery Receipts & Status Codes"| System
```

### 6.2 DFD Level 1 (Decomposition Diagram)

```mermaid
flowchart TD
    User["End User"]
    
    subgraph Processes ["TaskFlow Core Processes"]
        P1["1.0 Auth & Session Recovery Engine"]
        P2["2.0 Hierarchy & Organization Engine (N-Ary Tree)"]
        P3["3.0 Task Execution & DAG Blocker Engine"]
        P4["4.0 Real-Time Chat & File Upload Engine"]
        P5["5.0 Prefix Search & Autocomplete Engine (Trie)"]
        P6["6.0 Platform Governance & Metrics Engine"]
    end

    subgraph DataStores ["Data Stores"]
        D1[("D1: Users & Sessions")]
        D2[("D2: Workspaces & Projects")]
        D3[("D3: Tasks & DAG Edges")]
        D4[("D4: Messages & Media Files")]
        D5[("D5: Audit & Event Logs")]
    end

    User -->|"Credentials / SSO Callback"| P1
    P1 <-->|"Read / Write Identity"| D1
    P1 -->|"Issue JWT Token"| User

    User -->|"Create / Move Projects"| P2
    P2 <-->|"Traverse / Persist Tree"| D2
    P2 -->|"Render Tree & Breadcrumbs"| User

    User -->|"Manage Tasks & Deadlines"| P3
    P3 <-->|"Validate Cycles & Order"| D3
    P3 -->|"Topological Order & Heap Urgency"| User

    User -->|"Send Messages & Attachments"| P4
    P4 <-->|"Store Messages & Blobs"| D4
    P4 -->|"Broadcast Sockets"| User

    User -->|"Search Query (Ctrl+K)"| P5
    P5 <-->|"Index Tokens"| D2
    P5 <-->|"Index Tasks"| D3
    P5 -->|"Autocomplete Results"| User

    User -->|"Admin Inquiries & Bans"| P6
    P6 <-->|"Telemetry & Security Logs"| D5
    P6 -->|"Metrics Dashboard"| User
```

---

## 7. Critical Workflow Flowcharts

### 7.1 User Authentication & Clerk Session Recovery

```mermaid
flowchart TD
    Start(["User opens /login"]) --> CheckClerk{"Is active Clerk session present in browser?"}
    
    CheckClerk -- Yes --> ShowRecovery["Display 'Already Authenticated' Card (Name & Email)"]
    ShowRecovery --> UserChoice{"User Action"}
    UserChoice -- "Click Continue" --> SyncClerk["Call POST /api/auth/clerk-sync"]
    UserChoice -- "Click Sign Out" --> ClearClerk["Call clerk.signOut() & reset view"]
    
    CheckClerk -- No --> ShowStandard["Render Standard & Social Login Form"]
    ShowStandard --> ActionSelect{"Submit Type"}
    
    ActionSelect -- "Direct Email / Password" --> LocalAuth["POST /api/auth/login"]
    ActionSelect -- "Use Demo Account" --> AutoFill["Auto-populate Lead Architect Credentials"] --> LocalAuth
    ActionSelect -- "Click Google" --> TriggerOAuth["clerk.authenticateWithRedirect('oauth_google')"]
    
    TriggerOAuth --> RedirectGoogle["Redirect to accounts.google.com"]
    RedirectGoogle --> GoogleReturn["Redirect back to /sso-callback"]
    GoogleReturn --> SyncClerk
    
    LocalAuth --> CheckPass{"Credentials Valid?"}
    CheckPass -- Yes --> IssueToken["Issue 7-Day JWT Token"]
    CheckPass -- No --> ShowError["Display Error Alert Banner"]
    
    SyncClerk --> IssueToken
    IssueToken --> EnterApp(["Redirect to /dashboard"])
```

### 7.2 Task Dependency Linking & DAG Cycle Prevention

```mermaid
flowchart TD
    LinkReq(["User requests: Task A depends on Task B"]) --> FetchGraph["Construct Project In-Memory Dependency Graph"]
    FetchGraph --> AddHypotheticalEdge["Temporarily insert directed edge: B -> A"]
    
    AddHypotheticalEdge --> Run3ColorDFS["Execute 3-Color Cycle Detection (White, Gray, Black)"]
    Run3ColorDFS --> HasCycle{"Does back-edge target an active GRAY node?"}
    
    HasCycle -- Yes (Cycle Detected) --> RejectEdge["Revert edge & Return HTTP 400 'Circular dependency detected'"]
    RejectEdge --> AlertUser(["UI shows error: Task cannot depend on itself or its descendants"])
    
    HasCycle -- No (Valid DAG) --> SaveEdge["Persist TaskDependency record in database"]
    SaveEdge --> RunKahns["Execute Kahn's Algorithm on updated DAG"]
    RunKahns --> ComputeSequence["Compute Recommended Execution Sequence"]
    ComputeSequence --> ReturnSuccess(["HTTP 201 Created + Updated Topological Sequence"])
```
