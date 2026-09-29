import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building, UserCheck, AlertCircle, ArrowRight, CheckCircle2, Shield, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';

export const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, token: authToken, refreshUser, setActiveWorkspace } = useAuth();
  const { addToast } = useToast();

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Missing invitation token.');
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/workspaces/invitations/${token}`);
        if (res.data) {
          setInvitation(res.data);
          if (!res.data.is_valid && res.data.status !== 'pending') {
            setError(`This invitation has ${res.data.status}.`);
          }
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  // Check if current logged-in user is already member
  useEffect(() => {
    if (invitation && user && invitation.workspace_id) {
      const existing = (user.workspace_memberships || []).some(
        (m) => m.workspace_id === invitation.workspace_id
      );
      if (existing) {
        setIsAlreadyMember(true);
      }
    }
  }, [invitation, user]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError('');

    try {
      const res = await api.post(`/workspaces/invitations/${token}/accept`);
      addToast(res.message || `Welcome to ${invitation?.workspace_name}!`, 'success');

      // Refresh workspaces in auth context and set this workspace active
      if (refreshUser) {
        await refreshUser();
      }
      if (res.data?.workspace && setActiveWorkspace) {
        setActiveWorkspace(res.data.workspace);
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Owner':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Admin':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Member':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src="/logo.svg" alt="TaskFlow" className="w-10 h-10 rounded-xl shadow-md" />
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              TASKFLOW
            </span>
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Workspace Invitation
          </h1>
          <p className="text-xs text-slate-500">
            Collaborate with your team seamlessly
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
              <p className="text-xs text-slate-400">Loading invitation details...</p>
            </div>
          ) : error ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Unable to Join Workspace
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to={authToken ? '/dashboard' : '/login'}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {authToken ? 'Go to Dashboard' : 'Sign In'}
                </Link>
              </div>
            </div>
          ) : invitation ? (
            <div className="space-y-6">
              {/* Workspace Header */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-xs">
                  {invitation.workspace_name?.charAt(0) || 'W'}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {invitation.workspace_name}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    Invited by <span className="font-semibold text-slate-600 dark:text-slate-300">{invitation.inviter_name || invitation.inviter_email || 'Team Admin'}</span>
                  </p>
                </div>
              </div>

              {/* Role & Details */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Designated Role</span>
                  <span className={`px-2.5 py-0.5 rounded-md font-semibold border ${getRoleBadgeColor(invitation.role)}`}>
                    {invitation.role}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Invited Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {invitation.email}
                  </span>
                </div>
                {invitation.expires_at && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">Valid Until</span>
                    <span className="text-slate-500">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Area */}
              {authToken ? (
                <div className="space-y-3">
                  {isAlreadyMember ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>You are already a member of this workspace.</span>
                      </div>
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-400 text-center">
                        Signed in as <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email}</span>
                      </p>
                      <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {accepting ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            <span>Joining Workspace...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Accept & Join Workspace</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 text-center">
                    Sign in to your account or create one to join this workspace.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/login?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email || '')}`}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Sign In
                    </Link>
                    <Link
                      to={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email || '')}`}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Register
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400">
          Protected by TaskFlow Workspace Access Control
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
