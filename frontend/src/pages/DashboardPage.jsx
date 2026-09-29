import React, { useState, useEffect } from 'react';
import {
  CheckSquare, Clock, AlertTriangle, Calendar, Layers, Users,
  TrendingUp, ArrowUpRight, Plus, Activity, Sparkles
} from 'lucide-react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CardSkeleton } from '../components/SkeletonLoader';
import { Link, useOutletContext } from 'react-router-dom';

const STATUS_COLORS = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  'Review': '#f59e0b',
  'Blocked': '#ef4444',
  'Completed': '#10b981',
};

const PRIORITY_COLORS = {
  'Urgent': '#ef4444',
  'High': '#f59e0b',
  'Normal': '#6366f1',
  'Low': '#94a3b8',
};

const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const name = item.name || label || item.payload?.name || item.payload?.priority;
  const color = item.payload?.fill || item.color || STATUS_COLORS[name] || PRIORITY_COLORS[name] || '#6366f1';
  const val = item.value ?? 0;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 shadow-xl text-xs space-y-1 pointer-events-none z-50">
      <div className="font-semibold text-slate-200">
        {name}
      </div>
      <div className="flex items-center gap-2 text-slate-300">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono font-bold text-white">
          {val} {val === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const { activeWorkspace, user } = useAuth();
  const { onOpenCreateTask, onOpenTask, refreshKey } = useOutletContext() || {};

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/dashboard?workspace_id=${activeWorkspace.id}`);
        setMetrics(res.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [activeWorkspace, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const overview = metrics?.overview || {};
  const statusData = metrics?.status_distribution || [];
  const priorityData = metrics?.priority_distribution || [];
  const projectProgress = metrics?.project_progress || [];
  const recentActivities = metrics?.recent_activities || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry and productivity metrics for <strong className="text-slate-700 dark:text-slate-300">{activeWorkspace?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateTask}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-3">
            {overview.total_tasks || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{overview.completion_rate || 0}% Completion Rate</span>
          </div>
        </div>

        {/* Assigned to Me */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned To Me</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-3">
            {overview.assigned_to_me || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pending your review/action</div>
        </div>

        {/* Due Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Due Today</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-3">
            {overview.due_today || 0}
          </div>
          <div className="text-xs text-amber-600 font-semibold mt-1">Requires focus today</div>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overdue Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-3">
            {overview.overdue_tasks || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Past scheduled deadline</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Status Distribution</h2>
          <p className="text-xs text-slate-400 mb-4">Breakdown across development lifecycle</p>

          <div className="h-56 w-full flex items-center justify-center">
            {statusData.reduce((acc, curr) => acc + curr.value, 0) === 0 ? (
              <div className="text-xs text-slate-400 text-center">No tasks recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart style={{ outline: 'none' }}>
                  <Pie
                    data={statusData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={statusData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                  >
                    {statusData
                      .filter((d) => d.value > 0)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name] || '#6366f1'}
                          stroke="none"
                          style={{ outline: 'none' }}
                        />
                      ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] }}></span>
                <span>{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Priority Hierarchy</h2>
          <p className="text-xs text-slate-400 mb-4">Task urgency distribution across active workload</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                style={{ outline: 'none' }}
              >
                <XAxis
                  dataKey="priority"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  content={<CustomChartTooltip />}
                  cursor={false}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} stroke="none">
                  {priorityData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={PRIORITY_COLORS[entry.priority] || '#6366f1'}
                      stroke="none"
                      style={{ outline: 'none' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>Priority breakdown</span>
            <span className="text-slate-400">Real-time scheduling</span>
          </div>
        </div>

        {/* Project Completion Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Active Projects</h2>
          <p className="text-xs text-slate-400 mb-4">Task delivery and milestone completion</p>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {projectProgress.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-10">No active projects</div>
            ) : (
              projectProgress.map((proj) => (
                <div key={proj.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      to={`/projects/${proj.id}`}
                      className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[180px]"
                    >
                      {proj.name}
                    </Link>
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      {proj.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${proj.percentage}%`,
                        backgroundColor: proj.color || '#6366f1',
                      }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>{proj.completed} of {proj.total} tasks completed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Workspace Activity Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Workspace Activity</h2>
          </div>
          <span className="text-xs text-slate-400">Live Activity Stream</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {recentActivities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No recent activity recorded</div>
          ) : (
            recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                    {act.user_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{act.user_name}</span>{' '}
                    <span className="text-slate-500">{act.action?.replace('_', ' ')}</span>{' '}
                    {act.task_title && (
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">"{act.task_title}"</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
