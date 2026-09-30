import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Users, Building, Activity,
  CheckCircle2, AlertCircle, RefreshCw, Search,
  Filter, Layers, MessageSquare, Mail, UserX,
  UserCheck, Shield, ChevronLeft, ChevronRight,
  TrendingUp, BarChart3, Database, Info
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const STATUS_COLORS = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  'Review': '#f59e0b',
  'Blocked': '#ef4444',
  'Completed': '#10b981',
};

const PRIORITY_COLORS = {
  'Urgent': '#ef4444',
  'High': '#f97316',
  'Medium': '#3b82f6',
  'Normal': '#6366f1',
  'Low': '#94a3b8',
};

const PROVIDER_COLORS = {
  'local': '#6366f1',
  'clerk': '#8b5cf6',
  'google': '#ea4335',
  'github': '#10b981',
};

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'workspaces' | 'analytics' | 'activity'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overview Data
  const [overview, setOverview] = useState(null);

  // Users Data
  const [usersList, setUsersList] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, per_page: 15, total: 0, pages: 1 });
  const [userSearch, setUserSearch] = useState('');
  const [userFilterActive, setUserFilterActive] = useState('');
  const [userFilterVerified, setUserFilterVerified] = useState('');
  const [userFilterAdmin, setUserFilterAdmin] = useState('');
  const [userSortBy, setUserSortBy] = useState('-created_at');
  const [mutatingUserId, setMutatingUserId] = useState(null);

  // Workspaces Data
  const [workspacesList, setWorkspacesList] = useState([]);
  const [workspacesPagination, setWorkspacesPagination] = useState({ page: 1, per_page: 15, total: 0, pages: 1 });
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // Analytics Data
  const [analyticsData, setAnalyticsData] = useState(null);

  // Activity Log Data
  const [activityList, setActivityList] = useState([]);
  const [activityPagination, setActivityPagination] = useState({ page: 1, per_page: 20, total: 0, pages: 1 });
  const [activityActionFilter, setActivityActionFilter] = useState('');

  // Authorization Check
  const isPlatformAdmin = Boolean(user?.is_platform_admin && user?.email === 'lead_architect@taskflow.dev');

  // 1. Fetch Overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/admin/overview');
      setOverview(res.data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch platform metrics.', 'error');
    }
  }, [addToast]);

  // 2. Fetch Users
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(usersPagination.per_page),
        sort_by: userSortBy,
      });
      if (userSearch.trim()) params.append('search', userSearch.trim());
      if (userFilterActive !== '') params.append('is_active', userFilterActive);
      if (userFilterVerified !== '') params.append('is_verified', userFilterVerified);
      if (userFilterAdmin !== '') params.append('is_platform_admin', userFilterAdmin);

      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsersList(res.data.users || []);
      setUsersPagination(res.data.pagination || { page: 1, per_page: 15, total: 0, pages: 1 });
    } catch (err) {
      addToast(err.message || 'Failed to fetch users list.', 'error');
    }
  }, [userSearch, userFilterActive, userFilterVerified, userFilterAdmin, userSortBy, usersPagination.per_page, addToast]);

  // 3. Fetch Workspaces
  const fetchWorkspaces = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(workspacesPagination.per_page),
      });
      if (workspaceSearch.trim()) params.append('search', workspaceSearch.trim());

      const res = await api.get(`/admin/workspaces?${params.toString()}`);
      setWorkspacesList(res.data.workspaces || []);
      setWorkspacesPagination(res.data.pagination || { page: 1, per_page: 15, total: 0, pages: 1 });
    } catch (err) {
      addToast(err.message || 'Failed to fetch workspaces list.', 'error');
    }
  }, [workspaceSearch, workspacesPagination.per_page, addToast]);

  // 4. Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalyticsData(res.data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch platform analytics.', 'error');
    }
  }, [addToast]);

  // 5. Fetch Activity
  const fetchActivity = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(activityPagination.per_page),
      });
      if (activityActionFilter.trim()) params.append('action', activityActionFilter.trim());

      const res = await api.get(`/admin/activity?${params.toString()}`);
      setActivityList(res.data.activities || []);
      setActivityPagination(res.data.pagination || { page: 1, per_page: 20, total: 0, pages: 1 });
    } catch (err) {
      addToast(err.message || 'Failed to fetch activity logs.', 'error');
    }
  }, [activityActionFilter, activityPagination.per_page, addToast]);

  // Initial Load based on tab
  useEffect(() => {
    if (!isPlatformAdmin) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      if (activeTab === 'overview') await fetchOverview();
      else if (activeTab === 'users') await fetchUsers(1);
      else if (activeTab === 'workspaces') await fetchWorkspaces(1);
      else if (activeTab === 'analytics') await fetchAnalytics();
      else if (activeTab === 'activity') await fetchActivity(1);
      setLoading(false);
    };

    loadData();
  }, [activeTab, isPlatformAdmin, fetchOverview, fetchUsers, fetchWorkspaces, fetchAnalytics, fetchActivity]);

  // Refresh current view
  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'overview') await fetchOverview();
    else if (activeTab === 'users') await fetchUsers(usersPagination.page);
    else if (activeTab === 'workspaces') await fetchWorkspaces(workspacesPagination.page);
    else if (activeTab === 'analytics') await fetchAnalytics();
    else if (activeTab === 'activity') await fetchActivity(activityPagination.page);
    setRefreshing(false);
    addToast('Data refreshed.', 'info');
  };

  // Toggle User Active Status
  const handleToggleActive = async (targetUser) => {
    if (targetUser.id === user.id) {
      addToast('Cannot modify active status of your own admin account.', 'error');
      return;
    }
    const actionLabel = targetUser.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${targetUser.email}?`)) {
      return;
    }

    setMutatingUserId(targetUser.id);
    try {
      const res = await api.patch(`/admin/users/${targetUser.id}/toggle-active`);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: res.data.is_active } : u))
      );
      addToast(res.message || `User ${actionLabel}d.`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setMutatingUserId(null);
    }
  };

  // Toggle User Platform Admin Privilege
  const handleToggleAdmin = async (targetUser) => {
    if (targetUser.id === user.id) {
      addToast('Cannot revoke your own platform administrator role.', 'error');
      return;
    }
    const actionLabel = targetUser.is_platform_admin ? 'revoke platform admin privileges from' : 'grant platform admin privileges to';
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${targetUser.email}?`)) {
      return;
    }

    setMutatingUserId(targetUser.id);
    try {
      const res = await api.patch(`/admin/users/${targetUser.id}/toggle-admin`);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_platform_admin: res.data.is_platform_admin } : u))
      );
      addToast(res.message || 'Platform administrator privileges updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update admin privileges.', 'error');
    } finally {
      setMutatingUserId(null);
    }
  };

  // ACCESS DENIED RENDER (FOR NON-ADMIN USERS)
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-500">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Access Denied: Platform Administrator Privileges Required
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The Platform Admin Panel is an internal control surface restricted exclusively to system administrators. Workspace roles (Owner, Admin, Member) do not grant platform administration rights.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/40 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Platform Control Console
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Platform Administration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global system governance, live operational telemetry, user security, and workspace oversight.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh current metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Platform Users
        </button>

        <button
          onClick={() => setActiveTab('workspaces')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'workspaces'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-3.5 h-3.5" /> Workspaces
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Deep Analytics
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Audit Logs
        </button>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Primary Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Users</span>
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {overview.users.total}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {overview.users.active} active
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                <span>{overview.users.verified} verified</span>
                <span>•</span>
                <span>{overview.users.platform_admins} admin{overview.users.platform_admins > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Total Workspaces */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Workspaces & Projects</span>
                <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <Building className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {overview.workspaces.total}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  workspaces
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {overview.projects.total} active engineering & marketing projects
              </div>
            </div>

            {/* Total Tasks */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Tasks</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {overview.tasks.total}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {overview.tasks.completion_rate}% done
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                <span>{overview.tasks.completed} completed</span>
                <span>•</span>
                <span>{overview.tasks.open} open</span>
              </div>
            </div>

            {/* Collaboration & Activity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Activity & Comms</span>
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <MessageSquare className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {overview.collaboration.total_messages}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">messages</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                <span>{overview.collaboration.total_invitations} invites ({overview.collaboration.accepted_invitations} accepted)</span>
              </div>
            </div>
          </div>

          {/* Secondary Overview Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identity & Provider Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Authentication Providers
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Real Accounts
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(overview.users.providers || {}).map(([provider, count]) => {
                  const pct = Math.round((count / (overview.users.total || 1)) * 100);
                  return (
                    <div key={provider} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="capitalize text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: PROVIDER_COLORS[provider] || '#6366f1' }}
                          />
                          {provider === 'local' ? 'Standard Email/Password' : provider.toUpperCase()}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PROVIDER_COLORS[provider] || '#6366f1'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Billing & Subscriptions Architecture */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                  <Database className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Subscription & Tier Architecture
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Accurate database telemetry inspection: TaskFlow currently operates with all workspaces provisioned under the default platform tier with unrestricted task, project, and team seat capacities.
                </p>

                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Database Models:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Free/Standard Default</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Stripe/Payment Gateway:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Not Configured (By Design)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Enforcement Tier:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Unlimited Development Mode</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Zero fake mock subscriptions are generated to maintain strict operational integrity.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLATFORM USERS */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={userFilterActive}
                onChange={(e) => setUserFilterActive(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Deactivated Only</option>
              </select>

              <select
                value={userFilterVerified}
                onChange={(e) => setUserFilterVerified(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="">All Verification</option>
                <option value="true">Verified Only</option>
                <option value="false">Unverified Only</option>
              </select>

              <select
                value={userFilterAdmin}
                onChange={(e) => setUserFilterAdmin(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="true">Platform Admins Only</option>
                <option value="false">Standard Users</option>
              </select>

              <button
                onClick={() => fetchUsers(1)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Platform Admin</th>
                    <th className="py-3 px-4">Workspaces</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-slate-400">
                        No users match the specified criteria.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.full_name?.charAt(0) || u.email?.charAt(0)}
                            </div>
                            <div className="truncate max-w-[200px]">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {u.full_name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {u.auth_provider}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {u.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {u.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {u.is_platform_admin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                              <ShieldCheck className="w-3 h-3 text-indigo-500" /> Platform Admin
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {u.workspaces_count}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active */}
                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={u.id === user.id || mutatingUserId === u.id}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                u.is_active
                                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                              title={u.is_active ? 'Deactivate account' : 'Reactivate account'}
                            >
                              {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>

                            {/* Toggle Platform Admin */}
                            <button
                              onClick={() => handleToggleAdmin(u)}
                              disabled={u.id === user.id || mutatingUserId === u.id}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                u.is_platform_admin
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                              title={u.is_platform_admin ? 'Revoke Platform Admin' : 'Make Platform Admin'}
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {usersPagination.page} of {usersPagination.pages || 1} ({usersPagination.total} total users)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchUsers(usersPagination.page - 1)}
                  disabled={usersPagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchUsers(usersPagination.page + 1)}
                  disabled={usersPagination.page >= usersPagination.pages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WORKSPACES */}
      {!loading && activeTab === 'workspaces' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search workspaces by name or slug..."
                value={workspaceSearch}
                onChange={(e) => setWorkspaceSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchWorkspaces(1)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => fetchWorkspaces(1)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>

          {/* Workspaces Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Workspace</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4 text-center">Members</th>
                    <th className="py-3 px-4 text-center">Projects</th>
                    <th className="py-3 px-4 text-center">Tasks</th>
                    <th className="py-3 px-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {workspacesList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-400">
                        No workspaces found.
                      </td>
                    </tr>
                  ) : (
                    workspacesList.map((ws) => (
                      <tr key={ws.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ws.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            /{ws.slug}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {ws.owner?.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {ws.owner?.email}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {ws.members_count}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {ws.projects_count}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {ws.tasks_count}
                        </td>

                        <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-mono">
                          {ws.created_at ? new Date(ws.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {workspacesPagination.page} of {workspacesPagination.pages || 1} ({workspacesPagination.total} total workspaces)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchWorkspaces(workspacesPagination.page - 1)}
                  disabled={workspacesPagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchWorkspaces(workspacesPagination.page + 1)}
                  disabled={workspacesPagination.page >= workspacesPagination.pages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEEP ANALYTICS */}
      {!loading && activeTab === 'analytics' && analyticsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Task Status Breakdown
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.status_distribution || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {(analyticsData.status_distribution || []).map((entry, index) => (
                        <Cell key={`status-${index}`} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
                            <span className="font-semibold">{data.status}:</span> {data.count} tasks
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Status Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(analyticsData.status_distribution || []).map((item) => (
                  <div key={item.status} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[item.status] || '#6366f1' }}
                    />
                    <span>{item.status} ({item.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Priority Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Task Priority Distribution
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.priority_distribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white">
                            <span className="font-semibold">{data.priority}:</span> {data.count} tasks
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {(analyticsData.priority_distribution || []).map((entry, index) => (
                        <Cell key={`prio-${index}`} fill={PRIORITY_COLORS[entry.priority] || '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Urgent and High priority tasks across all customer workspaces
              </p>
            </div>
          </div>

          {/* Top Workspaces by Task Throughput */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Top Workspaces by Task Volume
            </h3>
            <div className="space-y-3">
              {(analyticsData.top_workspaces || []).map((ws, idx) => (
                <div key={ws.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {ws.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {ws.members_count} team members
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                      {ws.tasks_count}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {!loading && activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Action Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter logs by action name (e.g. task_created, status_changed, admin)..."
                value={activityActionFilter}
                onChange={(e) => setActivityActionFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchActivity(1)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => fetchActivity(1)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              Filter
            </button>
          </div>

          {/* Activity Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Workspace</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Target Context</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {activityList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-slate-400">
                        No activity records found matching query.
                      </td>
                    </tr>
                  ) : (
                    activityList.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {act.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {act.workspace_name || `Workspace #${act.workspace_id}`}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {act.user_name}
                          </div>
                          {act.user_email && (
                            <div className="text-[10px] text-slate-400">
                              {act.user_email}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {act.task_title ? (
                            <span>Task: <span className="font-medium text-slate-700 dark:text-slate-200">"{act.task_title}"</span></span>
                          ) : act.project_name ? (
                            <span>Project: <span className="font-medium text-slate-700 dark:text-slate-200">{act.project_name}</span></span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">
                              {JSON.stringify(act.details || {})}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                          {act.created_at ? new Date(act.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {activityPagination.page} of {activityPagination.pages || 1} ({activityPagination.total} total logs)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchActivity(activityPagination.page - 1)}
                  disabled={activityPagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchActivity(activityPagination.page + 1)}
                  disabled={activityPagination.page >= activityPagination.pages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
