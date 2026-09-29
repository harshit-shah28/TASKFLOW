# TASKFLOW — Modern Full-Stack Project Management SaaS

![TaskFlow Logo](frontend/public/logo.svg)

**TASKFLOW** is an all-in-one Project, Task, Team, and Productivity Management platform inspired by the workflow and depth of modern commercial SaaS systems. Built with **React 19 + Vite + Tailwind CSS** on the frontend, **Python Flask + SQLAlchemy ORM + JWT** on the backend, and **7 custom Data Structures & Algorithms (DSA)** integrated throughout the core architecture.

---

## 🌟 Key Features

### 1. Multi-Tier Workspace & Project Hierarchy
- **Hierarchy:** `Workspace → Spaces / Projects → Folders → Task Lists → Tasks → Subtasks`
- Dynamic workspace switcher and multi-tenant member permissions.
- Project archiving, color palettes, milestone tracking, and task completion percentages.

### 2. Rich Task Management
- **Fields:** Title, Rich Description, Status, Priority, Start Date, Due Date, Estimated Hours, Actual Hours, Assignees, Tags, Subtasks, Blockers/Dependencies.
- **Statuses:** `To Do`, `In Progress`, `Review`, `Blocked`, `Completed`.
- **Priorities:** `Urgent` (Critical), `High`, `Normal`, `Low`.
- **Interactive Views:**
  - 📋 **List View:** Multi-attribute filtering, sorting via custom MergeSort, search, and inline completion checkboxes.
  - 📊 **Kanban Board:** 5 status columns, interactive card moving, priority flags, and assignee avatars.
  - 📅 **Calendar View:** Monthly scheduling grid displaying tasks by due dates.
  - 🌳 **Hierarchy Tree View:** Live visual rendering of the N-Ary tree data structure.
  - 🔗 **Dependency Graph View:** Directed Acyclic Graph (DAG) cycle validation and Kahn's topological sort sequence.

### 3. Real Email & In-App Notification System
- **Dual Notification Engine:** Dispatches both in-app notification center alerts and responsive HTML emails to registered user addresses.
- **Transactional HTML Email Templates:**
  - Welcome & Onboarding
  - Email Verification Token Links
  - Password Reset Request & Confirmation
  - Task Assignment & Reassignment
  - Task Comments & @Mentions
  - Due Date & Overdue Deadline Alerts
  - Workspace Team Invitations
- **Email Preferences:** Granular user controls in *Settings → Email Preferences*.
- **SMTP Diagnostics & Audit Logs:** Built-in connection tester and audit trail in *Settings → SMTP & Diagnostics*.

### 4. Enterprise Authentication & Security
- Secure password hashing using **Werkzeug Scrypt** (no plaintext storage).
- **JWT Authentication** with configurable expiration.
- Cryptographic single-use tokens for email verification and password reset.
- Role-based authorization (`Owner`, `Admin`, `Member`, `Viewer`) enforced on every protected backend route.
- Complete Google and GitHub OAuth 2.0 integration architecture with automated account linking.

### 5. 7 Custom Academic DSA Modules
1. **N-Ary Tree:** Manages arbitrary-depth project and folder hierarchies.
2. **Trie (Prefix Tree):** Powers the instant $O(k)$ global topbar search (Ctrl+K).
3. **Custom Hash Map:** Separate chaining table with dynamic doubling rehashing for in-memory entity lookups.
4. **Priority Queue (Binary Heap):** Max-Heap for prioritizing urgent tasks and deadlines.
5. **FIFO Event Queue:** Thread-safe buffer for notifications and activity stream events.
6. **Dependency Graph (DAG):** Prevents circular task deadlock cycles and computes topological execution orders.
7. **Custom Sorting (MergeSort & QuickSort):** Multi-attribute task list sorting.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 8, React Router v7, Axios, Tailwind CSS v4, Lucide React, Recharts.
- **Backend:** Python 3.13, Flask 3.1, Flask-SQLAlchemy, Flask-CORS, Flask-JWT-Extended, Werkzeug, Python-Dotenv, Requests.
- **Database:** SQLite (development default) / PostgreSQL ready.
- **Email:** SMTP / Transactional Email Provider (configurable via `.env`).

---

## 📁 Project Structure

```text
TASKFLOW/
├── backend/
│   ├── app.py                      # Flask factory, blueprint registration & DB init
│   ├── config.py                   # Environment & database settings
│   ├── requirements.txt            # Python dependencies
│   ├── test_backend.py             # Backend & DB verification test
│   ├── test_dsa.py                 # 7 DSA modules test suite
│   ├── test_api_endpoints.py       # End-to-end API integration tests
│   ├── models/                     # SQLAlchemy relational models
│   │   ├── base.py, user.py, token.py, workspace.py, project.py,
│   │   ├── folder.py, task_list.py, task.py, task_assignee.py,
│   │   ├── tag.py, task_dependency.py, comment.py, notification.py,
│   │   ├── activity.py, email_log.py
│   ├── routes/                     # Flask REST Blueprints
│   │   ├── auth_routes.py, oauth_routes.py, user_routes.py,
│   │   ├── workspace_routes.py, project_routes.py, folder_routes.py,
│   │   ├── list_routes.py, task_routes.py, comment_routes.py,
│   │   ├── notification_routes.py, search_routes.py,
│   │   ├── dashboard_routes.py, activity_routes.py,
│   │   ├── email_routes.py, dsa_routes.py
│   ├── services/                   # Business logic layer
│   │   ├── email_service.py, notification_service.py, activity_service.py
│   ├── dsa/                        # 7 Custom DSA Data Structures
│   │   ├── n_ary_tree.py, trie.py, hash_map.py, priority_queue.py,
│   │   ├── event_queue.py, dependency_graph.py, sorting_utils.py
│   └── utils/                      # Response helpers, validators & HTML email templates
│
├── frontend/
│   ├── index.html                  # HTML entry with Plus Jakarta Sans
│   ├── vite.config.js              # Vite config with React & API proxy
│   ├── package.json                # Frontend dependencies
│   └── src/
│       ├── main.jsx, App.jsx, index.css
│       ├── layouts/AppLayout.jsx   # Topbar + Sidebar SaaS shell
│       ├── components/             # Navbar, Sidebar, Modals, Skeletons, Toasts
│       ├── pages/                  # Landing, Login, Register, Dashboard, Project, etc.
│       ├── context/                # AuthContext, ThemeContext, NotificationContext
│       └── services/api.js         # Axios client with JWT interceptor
│
├── database/                       # Local SQLite database (taskflow.db)
├── docs/DSA_ARCHITECTURE.md        # Comprehensive DSA documentation
├── .env.example                    # Documented environment template
└── .gitignore                      # Git safety rules
```

---

## 🚀 Beginner Quick-Start Guide

Follow these exact steps to run TaskFlow locally.

### Prerequisites
- **Python:** 3.10+ installed
- **Node.js:** v18+ installed

---

### Step 1: Clone & Configure Environment

1. Navigate to the project root:
   ```powershell
   cd "e:\Project Management"
   ```

2. The development `.env` is already created with safe local defaults. If creating a new one, copy `.env.example`:
   ```powershell
   copy .env.example .env
   ```

---

### Step 2: Run the Backend (Flask API)

1. Open a terminal and run:
   ```powershell
   # Activate virtual environment and run the server
   .\backend\venv\Scripts\python backend\app.py
   ```
2. You will see:
   ```text
   * Running on http://127.0.0.1:5000
   * Application API available at http://localhost:5000/api
   ```

---

### Step 3: Run the Frontend (React + Vite)

1. Open a **second terminal window** and run:
   ```powershell
   cd "e:\Project Management\frontend"
   npm run dev
   ```
2. You will see:
   ```text
   VITE v8.3.1 ready in 250 ms
   ➜  Local:   http://localhost:5173/
   ```
3. Open `http://localhost:5173` in your browser.

---

### Step 4: Login with Demo Account

On the Sign In page (`http://localhost:5173/login`), click the **"Use Demo Account"** button or enter:
- **Email:** `lead_architect@taskflow.dev`
- **Password:** `StrongPassword123!`

---

## 📧 Real Email (SMTP) Configuration

To send actual emails to real user inboxes (Gmail, SendGrid, Brevo, Mailgun):

1. Open `.env` and fill in your SMTP details:
   ```env
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USE_SSL=False
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-character-app-password
   MAIL_FROM=TaskFlow <your-email@gmail.com>
   ```
   *(For Gmail, generate an App Password in your Google Account under Security → 2-Step Verification → App passwords).*

2. Restart the backend server.
3. In TaskFlow, go to **Settings → SMTP & Diagnostics** and click **"Send Test"** to verify live email delivery!

*Note: If SMTP is not configured, TaskFlow will gracefully log delivery attempts in the database without failing any user actions.*

---

## 🔑 Google & GitHub OAuth Setup (Optional)

1. **Google OAuth:**
   - Go to Google Cloud Console → APIs & Services → Credentials.
   - Create an OAuth 2.0 Client ID with Authorized redirect URI: `http://localhost:5000/api/auth/oauth/google/callback`.
   - Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

2. **GitHub OAuth:**
   - Go to GitHub Settings → Developer Settings → OAuth Apps.
   - Set Authorization callback URL to: `http://localhost:5000/api/auth/oauth/github/callback`.
   - Put `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`.

---

## 🧪 Running Automated Tests

Run the backend verification suite:
```powershell
# 1. Test database models & password hashing
.\backend\venv\Scripts\python backend\test_backend.py

# 2. Test all 7 custom DSA modules
.\backend\venv\Scripts\python backend\test_dsa.py

# 3. Test full end-to-end API endpoints
.\backend\venv\Scripts\python backend\test_api_endpoints.py
```
All tests should report: `[OK]` with zero failures!

---

## 💡 Troubleshooting

- **CORS Error:** Ensure frontend is running on `http://localhost:5173`. CORS origins are configured in `backend/config.py`.
- **Database Lock:** If SQLite throws a lock error, ensure no other background process is holding a transaction open.
- **Port Conflict:** If port 5000 is occupied, set `PORT=5001` in `.env` and update the proxy in `frontend/vite.config.js`.
