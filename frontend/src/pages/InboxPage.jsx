import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, MessageSquare } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { ChatContainer } from '../components/chat/ChatContainer';

export const InboxPage = () => {
  const {
    notifications,
    unreadCount,
    chatUnreadCount,
    setChatUnreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  const { activeWorkspace } = useAuth();
  const { onOpenTask } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'notifications'; // 'notifications' | 'chat'

  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    if (n.related_entity_type === 'task' && n.related_entity_id && onOpenTask) {
      onOpenTask(n.related_entity_id);
    }
  };

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  return (
    <div className={`space-y-6 mx-auto animate-in fade-in duration-300 ${currentTab === 'chat' ? 'max-w-6xl' : 'max-w-4xl'}`}>
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {currentTab === 'chat' ? 'Team Communication & Chat' : 'Notification Center & Inbox'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {currentTab === 'chat'
              ? 'Real-time team channels, direct messages, and secure file sharing'
              : 'System alerts, mentions, task assignments, and workspace updates'}
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setTab('notifications')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'notifications'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('chat')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'chat'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Team Chat</span>
            {chatUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {chatUnreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* View Content */}
      {currentTab === 'chat' ? (
        <ChatContainer onUnreadChange={(count) => setChatUnreadCount(count)} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Notifications ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Unread Only ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" /> Mark all as read
              </button>
            )}
          </div>

          {filteredNotifs.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Your inbox is clear"
              description={filter === 'unread' ? "No unread notifications left." : "You have received no notifications yet."}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                    !n.is_read
                      ? 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                      !n.is_read ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {n.title}
                        </h3>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
