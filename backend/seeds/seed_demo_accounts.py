import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app import create_app
from backend.models.base import db
from backend.models.user import User
from backend.models.workspace import Workspace, WorkspaceMember
from backend.models.project import Project
from backend.models.folder import Folder
from backend.models.task_list import TaskList
from backend.models.task import Task
from backend.models.task_assignee import TaskAssignee
from backend.models.tag import Tag, TaskTag
from backend.models.task_dependency import TaskDependency
from backend.models.comment import Comment
from backend.models.notification import Notification
from backend.models.activity import ActivityLog
from backend.routes.chat_routes import ensure_workspace_default_channel

DEMO_PASSWORD = "TaskflowDemo@2026"

DEMO_CONFIGS = [
    {
        "email": "demo.pm@taskflow.dev",
        "full_name": "Alex Rivera",
        "bio": "Senior Product Manager leading cross-functional teams, roadmap planning, and customer discovery.",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "workspace_name": "Launch Operations",
        "workspace_slug": "launch-operations",
        "workspace_desc": "Central workspace for product launches, customer feedback, and quarterly roadmaps.",
        "projects": [
            {
                "name": "Product Launch",
                "color": "#6366f1",
                "icon": "rocket",
                "folder": "Q4 Release Phase",
                "list": "Core Deliverables",
                "tasks": [
                    {
                        "key": "pm_reqs",
                        "title": "Finalize launch requirements",
                        "description": "Consolidate MVP requirements, feature freeze scope, and go/no-go criteria.",
                        "status": "Completed",
                        "priority": "High",
                        "due_offset_days": -1,
                        "completed": True,
                        "subtasks": ["Draft product specification", "Review with design team", "Stakeholder sign-off"],
                        "tags": ["Launch", "P0"]
                    },
                    {
                        "key": "pm_checklist",
                        "title": "Approve release checklist",
                        "description": "Validate staging deployments, legal signoffs, and security scans.",
                        "status": "Review",
                        "priority": "Urgent",
                        "due_offset_days": 2,
                        "subtasks": ["Staging smoke test", "Legal compliance verification", "Deployment schedule notice"],
                        "tags": ["Launch", "Urgent"],
                        "depends_on": "pm_reqs"
                    },
                    {
                        "key": "pm_milestones",
                        "title": "Assign engineering milestones",
                        "description": "Break down launch roadmap items into sprint-ready tickets with delivery estimates.",
                        "status": "In Progress",
                        "priority": "High",
                        "due_offset_days": 3,
                        "tags": ["Roadmap"]
                    }
                ]
            },
            {
                "name": "Customer Research",
                "color": "#ec4899",
                "icon": "users",
                "list": "User Feedback",
                "tasks": [
                    {
                        "key": "pm_feedback",
                        "title": "Review customer feedback",
                        "description": "Analyze NPS survey responses and top feature requests from pilot customers.",
                        "status": "In Progress",
                        "priority": "Medium",
                        "due_offset_days": 4,
                        "tags": ["Research"]
                    },
                    {
                        "key": "pm_interviews",
                        "title": "Synthesize user interviews",
                        "description": "Extract common usability themes and pain points from 10 enterprise customer interviews.",
                        "status": "Completed",
                        "priority": "Medium",
                        "due_offset_days": -2,
                        "completed": True,
                        "tags": ["Research"]
                    }
                ]
            },
            {
                "name": "Q4 Roadmap",
                "color": "#8b5cf6",
                "icon": "calendar",
                "list": "Strategic Milestones",
                "tasks": [
                    {
                        "key": "pm_deck",
                        "title": "Prepare roadmap presentation",
                        "description": "Draft slides detailing planned initiatives, resource requirements, and timeline.",
                        "status": "To Do",
                        "priority": "High",
                        "due_offset_days": 5,
                        "tags": ["Roadmap", "Strategy"]
                    },
                    {
                        "key": "pm_review",
                        "title": "Approve release checklist",
                        "description": "Conduct executive alignment review with VP of Product and Engineering.",
                        "status": "To Do",
                        "due_offset_days": 7,
                        "priority": "Low",
                        "tags": ["Strategy"]
                    }
                ]
            }
        ],
        "notifications": [
            ("Launch Operations workspace ready", "Your workspace 'Launch Operations' is fully configured and ready for collaboration."),
            ("Release checklist pending review", "Task 'Approve release checklist' is ready for your signoff.")
        ]
    },
    {
        "email": "demo.engineering@taskflow.dev",
        "full_name": "Marcus Chen",
        "bio": "Engineering Lead specializing in distributed systems, backend reliability, and developer velocity.",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        "workspace_name": "Engineering Hub",
        "workspace_slug": "engineering-hub",
        "workspace_desc": "Core engineering repository, architecture reviews, API modernization, and sprint cycles.",
        "projects": [
            {
                "name": "Platform Development",
                "color": "#3b82f6",
                "icon": "terminal",
                "folder": "Backend Services",
                "list": "Auth & Security",
                "tasks": [
                    {
                        "key": "eng_auth",
                        "title": "Implement authentication flow",
                        "description": "Robust JWT token rotation, Clerk webhook synchronization, and OAuth providers.",
                        "status": "Completed",
                        "priority": "Urgent",
                        "due_offset_days": -2,
                        "completed": True,
                        "subtasks": ["Token signing", "OAuth callback handlers", "Session refresh endpoint"],
                        "tags": ["Security", "Backend"]
                    },
                    {
                        "key": "eng_api_val",
                        "title": "Fix API validation",
                        "description": "Enhance request body sanitization and return clean 400 error responses on invalid schemas.",
                        "status": "In Progress",
                        "priority": "High",
                        "due_offset_days": 1,
                        "subtasks": ["Schema validators", "Unit test coverage", "Error payload standardization"],
                        "tags": ["Backend", "Bug"],
                        "depends_on": "eng_auth"
                    },
                    {
                        "key": "eng_db_opt",
                        "title": "Database optimization",
                        "description": "Index foreign keys, optimize query joins for dashboard metrics, and verify connection pooling.",
                        "status": "To Do",
                        "priority": "Medium",
                        "due_offset_days": 4,
                        "tags": ["Database"]
                    }
                ]
            },
            {
                "name": "API Modernization",
                "color": "#06b6d4",
                "icon": "server",
                "list": "REST & Sockets",
                "tasks": [
                    {
                        "key": "eng_pr_review",
                        "title": "Review pull request",
                        "description": "Review PR #142 for real-time WebSocket room subscription handling and socket disconnection cleanups.",
                        "status": "Review",
                        "priority": "High",
                        "due_offset_days": 2,
                        "tags": ["CodeReview"]
                    },
                    {
                        "key": "eng_bench",
                        "title": "Benchmarking latency improvements",
                        "description": "Execute load test suite against API gateway endpoints and verify p99 response times < 80ms.",
                        "status": "To Do",
                        "priority": "Low",
                        "due_offset_days": 6,
                        "tags": ["Performance"]
                    }
                ]
            },
            {
                "name": "Release Sprint",
                "color": "#10b981",
                "icon": "check-circle",
                "list": "Sprint 42",
                "tasks": [
                    {
                        "key": "eng_rc_test",
                        "title": "Release candidate testing",
                        "description": "End-to-end integration and smoke testing on staging environment before production cutover.",
                        "status": "In Progress",
                        "priority": "Urgent",
                        "due_offset_days": 3,
                        "tags": ["QA", "Release"]
                    },
                    {
                        "key": "eng_hotfix",
                        "title": "Deploy staging hotfix",
                        "description": "Patched database pool exhaustion timeout on worker nodes.",
                        "status": "Completed",
                        "priority": "High",
                        "due_offset_days": -1,
                        "completed": True,
                        "tags": ["Hotfix"]
                    }
                ]
            }
        ],
        "notifications": [
            ("PR #142 Ready for Review", "Elena submitted PR #142 for WebSocket subscription handling."),
            ("Sprint 42 Deadline Approaching", "Release candidate testing has an upcoming milestone deadline.")
        ]
    },
    {
        "email": "demo.marketing@taskflow.dev",
        "full_name": "Elena Rostova",
        "bio": "Growth Marketing Lead focusing on multi-channel campaigns, brand awareness, and content creation.",
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        "workspace_name": "Marketing Operations",
        "workspace_slug": "marketing-operations",
        "workspace_desc": "Omnichannel marketing campaigns, social media schedules, and product messaging.",
        "projects": [
            {
                "name": "Campaign Planning",
                "color": "#f59e0b",
                "icon": "target",
                "folder": "Q4 Campaigns",
                "list": "Strategy",
                "tasks": [
                    {
                        "key": "mkt_brief",
                        "title": "Prepare campaign brief",
                        "description": "Define target buyer persona, channel budget split, messaging pillars, and success KPIs.",
                        "status": "Completed",
                        "priority": "High",
                        "due_offset_days": -2,
                        "completed": True,
                        "subtasks": ["Audience segmentation", "Budget allocation", "Creative deliverables list"],
                        "tags": ["Strategy"]
                    },
                    {
                        "key": "mkt_email",
                        "title": "Finalize email campaign",
                        "description": "Design responsive HTML template and write high-conversion copy in Resend.",
                        "status": "Review",
                        "priority": "Urgent",
                        "due_offset_days": 2,
                        "tags": ["Email", "Urgent"],
                        "depends_on": "mkt_brief"
                    }
                ]
            },
            {
                "name": "Social Media",
                "color": "#3b82f6",
                "icon": "share-2",
                "list": "Channels",
                "tasks": [
                    {
                        "key": "mkt_social",
                        "title": "Schedule social posts",
                        "description": "Queue LinkedIn, Twitter/X, and YouTube product announcement threads with rich media.",
                        "status": "In Progress",
                        "priority": "Medium",
                        "due_offset_days": 3,
                        "tags": ["Social"]
                    },
                    {
                        "key": "mkt_teaser",
                        "title": "Produce video teaser snippet",
                        "description": "30-second feature walkthrough highlighting Kanban and Calendar views.",
                        "status": "Completed",
                        "priority": "High",
                        "due_offset_days": -1,
                        "completed": True,
                        "tags": ["Video"]
                    }
                ]
            },
            {
                "name": "Product Marketing",
                "color": "#8b5cf6",
                "icon": "megaphone",
                "list": "Launches",
                "tasks": [
                    {
                        "key": "mkt_content",
                        "title": "Create launch content",
                        "description": "Author launch blog post, changelog release notes, and press release materials.",
                        "status": "In Progress",
                        "priority": "High",
                        "due_offset_days": 1,
                        "tags": ["Content", "Launch"]
                    },
                    {
                        "key": "mkt_analytics",
                        "title": "Review campaign analytics",
                        "description": "Compile open rates, click-throughs, and free trial conversions from the first 48 hours.",
                        "status": "To Do",
                        "priority": "Medium",
                        "due_offset_days": 5,
                        "tags": ["Analytics"]
                    }
                ]
            }
        ],
        "notifications": [
            ("Campaign Brief Approved", "Your Q4 campaign brief was approved by marketing leadership."),
            ("Email Template in Review", "Email campaign preview is ready for final signoff.")
        ]
    },
    {
        "email": "demo.design@taskflow.dev",
        "full_name": "Chloe Bennett",
        "bio": "Principal Product Designer dedicated to intuitive UX, accessible design systems, and visual elegance.",
        "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        "workspace_name": "Creative Studio",
        "workspace_slug": "creative-studio",
        "workspace_desc": "Design system tokens, web illustrations, dashboard prototypes, and responsive UI components.",
        "projects": [
            {
                "name": "Website Redesign",
                "color": "#ec4899",
                "icon": "palette",
                "folder": "Design Iterations",
                "list": "Figma Mockups",
                "tasks": [
                    {
                        "key": "des_wireframes",
                        "title": "Create dashboard wireframes",
                        "description": "Lo-fi wireframes for multi-workspace navigation and analytics radar widgets.",
                        "status": "Completed",
                        "priority": "High",
                        "due_offset_days": -2,
                        "completed": True,
                        "subtasks": ["Workspace switcher layout", "Card component tokens", "Mobile navigation drawer"],
                        "tags": ["Figma", "UI/UX"]
                    },
                    {
                        "key": "des_assets",
                        "title": "Prepare landing page assets",
                        "description": "Vector SVG illustrations, product screenshots, and interactive widgets.",
                        "status": "In Progress",
                        "priority": "Urgent",
                        "due_offset_days": 2,
                        "tags": ["Design", "Urgent"],
                        "depends_on": "des_wireframes"
                    }
                ]
            },
            {
                "name": "Brand Assets",
                "color": "#f43f5e",
                "icon": "image",
                "list": "Identity",
                "tasks": [
                    {
                        "key": "des_ds_review",
                        "title": "Review design system",
                        "description": "Harmonize color palettes, spacing scales, and dark mode tokens across all pages.",
                        "status": "Review",
                        "priority": "Medium",
                        "due_offset_days": 3,
                        "tags": ["DesignSystem"]
                    },
                    {
                        "key": "des_export",
                        "title": "Export production assets",
                        "description": "Export 1x, 2x, and 3x web-optimized graphics and icon sets for development handoff.",
                        "status": "To Do",
                        "priority": "High",
                        "due_offset_days": 4,
                        "tags": ["Assets"]
                    }
                ]
            },
            {
                "name": "Product UI",
                "color": "#6366f1",
                "icon": "layout",
                "list": "Components",
                "tasks": [
                    {
                        "key": "des_mobile",
                        "title": "Finalize mobile layouts",
                        "description": "Ensure responsive hamburger navigation and touch-friendly Kanban cards on all breakpoints.",
                        "status": "In Progress",
                        "priority": "High",
                        "due_offset_days": 1,
                        "tags": ["Mobile", "Responsive"]
                    },
                    {
                        "key": "des_dark_tokens",
                        "title": "Dark mode token verification",
                        "description": "Check WCAG contrast ratios across slate-900 surfaces and interactive buttons.",
                        "status": "Completed",
                        "priority": "Low",
                        "due_offset_days": -3,
                        "completed": True,
                        "tags": ["Accessibility"]
                    }
                ]
            }
        ],
        "notifications": [
            ("Design Token Review Requested", "Marcus requested verification of dark mode border contrast tokens."),
            ("Asset Handoff Due Soon", "Production exports are due in 48 hours for engineering handoff.")
        ]
    },
    {
        "email": "demo.member@taskflow.dev",
        "full_name": "Jordan Taylor",
        "bio": "Full-stack Software Engineer focused on feature implementation, automated testing, and documentation.",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        "workspace_name": "Team Workspace",
        "workspace_slug": "team-workspace",
        "workspace_desc": "Individual tasks, personal sprint tracking, runbooks, and team operations.",
        "projects": [
            {
                "name": "Sprint Tasks",
                "color": "#10b981",
                "icon": "check-square",
                "folder": "Sprint 42",
                "list": "Current Cycle",
                "tasks": [
                    {
                        "key": "mem_sprint_task",
                        "title": "Complete assigned sprint task",
                        "description": "Finish subtask checklist and write unit tests for request body validation utility.",
                        "status": "In Progress",
                        "priority": "High",
                        "due_offset_days": 1,
                        "subtasks": ["Write test assertions", "Implement helper function", "Push feature branch"],
                        "tags": ["Sprint", "Code"]
                    },
                    {
                        "key": "mem_status_update",
                        "title": "Update task status",
                        "description": "Mark sprint tickets as ready for QA testing and document edge case behaviors.",
                        "status": "Completed",
                        "priority": "Medium",
                        "due_offset_days": -1,
                        "completed": True,
                        "tags": ["Sprint"]
                    }
                ]
            },
            {
                "name": "Documentation",
                "color": "#06b6d4",
                "icon": "book-open",
                "list": "Guides",
                "tasks": [
                    {
                        "key": "mem_docs",
                        "title": "Update documentation",
                        "description": "Document WebSocket authentication headers and Resend API environment settings.",
                        "status": "Review",
                        "priority": "Medium",
                        "due_offset_days": 2,
                        "tags": ["Docs"],
                        "depends_on": "mem_status_update"
                    },
                    {
                        "key": "mem_runbook",
                        "title": "Draft troubleshooting runbook",
                        "description": "Write step-by-step resolution steps for common deployment issues and local setup errors.",
                        "status": "To Do",
                        "priority": "Low",
                        "due_offset_days": 5,
                        "tags": ["Docs", "Runbook"]
                    }
                ]
            },
            {
                "name": "Team Operations",
                "color": "#8b5cf6",
                "icon": "clock",
                "list": "Routines",
                "tasks": [
                    {
                        "key": "mem_planning",
                        "title": "Attend planning meeting",
                        "description": "Bi-weekly sprint planning session, velocity review, and backlog grooming.",
                        "status": "To Do",
                        "priority": "Normal",
                        "due_offset_days": 1,
                        "tags": ["Meeting"]
                    },
                    {
                        "key": "mem_checklist",
                        "title": "Review project checklist",
                        "description": "Completed quarterly security training and verified local development environment configs.",
                        "status": "Completed",
                        "priority": "Low",
                        "due_offset_days": -4,
                        "completed": True,
                        "tags": ["Operations"]
                    }
                ]
            }
        ],
        "notifications": [
            ("Sprint 42 Task Assigned", "Marcus assigned task 'Complete assigned sprint task' to you."),
            ("Team Planning Tomorrow", "Sprint planning meeting is scheduled for tomorrow at 10:00 AM.")
        ]
    }
]


def seed_all_demo_accounts(verbose: bool = True):
    """
    Idempotently seeds all 5 professional demo accounts with realistic,
    differentiated workspaces, projects, task trees, priorities, deadlines,
    dependencies, tags, notifications, and activity logs.
    """
    now = datetime.now(timezone.utc)
    seeded_users = {}
    created_tasks_by_key = {}

    if verbose:
        print("[SEED] Starting idempotent seeding for 5 TaskFlow demo accounts...")

    # Phase 1: Create or update the 5 demo users
    for config in DEMO_CONFIGS:
        email = config["email"].lower()
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                email=email,
                full_name=config["full_name"],
                bio=config["bio"],
                avatar_url=config["avatar_url"],
                is_verified=True,
                is_active=True
            )
            user.set_password(DEMO_PASSWORD)
            db.session.add(user)
            db.session.flush()
            if verbose:
                print(f"[SEED] Created demo user: {user.full_name} <{user.email}> (ID: {user.id})")
        else:
            # Ensure password and details are up to date
            user.set_password(DEMO_PASSWORD)
            user.is_verified = True
            user.is_active = True
            user.full_name = config["full_name"]
            user.bio = config["bio"]
            user.avatar_url = config["avatar_url"]
            db.session.flush()
            if verbose:
                print(f"[SEED] Updated demo user: {user.full_name} <{user.email}> (ID: {user.id})")

        seeded_users[email] = user

    db.session.commit()

    # Phase 2: Create primary workspaces & sample projects/tasks
    for config in DEMO_CONFIGS:
        user = seeded_users[config["email"].lower()]
        ws_name = config["workspace_name"]
        ws_slug = config["workspace_slug"]

        ws = Workspace.query.filter_by(slug=ws_slug).first()
        if not ws:
            ws = Workspace(
                name=ws_name,
                slug=ws_slug,
                description=config["workspace_desc"],
                owner_id=user.id
            )
            db.session.add(ws)
            db.session.flush()
            if verbose:
                print(f"[SEED] Created workspace: '{ws.name}' (ID: {ws.id})")

        # Ensure Owner membership
        member = WorkspaceMember.query.filter_by(workspace_id=ws.id, user_id=user.id).first()
        if not member:
            member = WorkspaceMember(
                workspace_id=ws.id,
                user_id=user.id,
                role='Owner'
            )
            db.session.add(member)
            db.session.flush()

        # Ensure default #general chat channel exists
        try:
            ensure_workspace_default_channel(ws.id)
        except Exception:
            pass

        # Populate Projects and Tasks
        for p_idx, p_data in enumerate(config["projects"]):
            project = Project.query.filter_by(workspace_id=ws.id, name=p_data["name"]).first()
            if not project:
                project = Project(
                    workspace_id=ws.id,
                    name=p_data["name"],
                    description=f"{p_data['name']} for {ws.name}",
                    color=p_data.get("color", "#6366f1"),
                    icon=p_data.get("icon", "folder"),
                    status="Active",
                    creator_id=user.id
                )
                db.session.add(project)
                db.session.flush()

            # Optional Folder
            folder_id = None
            if "folder" in p_data:
                folder = Folder.query.filter_by(project_id=project.id, name=p_data["folder"]).first()
                if not folder:
                    folder = Folder(
                        project_id=project.id,
                        name=p_data["folder"],
                        color=p_data.get("color", "#6366f1"),
                        position=0
                    )
                    db.session.add(folder)
                    db.session.flush()
                folder_id = folder.id

            # TaskList
            list_name = p_data.get("list", "General Tasks")
            task_list = TaskList.query.filter_by(project_id=project.id, name=list_name).first()
            if not task_list:
                task_list = TaskList(
                    project_id=project.id,
                    folder_id=folder_id,
                    name=list_name,
                    position=p_idx
                )
                db.session.add(task_list)
                db.session.flush()

            # Tasks
            for t_idx, t_data in enumerate(p_data["tasks"]):
                task = Task.query.filter_by(project_id=project.id, title=t_data["title"]).first()
                due_date = now + timedelta(days=t_data.get("due_offset_days", 2))
                start_date = due_date - timedelta(days=3)

                if not task:
                    task = Task(
                        project_id=project.id,
                        task_list_id=task_list.id,
                        creator_id=user.id,
                        title=t_data["title"],
                        description=t_data["description"],
                        status=t_data["status"],
                        priority=t_data["priority"],
                        start_date=start_date,
                        due_date=due_date,
                        position=t_idx
                    )
                    if t_data.get("completed"):
                        task.completed_at = now - timedelta(hours=6)
                    db.session.add(task)
                    db.session.flush()

                    # Assign task to user
                    db.session.add(TaskAssignee(task_id=task.id, user_id=user.id))

                    # Subtasks
                    for sub_idx, sub_title in enumerate(t_data.get("subtasks", [])):
                        subtask = Task(
                            project_id=project.id,
                            parent_task_id=task.id,
                            task_list_id=task_list.id,
                            creator_id=user.id,
                            title=sub_title,
                            status="Completed" if t_data.get("completed") else ("In Progress" if sub_idx == 0 else "To Do"),
                            priority=t_data["priority"],
                            position=sub_idx
                        )
                        db.session.add(subtask)

                    # Tags
                    for tag_name in t_data.get("tags", []):
                        tag = Tag.query.filter_by(workspace_id=ws.id, name=tag_name).first()
                        if not tag:
                            tag = Tag(workspace_id=ws.id, name=tag_name, color=p_data.get("color", "#6366f1"))
                            db.session.add(tag)
                            db.session.flush()
                        db.session.add(TaskTag(task_id=task.id, tag_id=tag.id))

                    # Initial comment
                    db.session.add(Comment(
                        task_id=task.id,
                        user_id=user.id,
                        content=f"Initial planning and requirements verified for '{task.title}'."
                    ))

                    # Activity log
                    db.session.add(ActivityLog(
                        workspace_id=ws.id,
                        project_id=project.id,
                        task_id=task.id,
                        user_id=user.id,
                        action='task_created',
                        details={'title': task.title, 'priority': task.priority, 'status': task.status}
                    ))

                created_tasks_by_key[t_data.get("key", f"{project.id}_{t_idx}")] = task

        # Seed Notifications
        for n_title, n_msg in config.get("notifications", []):
            existing_notif = Notification.query.filter_by(user_id=user.id, title=n_title).first()
            if not existing_notif:
                db.session.add(Notification(
                    user_id=user.id,
                    type="task_assigned",
                    title=n_title,
                    message=n_msg,
                    is_read=False
                ))

    # Phase 3: Wire task dependencies
    for config in DEMO_CONFIGS:
        for p_data in config["projects"]:
            for t_data in p_data["tasks"]:
                dep_key = t_data.get("depends_on")
                current_key = t_data.get("key")
                if dep_key and dep_key in created_tasks_by_key and current_key in created_tasks_by_key:
                    task = created_tasks_by_key[current_key]
                    dep_task = created_tasks_by_key[dep_key]
                    existing_dep = TaskDependency.query.filter_by(
                        task_id=task.id,
                        depends_on_task_id=dep_task.id
                    ).first()
                    if not existing_dep:
                        db.session.add(TaskDependency(
                            task_id=task.id,
                            depends_on_task_id=dep_task.id,
                            dependency_type='waiting_on'
                        ))
                        if verbose:
                            print(f"[SEED] Linked dependency: '{task.title}' waits on '{dep_task.title}'")

    # Phase 4: Cross-workspace memberships demonstrating Owner / Admin / Member hierarchy
    # 1. Marcus Chen (Engineering Lead) is Admin in Alex Rivera's "Launch Operations"
    launch_ws = Workspace.query.filter_by(slug="launch-operations").first()
    eng_user = seeded_users.get("demo.engineering@taskflow.dev")
    if launch_ws and eng_user:
        admin_member = WorkspaceMember.query.filter_by(workspace_id=launch_ws.id, user_id=eng_user.id).first()
        if not admin_member:
            db.session.add(WorkspaceMember(
                workspace_id=launch_ws.id,
                user_id=eng_user.id,
                role='Admin'
            ))
            if verbose:
                print(f"[SEED] Added Marcus Chen as Admin in '{launch_ws.name}'")

    # 2. Jordan Taylor (Team Member) is Member in Marcus Chen's "Engineering Hub"
    eng_ws = Workspace.query.filter_by(slug="engineering-hub").first()
    team_member_user = seeded_users.get("demo.member@taskflow.dev")
    if eng_ws and team_member_user:
        member_record = WorkspaceMember.query.filter_by(workspace_id=eng_ws.id, user_id=team_member_user.id).first()
        if not member_record:
            db.session.add(WorkspaceMember(
                workspace_id=eng_ws.id,
                user_id=team_member_user.id,
                role='Member'
            ))
            if verbose:
                print(f"[SEED] Added Jordan Taylor as Member in '{eng_ws.name}'")

    db.session.commit()

    # Phase 5: Seed professional team chat conversations & sample attachments
    try:
        from backend.seeds.seed_demo_chat import seed_demo_chat
        seed_demo_chat(verbose=verbose)
    except Exception as e:
        if verbose:
            print(f"[SEED] Chat seeding warning: {e}")

    if verbose:
        print("[SEED] Successfully completed idempotent seeding for all 5 demo accounts!")


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        seed_all_demo_accounts(verbose=True)
