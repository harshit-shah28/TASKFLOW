import React, { useState, useEffect } from 'react';
import { X, Search, Hash, MessageSquare, User as UserIcon, Plus } from 'lucide-react';
import api from '../../services/api';

export const NewChatModal = ({ isOpen, onClose, activeWorkspace, currentUserId, onSelectConversation }) => {
  const [tab, setTab] = useState('direct'); // 'direct' | 'channel'
  const [members, setMembers] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // New channel state
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !activeWorkspace) return;
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await api.get(`/workspaces/${activeWorkspace.id}/members`);
        // Filter out current user from direct messaging list
        const others = (res.data || []).filter((m) => m.user && m.user.id !== currentUserId);
        setMembers(others);
      } catch (err) {
        console.error('Failed to load workspace members for chat:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [isOpen, activeWorkspace, currentUserId]);

  if (!isOpen) return null;

  const handleStartDirectChat = async (participantId) => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/chat/conversations', {
        workspace_id: activeWorkspace.id,
        type: 'direct',
        participant_id: participantId,
      });
      onSelectConversation(res.data);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to start direct conversation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/chat/conversations', {
        workspace_id: activeWorkspace.id,
        type: 'channel',
        name: channelName.trim(),
        description: channelDesc.trim(),
      });
      onSelectConversation(res.data);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create channel');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const name = m.user?.full_name?.toLowerCase() || '';
    const email = m.user?.email?.toLowerCase() || '';
    const q = searchMember.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Start Conversation
            </h2>
            <p className="text-xs text-slate-500">
              Connect with teammates or create a topic channel
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 p-2 gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => { setTab('direct'); setError(''); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'direct'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Direct Message
          </button>
          <button
            onClick={() => { setTab('channel'); setError(''); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'channel'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Create Channel
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {tab === 'direct' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workspace members..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading workspace members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {members.length === 0
                    ? "No other members in this workspace yet. Invite teammates from Workspace Settings."
                    : "No members match your search."}
                </div>
              ) : (
                <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-64 overflow-y-auto">
                  {filteredMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleStartDirectChat(m.user.id)}
                      className="pt-2 pb-2 first:pt-0 flex items-center justify-between gap-3 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none text-center">
                          {m.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {m.user?.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {m.user?.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Channel Name
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. project-launch, updates"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="What is this channel about?"
                  value={channelDesc}
                  onChange={(e) => setChannelDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !channelName.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {submitting ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
