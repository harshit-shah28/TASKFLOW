import React from 'react';
import { Search, Plus, Hash, MessageSquare, Circle } from 'lucide-react';

export const ChatConversationList = ({
  conversations = [],
  activeConversation,
  onSelectConversation,
  onOpenNewChat,
  onlineUserIds = [],
  searchQuery,
  setSearchQuery,
}) => {
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.display_name || c.name || '').toLowerCase();
    const lastMsg = (c.last_message?.content || '').toLowerCase();
    return name.includes(q) || lastMsg.includes(q);
  });

  const channels = filtered.filter((c) => c.type === 'channel');
  const directMessages = filtered.filter((c) => c.type === 'direct');

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/40 dark:bg-slate-900/40">
      {/* Search & Actions Bar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Messages & Channels
          </span>
          <button
            onClick={onOpenNewChat}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Channels Section */}
        <div>
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Channels ({channels.length})</span>
          </div>

          <div className="space-y-0.5 mt-1">
            {channels.map((c) => {
              const isActive = activeConversation?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectConversation(c)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border-l-2 border-indigo-600'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{c.name}</span>
                  </div>

                  {c.unread_count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Direct Messages ({directMessages.length})</span>
          </div>

          <div className="space-y-0.5 mt-1">
            {directMessages.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 italic">
                No direct messages yet
              </div>
            ) : (
              directMessages.map((c) => {
                const isActive = activeConversation?.id === c.id;
                const otherUserId = c.other_user?.id;
                const isOnline = otherUserId && onlineUserIds.includes(otherUserId);

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer group ${
                      isActive
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-600'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                          {c.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                          title={isOnline ? 'Online' : 'Offline'}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`truncate font-semibold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {c.display_name}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatTime(c.last_message_at)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {c.last_message?.content || (c.last_message?.attachments?.length ? 'Shared an attachment' : 'No messages yet')}
                        </p>
                      </div>
                    </div>

                    {c.unread_count > 0 && (
                      <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
