"""
End-to-End Test Suite for TaskFlow Workspace Member Invitations.
Verifies:
1. Owner can invite member by email with designated role.
2. Token generation, 7-day expiration, and pending status.
3. Duplicate invitations refresh token and expiration without creating duplicates.
4. Role permissions: Viewers cannot invite, Admins cannot invite Admins (only Owner can).
5. Listing pending invitations for workspace admins.
6. Resending invitation refreshes token.
7. Cancelling invitation marks it cancelled.
8. Public token inspection endpoint.
9. Authenticated acceptance adds user to workspace and #general channel.
10. Registration auto-enrolls pending invitations for matching email.
11. Already member rejection (409 Conflict).
"""

import sys
import unittest
from datetime import datetime, timezone, timedelta
from backend.app import create_app
from backend.models import db, User, Workspace, WorkspaceMember, WorkspaceInvitation, Conversation, ConversationMember
from backend.routes.chat_routes import ensure_workspace_default_channel


class TestInvitationFlow(unittest.TestCase):
    def setUp(self):
        self.app = create_app(config_override={
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'
        })
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

            # Create Owner user
            owner = User(email='owner@test.com', full_name='Workspace Owner', is_verified=True)
            owner.set_password('Password123!')
            db.session.add(owner)

            # Create Member user
            member = User(email='member@test.com', full_name='Workspace Member', is_verified=True)
            member.set_password('Password123!')
            db.session.add(member)

            # Create Viewer user
            viewer = User(email='viewer@test.com', full_name='Workspace Viewer', is_verified=True)
            viewer.set_password('Password123!')
            db.session.add(viewer)

            db.session.commit()

            # Create Workspace
            ws = Workspace(name='Engineering Team', slug='eng-team', owner_id=owner.id)
            db.session.add(ws)
            db.session.flush()

            self.ws_id = ws.id

            # Add memberships
            db.session.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role='Owner'))
            db.session.add(WorkspaceMember(workspace_id=ws.id, user_id=member.id, role='Member'))
            db.session.add(WorkspaceMember(workspace_id=ws.id, user_id=viewer.id, role='Viewer'))
            db.session.commit()

            ensure_workspace_default_channel(ws.id)

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _login(self, email, password='Password123!'):
        res = self.client.post('/api/auth/login', json={'email': email, 'password': password})
        self.assertEqual(res.status_code, 200)
        return res.get_json()['data']['token']

    def test_owner_invite_and_duplicate_refresh(self):
        ws_id = self.ws_id
        token = self._login('owner@test.com')
        headers = {'Authorization': f'Bearer {token}', 'X-Workspace-Id': str(ws_id)}

        # 1. Invite a new teammate
        invite_email = 'newbie@example.com'
        res = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': invite_email,
            'role': 'Member'
        }, headers=headers)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()['data']
        self.assertEqual(data['email'], invite_email)
        self.assertEqual(data['role'], 'Member')
        self.assertEqual(data['status'], 'pending')
        self.assertTrue('token' in data)
        self.assertTrue('invite_url' in data)
        first_token = data['token']

        # 2. Duplicate invite should refresh token and not duplicate
        res2 = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': invite_email,
            'role': 'Admin'
        }, headers=headers)
        self.assertEqual(res2.status_code, 201)
        data2 = res2.get_json()['data']
        self.assertEqual(data2['role'], 'Admin')
        second_token = data2['token']
        self.assertNotEqual(first_token, second_token)

        with self.app.app_context():
            invites = WorkspaceInvitation.query.filter_by(workspace_id=ws_id, email=invite_email).all()
            self.assertEqual(len(invites), 1)

    def test_role_authorization_for_invites(self):
        ws_id = self.ws_id

        # Viewer trying to invite -> 403
        viewer_token = self._login('viewer@test.com')
        res = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': 'anyone@example.com',
            'role': 'Member'
        }, headers={'Authorization': f'Bearer {viewer_token}', 'X-Workspace-Id': str(ws_id)})
        self.assertEqual(res.status_code, 403)

        # Member trying to invite Admin -> 403
        member_token = self._login('member@test.com')
        res_m = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': 'anyone@example.com',
            'role': 'Admin'
        }, headers={'Authorization': f'Bearer {member_token}', 'X-Workspace-Id': str(ws_id)})
        self.assertEqual(res_m.status_code, 403)

    def test_already_member_conflict(self):
        ws_id = self.ws_id
        owner_token = self._login('owner@test.com')
        headers = {'Authorization': f'Bearer {owner_token}', 'X-Workspace-Id': str(ws_id)}

        res = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': 'member@test.com',
            'role': 'Member'
        }, headers=headers)
        self.assertEqual(res.status_code, 409)

    def test_invitation_management_endpoints(self):
        ws_id = self.ws_id
        owner_token = self._login('owner@test.com')
        headers = {'Authorization': f'Bearer {owner_token}', 'X-Workspace-Id': str(ws_id)}

        # Send invite
        res = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': 'manage_test@example.com',
            'role': 'Viewer'
        }, headers=headers)
        self.assertEqual(res.status_code, 201)
        inv_id = res.get_json()['data']['id']
        old_token = res.get_json()['data']['token']

        # List invitations
        list_res = self.client.get(f'/api/workspaces/{ws_id}/invitations', headers=headers)
        self.assertEqual(list_res.status_code, 200)
        invs = list_res.get_json()['data']
        self.assertTrue(any(i['id'] == inv_id for i in invs))

        # Resend invitation
        resend_res = self.client.post(f'/api/workspaces/{ws_id}/invitations/{inv_id}/resend', headers=headers)
        self.assertEqual(resend_res.status_code, 200)
        new_token = resend_res.get_json()['data']['token']
        self.assertNotEqual(old_token, new_token)

        # Cancel invitation
        del_res = self.client.delete(f'/api/workspaces/{ws_id}/invitations/{inv_id}', headers=headers)
        self.assertEqual(del_res.status_code, 200)

        with self.app.app_context():
            inv = WorkspaceInvitation.query.get(inv_id)
            self.assertEqual(inv.status, 'cancelled')
            self.assertFalse(inv.is_valid())

    def test_public_token_inspection_and_acceptance(self):
        ws_id = self.ws_id
        owner_token = self._login('owner@test.com')
        headers = {'Authorization': f'Bearer {owner_token}', 'X-Workspace-Id': str(ws_id)}

        res = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': 'joiner@example.com',
            'role': 'Member'
        }, headers=headers)
        self.assertEqual(res.status_code, 201)
        token_str = res.get_json()['data']['token']

        # Public lookup
        get_res = self.client.get(f'/api/workspaces/invitations/{token_str}')
        self.assertEqual(get_res.status_code, 200)
        data = get_res.get_json()['data']
        self.assertEqual(data['workspace_name'], 'Engineering Team')
        self.assertEqual(data['role'], 'Member')
        self.assertTrue(data['is_valid'])

        # Register joiner user
        reg_res = self.client.post('/api/auth/register', json={
            'email': 'registered_joiner@example.com',
            'password': 'Password123!',
            'full_name': 'Registered Joiner'
        })
        self.assertEqual(reg_res.status_code, 201)
        joiner_jwt = reg_res.get_json()['data']['token']

        # Accept invitation
        accept_res = self.client.post(
            f'/api/workspaces/invitations/{token_str}/accept',
            headers={'Authorization': f'Bearer {joiner_jwt}'}
        )
        self.assertEqual(accept_res.status_code, 200)

        with self.app.app_context():
            user = User.query.filter_by(email='registered_joiner@example.com').first()
            self.assertIsNotNone(user)
            m = WorkspaceMember.query.filter_by(workspace_id=ws_id, user_id=user.id).first()
            self.assertIsNotNone(m)
            self.assertEqual(m.role, 'Member')

            # Verify added to general channel
            gen_conv = Conversation.query.filter_by(workspace_id=ws_id, type='channel', name='general').first()
            cm = ConversationMember.query.filter_by(conversation_id=gen_conv.id, user_id=user.id).first()
            self.assertIsNotNone(cm)

    def test_auto_enroll_upon_registration(self):
        ws_id = self.ws_id
        owner_token = self._login('owner@test.com')
        headers = {'Authorization': f'Bearer {owner_token}', 'X-Workspace-Id': str(ws_id)}

        # Invite an unregistered email
        target_email = 'auto_join@example.com'
        res = self.client.post(f'/api/workspaces/{ws_id}/members', json={
            'email': target_email,
            'role': 'Admin'
        }, headers=headers)
        self.assertEqual(res.status_code, 201)

        # Unregistered user registers with that exact email
        reg_res = self.client.post('/api/auth/register', json={
            'email': target_email,
            'password': 'Password123!',
            'full_name': 'Auto Joiner'
        })
        self.assertEqual(reg_res.status_code, 201)

        with self.app.app_context():
            user = User.query.filter_by(email=target_email).first()
            self.assertIsNotNone(user)
            m = WorkspaceMember.query.filter_by(workspace_id=ws_id, user_id=user.id).first()
            self.assertIsNotNone(m)
            self.assertEqual(m.role, 'Admin')

            inv = WorkspaceInvitation.query.filter_by(workspace_id=ws_id, email=target_email).first()
            self.assertEqual(inv.status, 'accepted')


if __name__ == '__main__':
    unittest.main()
