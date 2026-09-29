"""
Comprehensive test script for TASKFLOW Real-Time Team Chat & File Sharing.
Tests:
1. Workspace conversation listing & auto-#general channel creation
2. Direct message conversation creation between 2 workspace members
3. Custom channel creation (#engineering)
4. Posting text messages & updating conversation activity
5. Posting messages with file attachments
6. File upload validation (allowed types vs blocked .py / .exe scripts)
7. Authenticated file download & streaming preview
8. Unread count calculation and marking conversations as read
9. Socket.IO connection and event handling
"""
import io
import time
from backend.app import app
from backend.models import db, User, Workspace, WorkspaceMember, Conversation, Message, Attachment
from backend.sockets import socketio
from flask_jwt_extended import create_access_token


def test_chat_system():
    print("=" * 60)
    print("TESTING TASKFLOW REAL-TIME TEAM CHAT & FILE SHARING")
    print("=" * 60)

    client = app.test_client()

    with app.app_context():
        # Setup test users
        ts = int(time.time())
        u1 = User(email=f"chat_alice_{ts}@taskflow.dev", full_name="Alice Adams", is_verified=True, is_active=True)
        u1.set_password("SecurePassword123!")
        u2 = User(email=f"chat_bob_{ts}@taskflow.dev", full_name="Bob Baker", is_verified=True, is_active=True)
        u2.set_password("SecurePassword123!")
        db.session.add_all([u1, u2])
        db.session.flush()

        # Setup test workspace
        ws = Workspace(name=f"Chat Team Workspace {ts}", slug=f"chat-team-{ts}", owner_id=u1.id)
        db.session.add(ws)
        db.session.flush()

        wm1 = WorkspaceMember(workspace_id=ws.id, user_id=u1.id, role='Owner')
        wm2 = WorkspaceMember(workspace_id=ws.id, user_id=u2.id, role='Member')
        db.session.add_all([wm1, wm2])
        db.session.commit()

        u1_id = u1.id
        u2_id = u2.id
        ws_id = ws.id

        token_u1 = create_access_token(identity=str(u1_id))
        token_u2 = create_access_token(identity=str(u2_id))
        headers_u1 = {'Authorization': f"Bearer {token_u1}", 'Content-Type': 'application/json'}
        headers_u2 = {'Authorization': f"Bearer {token_u2}", 'Content-Type': 'application/json'}

    # 1. List conversations (should auto-create #general)
    res = client.get(f'/api/chat/conversations?workspace_id={ws_id}', headers=headers_u1)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.data}"
    data = res.get_json()['data']
    assert len(data) >= 1, "Expected at least 1 conversation (#general)"
    general_conv = next(c for c in data if c['name'] == 'general')
    assert general_conv['type'] == 'channel'
    print("[PASS] Auto-creation and listing of #general channel verified")

    # 2. Start a direct message conversation between Alice and Bob
    res = client.post('/api/chat/conversations', json={
        'workspace_id': ws_id,
        'type': 'direct',
        'participant_id': u2_id
    }, headers=headers_u1)
    assert res.status_code == 201 or res.status_code == 200, res.data
    dm_conv = res.get_json()['data']
    assert dm_conv['type'] == 'direct'
    assert dm_conv['other_user']['id'] == u2_id
    dm_id = dm_conv['id']
    print(f"[PASS] Direct conversation between Alice and Bob created (ID: {dm_id})")

    # 3. Create a custom channel #engineering
    res = client.post('/api/chat/conversations', json={
        'workspace_id': ws_id,
        'type': 'channel',
        'name': 'engineering',
        'description': 'Engineering team discussions'
    }, headers=headers_u1)
    assert res.status_code == 201, res.data
    eng_conv = res.get_json()['data']
    assert eng_conv['name'] == 'engineering'
    eng_id = eng_conv['id']
    print(f"[PASS] Custom channel #engineering created (ID: {eng_id})")

    # 4. Post text message from Alice in #engineering
    res = client.post(f'/api/chat/conversations/{eng_id}/messages', json={
        'content': 'Welcome team to the engineering channel!'
    }, headers=headers_u1)
    assert res.status_code == 201, res.data
    msg1 = res.get_json()['data']
    assert msg1['content'] == 'Welcome team to the engineering channel!'
    assert msg1['sender_id'] == u1_id
    print("[PASS] Text message posted successfully")

    # 5. Check unread count for Bob
    res = client.get(f'/api/chat/unread-count?workspace_id={ws_id}', headers=headers_u2)
    assert res.status_code == 200
    unread_bob = res.get_json()['data']['unread_count']
    assert unread_bob >= 1, f"Expected unread count >= 1 for Bob, got {unread_bob}"
    print(f"[PASS] Unread message count verified for Bob (Count: {unread_bob})")

    # 6. Bob marks #engineering as read
    res = client.post(f'/api/chat/conversations/{eng_id}/read', headers=headers_u2)
    assert res.status_code == 200
    res = client.get(f'/api/chat/unread-count?workspace_id={ws_id}', headers=headers_u2)
    assert res.get_json()['data']['unread_count'] == 0
    print("[PASS] Conversation mark-as-read verified, unread count reset to 0")

    # 7. File upload security: block dangerous executable scripts
    bad_file = (io.BytesIO(b"import os; os.system('echo hacked')"), "malicious_script.py")
    res = client.post(
        f'/api/chat/conversations/{dm_id}/upload',
        data={'file': bad_file},
        content_type='multipart/form-data',
        headers={'Authorization': f"Bearer {token_u1}"}
    )
    assert res.status_code == 400, f"Expected 400 rejection for .py file, got {res.status_code}"
    print("[PASS] Dangerous executable/script (.py) blocked as expected")

    # 8. File upload valid: image attachment
    image_file = (io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"), "architecture_diagram.png")
    res = client.post(
        f'/api/chat/conversations/{dm_id}/upload',
        data={'file': image_file},
        content_type='multipart/form-data',
        headers={'Authorization': f"Bearer {token_u1}"}
    )
    assert res.status_code == 201, f"Expected 201 for PNG upload, got {res.status_code}: {res.data}"
    att_data = res.get_json()['data']
    assert att_data['file_type'] == 'image'
    att_id = att_data['id']
    print(f"[PASS] Valid image upload processed (Attachment ID: {att_id})")

    # 9. Send message with attachment in DM
    res = client.post(f'/api/chat/conversations/{dm_id}/messages', json={
        'content': 'Here is the architecture diagram for review.',
        'attachment_ids': [att_id]
    }, headers=headers_u1)
    assert res.status_code == 201
    dm_msg = res.get_json()['data']
    assert len(dm_msg['attachments']) == 1
    print("[PASS] Message with attachment posted and linked successfully")

    # 10. Authenticated attachment download & preview
    # Download with Bearer token
    res = client.get(f'/api/chat/attachments/{att_id}/download', headers={'Authorization': f"Bearer {token_u2}"})
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert b"PNG" in res.data
    # Preview with token query param
    res = client.get(f'/api/chat/attachments/{att_id}/preview?token={token_u2}')
    assert res.status_code == 200, f"Expected 200 for preview query param, got {res.status_code}"
    print("[PASS] Authenticated file download and preview streaming verified")

    # 11. Socket.IO integration test
    socket_client1 = socketio.test_client(app, auth={'token': token_u1})
    assert socket_client1.is_connected(), "Socket client 1 should be connected"

    socket_client2 = socketio.test_client(app, auth={'token': token_u2})
    assert socket_client2.is_connected(), "Socket client 2 should be connected"

    # Join room
    socket_client1.emit('join_conversation', {'conversation_id': dm_id})
    socket_client2.emit('join_conversation', {'conversation_id': dm_id})

    # Test typing indicator
    socket_client1.emit('typing_start', {'conversation_id': dm_id})
    received = socket_client2.get_received()
    typing_events = [e for e in received if e['name'] == 'typing_start']
    assert len(typing_events) >= 1, f"Bob should have received typing_start: {received}"
    assert typing_events[0]['args'][0]['user']['id'] == u1_id
    print("[PASS] Real-time Socket.IO typing event verified")

    socket_client1.disconnect()
    socket_client2.disconnect()
    print("[PASS] Socket.IO disconnect handled cleanly")

    print("\n" + "=" * 60)
    print("ALL CHAT & FILE SHARING INTEGRATION TESTS PASSED!")
    print("=" * 60)


if __name__ == '__main__':
    test_chat_system()
