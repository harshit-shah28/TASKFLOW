import React, { useState, useEffect } from 'react';
import {
  User, Lock, Building, Bell, Sun, Moon,
  ShieldCheck, AlertCircle, CheckCircle2, Trash2, Plus, RefreshCw,
  Copy, Clock, Send
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';

export const SettingsPage = () => {
  const { user, activeWorkspace, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'account' | 'workspace' | 'email-prefs' | 'appearance'

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Account Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Workspace Settings
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || '');
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Email Preferences
  const [emailPrefs, setEmailPrefs] = useState({
    email_notifications_enabled: true,
    task_assigned: true,
    comment_added: true,
    mention: true,
    due_date_reminder: true,
    overdue_alert: true,
    workspace_activity: true,
    security_alerts: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Workspace Permissions
  const canManageMembers =
    activeWorkspace?.my_role === 'Owner' ||
    activeWorkspace?.my_role === 'Admin' ||
    (user && activeWorkspace?.owner_id === user.id);
  const isOwner =
    activeWorkspace?.my_role === 'Owner' ||
    (user && activeWorkspace?.owner_id === user.id);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
      setBio(user.bio || '');
    }
  }, [user]);

  useEffect(() => {
    if (!activeWorkspace) return;
    setWorkspaceName(activeWorkspace.name || '');

    // Load workspace members and pending invitations
    const loadMembersAndInvitations = async () => {
      try {
        setLoadingMembers(true);
        const res = await api.get(`/workspaces/${activeWorkspace.id}/members`);
        setMembers(res.data || []);
      } catch (err) {
        console.error('Failed to load workspace members:', err);
      } finally {
        setLoadingMembers(false);
      }

      // Load pending invitations for Admin/Owner
      const userIsAdmin =
        activeWorkspace.my_role === 'Owner' ||
        activeWorkspace.my_role === 'Admin' ||
        (user && activeWorkspace.owner_id === user.id);

      if (userIsAdmin) {
        try {
          setLoadingInvitations(true);
          const invRes = await api.get(`/workspaces/${activeWorkspace.id}/invitations`);
          setInvitations(invRes.data || []);
        } catch (err) {
          console.error('Failed to load workspace invitations:', err);
        } finally {
          setLoadingInvitations(false);
        }
      } else {
        setInvitations([]);
      }
    };
    loadMembersAndInvitations();
  }, [activeWorkspace, user]);

  useEffect(() => {
    // Load email preferences
    api.get('/users/preferences').then((res) => {
      if (res.data) setEmailPrefs((prev) => ({ ...prev, ...res.data }));
    }).catch(console.error);
  }, []);

  // Update Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.put('/users/profile', {
        full_name: fullName,
        avatar_url: avatarUrl,
        bio,
      });
      await refreshUser();
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }
    try {
      setSavingPassword(true);
      await api.put('/users/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password changed successfully!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Resend Email Verification
  const handleResendVerification = async () => {
    try {
      await api.post('/auth/resend-verification');
      addToast('Verification email resent! Please check your inbox.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to resend verification email.', 'error');
    }
  };

  // Update Workspace Name
  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/workspaces/${activeWorkspace.id}`, { name: workspaceName });
      await refreshUser();
      addToast('Workspace updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update workspace.', 'error');
    }
  };

  // Invite Member
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const sentEmail = inviteEmail.trim();
      setInviteEmail('');
      addToast(`Invitation sent to ${sentEmail}`, 'success');
      
      const [membersRes, invRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace.id}/members`),
        api.get(`/workspaces/${activeWorkspace.id}/invitations`).catch(() => ({ data: [] })),
      ]);
      setMembers(membersRes.data || []);
      setInvitations(invRes.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to invite member.', 'error');
    } finally {
      setInviting(false);
    }
  };

  // Copy Invite Link to Clipboard
  const handleCopyInviteLink = (token) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    addToast('Invitation link copied to clipboard!', 'success');
  };

  // Resend Pending Invitation
  const handleResendInvite = async (invitationId, recipientEmail) => {
    setResendingId(invitationId);
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/invitations/${invitationId}/resend`);
      addToast(`Invitation resent to ${recipientEmail}.`, 'success');
      const invRes = await api.get(`/workspaces/${activeWorkspace.id}/invitations`);
      setInvitations(invRes.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to resend invitation.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Cancel / Revoke Pending Invitation
  const handleCancelInvite = async (invitationId, recipientEmail) => {
    if (!window.confirm(`Revoke pending invitation for ${recipientEmail}?`)) return;
    setCancellingId(invitationId);
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/invitations/${invitationId}`);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      addToast('Invitation revoked.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to cancel invitation.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // Remove Member
  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      addToast('Member removed from workspace.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to remove member.', 'error');
    }
  };

  // Save Email Preferences
  const handleTogglePref = async (key) => {
    if (key === 'security_alerts') return; // Cannot disable security alerts
    const updated = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(updated);
    try {
      await api.put('/users/preferences', updated);
      addToast('Email preferences updated.', 'success');
    } catch (err) {
      addToast('Failed to save preferences.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Settings & Workspace Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal profile, workspace members, security, and email notification preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Profile
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'account'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> Security & Account
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'workspace'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-3.5 h-3.5" /> Workspace & Members
        </button>

        <button
          onClick={() => setActiveTab('email-prefs')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'email-prefs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" /> Email Preferences
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="w-3.5 h-3.5" /> Appearance
        </button>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Personal Information</h2>

          {/* Email verification status badge */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user?.is_verified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {user?.is_verified ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.email}</p>
                <p className="text-[11px] text-slate-500">
                  {user?.is_verified ? 'Verified Email Account' : 'Email verification pending'}
                </p>
              </div>
            </div>

            {!user?.is_verified && (
              <button
                type="button"
                onClick={handleResendVerification}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
              >
                Resend Verification
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Avatar URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Bio / Title
              </label>
              <textarea
                rows={3}
                placeholder="Senior Full Stack Engineer & Product Lead..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ACCOUNT SECURITY */}
      {activeTab === 'account' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Security Credentials</h2>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with letter & number"
                required
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: WORKSPACE & MEMBERS */}
      {activeTab === 'workspace' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Workspace Management</h2>

          <form onSubmit={handleSaveWorkspace} className="flex gap-3 max-w-md">
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="flex-1 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
            >
              Update Name
            </button>
          </form>

          {/* Members & Invitation */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  Team Members & Roles
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {members.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage collaborators and access permissions for this workspace
                </p>
              </div>
            </div>

            {/* Invite Form (Admins & Owners only) */}
            {canManageMembers ? (
              <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Teammate's email address..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                >
                  {isOwner && <option value="Admin">Admin</option>}
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {inviting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Invite Teammate</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Only workspace administrators and the owner can invite new members.
              </p>
            )}

            {/* Active Members List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Members ({members.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {members.map((m) => (
                  <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                        {m.user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{m.user?.full_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{m.user?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {m.role}
                      </span>
                      {canManageMembers && m.role !== 'Owner' && m.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invitations Section (Admins & Owners only) */}
            {canManageMembers && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    Pending Invitations
                    {invitations.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {invitations.length}
                      </span>
                    )}
                  </h4>
                </div>

                {loadingInvitations ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading invitations...</div>
                ) : invitations.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No pending invitations. When you invite new teammates, their links and status will appear here.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{inv.email}</p>
                            <p className="text-[11px] text-slate-400">
                              Role: <span className="font-medium text-slate-600 dark:text-slate-300">{inv.role}</span>
                              {inv.expires_at && ` • Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(inv.token)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                            title="Copy invitation link"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResendInvite(inv.id, inv.email)}
                            disabled={resendingId === inv.id}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Resend invitation email"
                          >
                            <RefreshCw className={`w-3 h-3 ${resendingId === inv.id ? 'animate-spin' : ''}`} />
                            <span>Resend</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelInvite(inv.id, inv.email)}
                            disabled={cancellingId === inv.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
                            title="Revoke invitation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EMAIL PREFERENCES */}
      {activeTab === 'email-prefs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Email Notifications</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage which email notifications you receive at your registered address</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Master Toggle */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable Email Notifications</h4>
                <p className="text-xs text-slate-400">Master switch for all task and project email updates</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.email_notifications_enabled}
                onChange={() => handleTogglePref('email_notifications_enabled')}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Task Assignments */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Task Assignments</h4>
                <p className="text-xs text-slate-400">Receive an email when a project task is assigned to you</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.task_assigned}
                disabled={!emailPrefs.email_notifications_enabled}
                onChange={() => handleTogglePref('task_assigned')}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Comments & Mentions */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Comments & Mentions</h4>
                <p className="text-xs text-slate-400">Receive an email when you are @mentioned or a task you are assigned to is commented on</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.comment_added}
                disabled={!emailPrefs.email_notifications_enabled}
                onChange={() => handleTogglePref('comment_added')}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Due Date Reminders */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Due-Date Reminders & Overdue Alerts</h4>
                <p className="text-xs text-slate-400">Receive proactive alerts for approaching task deadlines</p>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs.due_date_reminder}
                disabled={!emailPrefs.email_notifications_enabled}
                onChange={() => handleTogglePref('due_date_reminder')}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Security Alerts (Mandatory) */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Account Security Alerts (Mandatory)
                </h4>
                <p className="text-xs text-slate-400">Password reset and verification emails cannot be disabled</p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="w-5 h-5 rounded-md text-emerald-600 opacity-60"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Theme & Display Settings</h2>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sun className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <span className="text-xs">Light Mode</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon className="w-5 h-5 mx-auto mb-2 text-indigo-400" />
              <span className="text-xs">Dark Mode</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                theme === 'system'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <RefreshCw className="w-5 h-5 mx-auto mb-2 text-slate-400" />
              <span className="text-xs">System Auto</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
