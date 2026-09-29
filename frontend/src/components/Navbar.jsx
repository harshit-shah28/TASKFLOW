import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Bell, Plus, Check, ChevronDown, Sun, Moon,
  LogOut, User, Settings, Sparkles, Building, CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate, Link } from 'react-router-dom';

export const Navbar = ({ onOpenSearch, onOpenCreateTask, onToggleMobileSidebar }) => {
  const { user, workspaces, activeWorkspace, setActiveWorkspace, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const wsRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wsRef.current && !wsRef.current.contains(e.target)) setWsDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifDropdownOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & Workspace Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Workspace Switcher */}
        <div className="relative" ref={wsRef}>
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <div className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {activeWorkspace?.name?.charAt(0) || 'W'}
            </div>
            <span className="max-w-[130px] truncate">{activeWorkspace?.name || 'Workspace'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {wsDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Workspaces
              </div>
              <div className="space-y-1 mb-2">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setWsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      ws.id === activeWorkspace?.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {ws.id === activeWorkspace?.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                <Link
                  to="/settings"
                  onClick={() => setWsDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Manage / New Workspace
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Global Search Input Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 group-hover:text-indigo-500 transition-colors" />
            <span>Search tasks, projects, tags...</span>
          </div>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Quick Create Task */}
        <button
          onClick={onOpenCreateTask}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Task</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 text-xs transition-colors cursor-pointer ${
                        !n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <Link
                to="/inbox"
                onClick={() => setNotifDropdownOpen(false)}
                className="block text-center py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 hover:underline"
              >
                View full inbox &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-500/20">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <Link
                to="/settings"
                onClick={() => setProfileDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" /> Settings & Profile
              </Link>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
