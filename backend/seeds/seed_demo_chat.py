import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.models.base import db
from backend.models.user import User
from backend.models.workspace import Workspace, WorkspaceMember
from backend.models.chat import Conversation, ConversationMember, Message, Attachment
from backend.routes.chat_routes import ensure_workspace_default_channel
from backend.config import Config


# Minimal valid binary assets for sample attachments
MINIMAL_PNG = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06'
    b'\x00\x00\x00\x1f\xf3\xffa\x00\x00\x00\x19IDATx\x9cc\xfc\xff\xff?\x03\x10'
    b'\x00\x00\x06\x82\x02\xa1\x18\x9f^\xad\x00\x00\x00\x00IEND\xaeB`\x82'
)

MINIMAL_PDF = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 400 200]/Parent 2 0 R/Resources<<>>>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n"
    b"0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n"
)

SAMPLE_CHECKLIST_TXT = (
    "TaskFlow Q4 Staging Deployment & Release Checklist\n"
    "===================================================\n"
    "[x] Clerk OAuth & SSO Authentication verification\n"
    "[x] Database migrations & schema consistency\n"
    "[x] WebSocket / Socket.IO real-time bidirectional messaging\n"
    "[x] Multi-tenancy & workspace access control\n"
    "[x] Assignee avatar alignment & typography audit\n"
    "[x] Real email delivery integration via Resend\n"
    "[ ] Final production DNS cutover & smoke test\n"
).encode('utf-8')


def ensure_sample_asset(filename: str, content: bytes) -> str:
    """Ensure a sample file exists in upload folder and return storage filename."""
    upload_dir = Path(Config.UPLOAD_FOLDER)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    if not file_path.exists():
        with open(file_path, 'wb') as f:
            f.write(content)
    return filename


def seed_demo_chat(verbose: bool = True):
    """
    Idempotently seed professional team chat conversations and realistic message threads
    for the 5 demo accounts.
    """
    # 1. Look up all 5 demo users
    emails = [
        "demo.pm@taskflow.dev",          # Alex Rivera (PM)
        "demo.engineering@taskflow.dev", # Marcus Chen (Lead Architect / Senior Eng)
        "demo.marketing@taskflow.dev",   # Sarah Jenkins (Marketing Lead)
        "demo.design@taskflow.dev",      # Maya Lin (Product Designer)
        "demo.member@taskflow.dev",      # Jordan Taylor (QA / Junior Dev)
    ]
    users = {u.email: u for u in User.query.filter(User.email.in_(emails)).all()}
    if len(users) < 5:
        if verbose:
            print(f"[CHAT SEED] Warning: Expected 5 demo users, found {len(users)}. Please run seed_demo_accounts first.")
        return

    pm = users["demo.pm@taskflow.dev"]
    eng = users["demo.engineering@taskflow.dev"]
    mkt = users["demo.marketing@taskflow.dev"]
    des = users["demo.design@taskflow.dev"]
    mem = users["demo.member@taskflow.dev"]

    # 2. Find core workspaces
    launch_ws = Workspace.query.filter_by(slug="launch-operations").first()
    if not launch_ws:
        launch_ws = Workspace.query.filter_by(name="Launch Operations").first()

    eng_ws = Workspace.query.filter_by(slug="engineering-hub").first()
    if not eng_ws:
        eng_ws = Workspace.query.filter_by(name="Engineering Hub").first()

    if not launch_ws:
        if verbose:
            print("[CHAT SEED] 'Launch Operations' workspace not found. Aborting chat seed.")
        return

    # 3. Ensure cross-functional team membership in Launch Operations (Flagship workspace)
    launch_memberships = [
        (pm, 'Owner'),
        (eng, 'Admin'),
        (des, 'Member'),
        (mkt, 'Member'),
        (mem, 'Member'),
    ]
    for u, role in launch_memberships:
        wm = WorkspaceMember.query.filter_by(workspace_id=launch_ws.id, user_id=u.id).first()
        if not wm:
            db.session.add(WorkspaceMember(workspace_id=launch_ws.id, user_id=u.id, role=role))
            if verbose:
                print(f"[CHAT SEED] Added {u.full_name} ({role}) to {launch_ws.name}")
    db.session.commit()

    # 4. Ensure engineering team membership in Engineering Hub
    if eng_ws:
        eng_memberships = [
            (eng, 'Owner'),
            (pm, 'Admin'),
            (mem, 'Member'),
            (des, 'Member'),
        ]
        for u, role in eng_memberships:
            wm = WorkspaceMember.query.filter_by(workspace_id=eng_ws.id, user_id=u.id).first()
            if not wm:
                db.session.add(WorkspaceMember(workspace_id=eng_ws.id, user_id=u.id, role=role))
        db.session.commit()

    # 5. Ensure #general default channels exist and have members
    ensure_workspace_default_channel(launch_ws.id)
    if eng_ws:
        ensure_workspace_default_channel(eng_ws.id)

    # Prepare sample assets on disk
    spec_pdf_path = ensure_sample_asset("demo_ui_design_spec_v2.pdf", MINIMAL_PDF)
    tokens_png_path = ensure_sample_asset("demo_design_system_tokens.png", MINIMAL_PNG)
    checklist_txt_path = ensure_sample_asset("demo_staging_readiness_checklist.txt", SAMPLE_CHECKLIST_TXT)

    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------
    # 6. Seed Launch Operations #general Channel Messages
    # -------------------------------------------------------------
    launch_gen = Conversation.query.filter_by(
        workspace_id=launch_ws.id,
        type='channel',
        name='general'
    ).first()

    if launch_gen:
        gen_messages = [
            {
                "sender": pm,
                "content": "Welcome team to the Q4 Launch sprint! We're targeting release readiness by Friday. Please make sure all blocker items are tagged with P0/Launch.",
                "created_at": now - timedelta(hours=36),
                "attachment": None
            },
            {
                "sender": eng,
                "content": "Backend services and migration scripts are verified. Staging smoke tests passed and API latency is consistently under 35ms.",
                "created_at": now - timedelta(hours=28),
                "attachment": None
            },
            {
                "sender": des,
                "content": "Design system tokens and responsive layouts are locked in. I've attached the finalized UI design specification sheet for everyone to review.",
                "created_at": now - timedelta(hours=20),
                "attachment": {
                    "original_name": "ui_design_spec_v2.pdf",
                    "storage_path": spec_pdf_path,
                    "file_type": "document",
                    "mime_type": "application/pdf",
                    "file_size": len(MINIMAL_PDF)
                }
            },
            {
                "sender": mkt,
                "content": "Landing page copy and launch customer announcements are finalized. Everything is scheduled for Thursday's dry run.",
                "created_at": now - timedelta(hours=14),
                "attachment": None
            },
            {
                "sender": mem,
                "content": "Automated regression test suite has been executed on staging. 100% of the critical path tests (auth, tasks, chat, notifications) are passing cleanly!",
                "created_at": now - timedelta(hours=6),
                "attachment": None
            },
            {
                "sender": pm,
                "content": "Outstanding work everyone! Let's keep async updates flowing here and use direct chats for 1-on-1 coordination.",
                "created_at": now - timedelta(hours=1, minutes=15),
                "attachment": None
            }
        ]

        latest_launch_msg_id = None
        for g_data in gen_messages:
            msg = Message.query.filter_by(
                conversation_id=launch_gen.id,
                sender_id=g_data["sender"].id,
                content=g_data["content"]
            ).first()

            if not msg:
                msg = Message(
                    conversation_id=launch_gen.id,
                    sender_id=g_data["sender"].id,
                    content=g_data["content"],
                    message_type='text' if not g_data.get("attachment") else 'file',
                    created_at=g_data["created_at"],
                    updated_at=g_data["created_at"]
                )
                db.session.add(msg)
                db.session.flush()

                if g_data.get("attachment"):
                    att_data = g_data["attachment"]
                    att = Attachment(
                        message_id=msg.id,
                        conversation_id=launch_gen.id,
                        uploader_id=g_data["sender"].id,
                        original_name=att_data["original_name"],
                        storage_path=att_data["storage_path"],
                        file_type=att_data["file_type"],
                        mime_type=att_data["mime_type"],
                        file_size=att_data["file_size"],
                        created_at=g_data["created_at"]
                    )
                    db.session.add(att)
                    db.session.flush()

            latest_launch_msg_id = msg.id

        if latest_launch_msg_id:
            launch_gen.last_message_at = now - timedelta(hours=1, minutes=15)
            # Update member read states
            for cm in launch_gen.members:
                if cm.user_id == pm.id:
                    cm.last_read_message_id = latest_launch_msg_id
                    cm.last_read_at = now - timedelta(hours=1)
                else:
                    # Others have read up to the 5th message, leaving latest unread for realistic demo badge
                    cm.last_read_message_id = max(1, latest_launch_msg_id - 1)
                    cm.last_read_at = now - timedelta(hours=2)

        db.session.commit()

    # -------------------------------------------------------------
    # 7. Seed Engineering Hub #general Channel Messages
    # -------------------------------------------------------------
    if eng_ws:
        eng_gen = Conversation.query.filter_by(
            workspace_id=eng_ws.id,
            type='channel',
            name='general'
        ).first()

        if eng_gen:
            eng_messages = [
                {
                    "sender": eng,
                    "content": "Engineering sprint kickoff: primary focus is WebSocket real-time stability, index tuning, and Clerk auth session synchronization.",
                    "created_at": now - timedelta(hours=30),
                },
                {
                    "sender": mem,
                    "content": "Benchmarked the Socket.IO heartbeat and reconnect logic under simulated network throttling. Zero dropped frames and graceful reconnect verified.",
                    "created_at": now - timedelta(hours=22),
                },
                {
                    "sender": pm,
                    "content": "Awesome progress Marcus & Jordan. Client team is excited for the performance boost.",
                    "created_at": now - timedelta(hours=10),
                }
            ]

            latest_eng_msg_id = None
            for e_data in eng_messages:
                msg = Message.query.filter_by(
                    conversation_id=eng_gen.id,
                    sender_id=e_data["sender"].id,
                    content=e_data["content"]
                ).first()

                if not msg:
                    msg = Message(
                        conversation_id=eng_gen.id,
                        sender_id=e_data["sender"].id,
                        content=e_data["content"],
                        message_type='text',
                        created_at=e_data["created_at"],
                        updated_at=e_data["created_at"]
                    )
                    db.session.add(msg)
                    db.session.flush()
                latest_eng_msg_id = msg.id

            if latest_eng_msg_id:
                eng_gen.last_message_at = now - timedelta(hours=10)
                for cm in eng_gen.members:
                    cm.last_read_message_id = latest_eng_msg_id
                    cm.last_read_at = now - timedelta(hours=9)
            db.session.commit()

    # -------------------------------------------------------------
    # Helper to create/find direct conversation
    # -------------------------------------------------------------
    def get_or_create_direct_conv(workspace_id: int, user_a: User, user_b: User) -> Conversation:
        existing = (
            db.session.query(Conversation)
            .join(ConversationMember, Conversation.id == ConversationMember.conversation_id)
            .filter(
                Conversation.workspace_id == workspace_id,
                Conversation.type == 'direct',
                ConversationMember.user_id == user_a.id
            )
            .all()
        )
        for ec in existing:
            other = ConversationMember.query.filter_by(
                conversation_id=ec.id,
                user_id=user_b.id
            ).first()
            if other:
                return ec

        conv = Conversation(
            workspace_id=workspace_id,
            type='direct',
            created_by_id=user_a.id,
            last_message_at=now
        )
        db.session.add(conv)
        db.session.flush()

        db.session.add(ConversationMember(conversation_id=conv.id, user_id=user_a.id))
        db.session.add(ConversationMember(conversation_id=conv.id, user_id=user_b.id))
        db.session.commit()
        return conv

    # -------------------------------------------------------------
    # 8. Direct 1-on-1: PM (Alex Rivera) <-> Engineering Lead (Marcus Chen)
    # -------------------------------------------------------------
    dm_pm_eng = get_or_create_direct_conv(launch_ws.id, pm, eng)
    pm_eng_thread = [
        {
            "sender": pm,
            "content": "Hey Marcus, how is the architecture review coming along for the release checklist?",
            "created_at": now - timedelta(hours=24),
            "attachment": None
        },
        {
            "sender": eng,
            "content": "Going great Alex! The staging smoke tests are green. We're finalizing the deployment schedule and database indexes.",
            "created_at": now - timedelta(hours=18),
            "attachment": None
        },
        {
            "sender": pm,
            "content": "Perfect. Let's make sure the telemetry dashboards and error boundaries are documented before the executive review.",
            "created_at": now - timedelta(hours=5),
            "attachment": None
        },
        {
            "sender": eng,
            "content": "Understood, I've verified the checklist items and attached our staging readiness overview:",
            "created_at": now - timedelta(minutes=40),
            "attachment": {
                "original_name": "staging_readiness_checklist.txt",
                "storage_path": checklist_txt_path,
                "file_type": "document",
                "mime_type": "text/plain",
                "file_size": len(SAMPLE_CHECKLIST_TXT)
            }
        }
    ]

    last_pm_eng_msg_id = None
    for item in pm_eng_thread:
        m = Message.query.filter_by(
            conversation_id=dm_pm_eng.id,
            sender_id=item["sender"].id,
            content=item["content"]
        ).first()
        if not m:
            m = Message(
                conversation_id=dm_pm_eng.id,
                sender_id=item["sender"].id,
                content=item["content"],
                message_type='text' if not item.get("attachment") else 'file',
                created_at=item["created_at"],
                updated_at=item["created_at"]
            )
            db.session.add(m)
            db.session.flush()

            if item.get("attachment"):
                att_data = item["attachment"]
                att = Attachment(
                    message_id=m.id,
                    conversation_id=dm_pm_eng.id,
                    uploader_id=item["sender"].id,
                    original_name=att_data["original_name"],
                    storage_path=att_data["storage_path"],
                    file_type=att_data["file_type"],
                    mime_type=att_data["mime_type"],
                    file_size=att_data["file_size"],
                    created_at=item["created_at"]
                )
                db.session.add(att)
                db.session.flush()
        last_pm_eng_msg_id = m.id

    if last_pm_eng_msg_id:
        dm_pm_eng.last_message_at = now - timedelta(minutes=40)
        # Marcus sent the last message, so for Alex (PM) leave it unread so PM sees an unread badge!
        cm_pm = ConversationMember.query.filter_by(conversation_id=dm_pm_eng.id, user_id=pm.id).first()
        cm_eng = ConversationMember.query.filter_by(conversation_id=dm_pm_eng.id, user_id=eng.id).first()
        if cm_pm:
            cm_pm.last_read_message_id = max(1, last_pm_eng_msg_id - 1)
            cm_pm.last_read_at = now - timedelta(hours=4)
        if cm_eng:
            cm_eng.last_read_message_id = last_pm_eng_msg_id
            cm_eng.last_read_at = now - timedelta(minutes=39)
    db.session.commit()

    # -------------------------------------------------------------
    # 9. Direct 1-on-1: PM (Alex Rivera) <-> Product Designer (Maya Lin)
    # -------------------------------------------------------------
    dm_pm_des = get_or_create_direct_conv(launch_ws.id, pm, des)
    pm_des_thread = [
        {
            "sender": pm,
            "content": "Hi Maya, love the latest UI polish on the Kanban board and the centered assignee avatars!",
            "created_at": now - timedelta(hours=22),
            "attachment": None
        },
        {
            "sender": des,
            "content": "Thanks Alex! We dialed in the typography, pill alignments, and dark mode contrast ratios.",
            "created_at": now - timedelta(hours=16),
            "attachment": None
        },
        {
            "sender": pm,
            "content": "Looks super crisp and enterprise-ready. Can you share the token sheet preview?",
            "created_at": now - timedelta(hours=8),
            "attachment": None
        },
        {
            "sender": des,
            "content": "Here is the high-res token export with the updated palette and typography scale:",
            "created_at": now - timedelta(hours=3),
            "attachment": {
                "original_name": "design_system_tokens.png",
                "storage_path": tokens_png_path,
                "file_type": "image",
                "mime_type": "image/png",
                "file_size": len(MINIMAL_PNG)
            }
        }
    ]

    last_pm_des_msg_id = None
    for item in pm_des_thread:
        m = Message.query.filter_by(
            conversation_id=dm_pm_des.id,
            sender_id=item["sender"].id,
            content=item["content"]
        ).first()
        if not m:
            m = Message(
                conversation_id=dm_pm_des.id,
                sender_id=item["sender"].id,
                content=item["content"],
                message_type='text' if not item.get("attachment") else 'file',
                created_at=item["created_at"],
                updated_at=item["created_at"]
            )
            db.session.add(m)
            db.session.flush()

            if item.get("attachment"):
                att_data = item["attachment"]
                att = Attachment(
                    message_id=m.id,
                    conversation_id=dm_pm_des.id,
                    uploader_id=item["sender"].id,
                    original_name=att_data["original_name"],
                    storage_path=att_data["storage_path"],
                    file_type=att_data["file_type"],
                    mime_type=att_data["mime_type"],
                    file_size=att_data["file_size"],
                    created_at=item["created_at"]
                )
                db.session.add(att)
                db.session.flush()
        last_pm_des_msg_id = m.id

    if last_pm_des_msg_id:
        dm_pm_des.last_message_at = now - timedelta(hours=3)
        cm_pm = ConversationMember.query.filter_by(conversation_id=dm_pm_des.id, user_id=pm.id).first()
        cm_des = ConversationMember.query.filter_by(conversation_id=dm_pm_des.id, user_id=des.id).first()
        if cm_pm:
            cm_pm.last_read_message_id = last_pm_des_msg_id
            cm_pm.last_read_at = now - timedelta(hours=2)
        if cm_des:
            cm_des.last_read_message_id = last_pm_des_msg_id
            cm_des.last_read_at = now - timedelta(hours=2)
    db.session.commit()

    # -------------------------------------------------------------
    # 10. Direct 1-on-1: Eng Lead (Marcus Chen) <-> QA / Member (Jordan Taylor)
    # -------------------------------------------------------------
    target_eng_ws_id = eng_ws.id if eng_ws else launch_ws.id
    dm_eng_mem = get_or_create_direct_conv(target_eng_ws_id, eng, mem)
    eng_mem_thread = [
        {
            "sender": eng,
            "content": "Jordan, did the automated regression suite pass on the Socket.IO messaging endpoints?",
            "created_at": now - timedelta(hours=19),
        },
        {
            "sender": mem,
            "content": "Yes Marcus! Real-time bidirectional delivery executed with sub-20ms latency across test clients.",
            "created_at": now - timedelta(hours=12),
        },
        {
            "sender": eng,
            "content": "Excellent. Keep an eye on error boundaries during disconnect simulations and reconnect backoffs.",
            "created_at": now - timedelta(hours=4),
        },
        {
            "sender": mem,
            "content": "Will do, tracking edge cases in the test suite now. All current assertions are green!",
            "created_at": now - timedelta(minutes=50),
        }
    ]

    last_eng_mem_msg_id = None
    for item in eng_mem_thread:
        m = Message.query.filter_by(
            conversation_id=dm_eng_mem.id,
            sender_id=item["sender"].id,
            content=item["content"]
        ).first()
        if not m:
            m = Message(
                conversation_id=dm_eng_mem.id,
                sender_id=item["sender"].id,
                content=item["content"],
                message_type='text',
                created_at=item["created_at"],
                updated_at=item["created_at"]
            )
            db.session.add(m)
            db.session.flush()
        last_eng_mem_msg_id = m.id

    if last_eng_mem_msg_id:
        dm_eng_mem.last_message_at = now - timedelta(minutes=50)
        # Jordan sent the last message, so Marcus has 1 unread message
        cm_eng = ConversationMember.query.filter_by(conversation_id=dm_eng_mem.id, user_id=eng.id).first()
        cm_mem = ConversationMember.query.filter_by(conversation_id=dm_eng_mem.id, user_id=mem.id).first()
        if cm_eng:
            cm_eng.last_read_message_id = max(1, last_eng_mem_msg_id - 1)
            cm_eng.last_read_at = now - timedelta(hours=3)
        if cm_mem:
            cm_mem.last_read_message_id = last_eng_mem_msg_id
            cm_mem.last_read_at = now - timedelta(minutes=49)
    db.session.commit()

    # -------------------------------------------------------------
    # 11. Direct 1-on-1: Marketing Lead (Sarah Jenkins) <-> PM (Alex Rivera)
    # -------------------------------------------------------------
    dm_mkt_pm = get_or_create_direct_conv(launch_ws.id, mkt, pm)
    mkt_pm_thread = [
        {
            "sender": mkt,
            "content": "Alex, quick question on the key feature highlights for Thursday's launch newsletter.",
            "created_at": now - timedelta(hours=15),
        },
        {
            "sender": pm,
            "content": "Sure Sarah! We should spotlight real-time team chat, Clerk auth, and hierarchy tree visualization.",
            "created_at": now - timedelta(hours=9),
        },
        {
            "sender": mkt,
            "content": "Perfect! I've drafted the preview email copy centering on those three core pillars.",
            "created_at": now - timedelta(hours=2),
        }
    ]

    last_mkt_pm_msg_id = None
    for item in mkt_pm_thread:
        m = Message.query.filter_by(
            conversation_id=dm_mkt_pm.id,
            sender_id=item["sender"].id,
            content=item["content"]
        ).first()
        if not m:
            m = Message(
                conversation_id=dm_mkt_pm.id,
                sender_id=item["sender"].id,
                content=item["content"],
                message_type='text',
                created_at=item["created_at"],
                updated_at=item["created_at"]
            )
            db.session.add(m)
            db.session.flush()
        last_mkt_pm_msg_id = m.id

    if last_mkt_pm_msg_id:
        dm_mkt_pm.last_message_at = now - timedelta(hours=2)
        cm_mkt = ConversationMember.query.filter_by(conversation_id=dm_mkt_pm.id, user_id=mkt.id).first()
        cm_pm = ConversationMember.query.filter_by(conversation_id=dm_mkt_pm.id, user_id=pm.id).first()
        if cm_mkt:
            cm_mkt.last_read_message_id = last_mkt_pm_msg_id
            cm_mkt.last_read_at = now - timedelta(hours=1)
        if cm_pm:
            cm_pm.last_read_message_id = last_mkt_pm_msg_id
            cm_pm.last_read_at = now - timedelta(hours=1)
    db.session.commit()

    if verbose:
        print("[CHAT SEED] Successfully seeded professional team chat threads and attachments!")


if __name__ == '__main__':
    from backend.app import create_app
    app = create_app()
    with app.app_context():
        seed_demo_chat(verbose=True)
