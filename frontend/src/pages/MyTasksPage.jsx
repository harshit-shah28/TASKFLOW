import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckSquare, AlertTriangle, Calendar, Clock, Plus, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { TaskRowSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';

export const MyTasksPage = () => {
  const { user, activeWorkspace } = useAuth();
  const { onOpenTask, onOpenCreateTask, refreshKey } = useOutletContext() || {};
  const { addToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyTasks = async () => {
    if (!user || !activeWorkspace) return;
    try {
      setLoading(true);
      const res = await api.get(`/tasks?workspace_id=${activeWorkspace.id}&assignee_id=${user.id}`);
      setTasks(res.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load assigned tasks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user, activeWorkspace, refreshKey]);

  const handleToggleStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Completed' ? 'To Do' : 'Completed';
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
      addToast(`Task marked as ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update task', 'error');
    }
  };

  // Group tasks by timeline category
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const overdue = tasks.filter((t) => t.status !== 'Completed' && t.due_date && t.due_date < now.toISOString());
  const dueToday = tasks.filter((t) => t.status !== 'Completed' && t.due_date && t.due_date.startsWith(todayStr));
  const upcoming = tasks.filter((t) => t.status !== 'Completed' && (!t.due_date || (t.due_date > now.toISOString() && !t.due_date.startsWith(todayStr))));
  const completed = tasks.filter((t) => t.status === 'Completed');

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
      </div>
    );
  }

  const renderSection = (title, icon, items, colorClass) => {
    if (items.length === 0) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span className={colorClass}>{icon}</span>
          <span>{title} ({items.length})</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {items.map((t) => (
            <div
              key={t.id}
              onClick={() => onOpenTask(t)}
              className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={t.status === 'Completed'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => handleToggleStatus(t.id, t.status)}
                  className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div>
                  <h4 className={`font-semibold ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                    {t.title}
                  </h4>
                  <span className="text-[11px] text-slate-400">{t.project_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {t.priority}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            My Assigned Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">Personalized productivity pipeline</p>
        </div>

        <button
          onClick={onOpenCreateTask}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="You currently have no tasks assigned to you in this workspace."
          actionText="+ Create & Assign Task"
          onAction={onOpenCreateTask}
        />
      ) : (
        <div className="space-y-6">
          {renderSection('Overdue', <AlertTriangle className="w-4 h-4" />, overdue, 'text-rose-500')}
          {renderSection('Due Today', <Calendar className="w-4 h-4" />, dueToday, 'text-amber-500')}
          {renderSection('Upcoming / Backlog', <Clock className="w-4 h-4" />, upcoming, 'text-blue-500')}
          {renderSection('Completed', <CheckSquare className="w-4 h-4" />, completed, 'text-emerald-500')}
        </div>
      )}
    </div>
  );
};
