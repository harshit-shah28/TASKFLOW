import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useOutletContext } from 'react-router-dom';
import {
  Kanban as KanbanIcon, List as ListIcon, Calendar as CalendarIcon,
  Plus, Search, Filter, ArrowUpDown, ChevronDown, ChevronRight, CheckCircle2,
  AlertTriangle, Clock, Flag, User, Tag, Sparkles, GitCommit,
  FolderTree, CheckSquare, Layers, Folder
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { CardSkeleton, TaskRowSkeleton, BoardColumnSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';

const KANBAN_COLUMNS = ['To Do', 'In Progress', 'Review', 'Blocked', 'Completed'];

const STATUS_PILL_STYLES = {
  'To Do': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  'In Progress': 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'Review': 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Blocked': 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  'Completed': 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

const PRIORITY_BADGES = {
  'Urgent': 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
  'High': 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  'Normal': 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
  'Low': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

const NODE_TYPE_CONFIG = {
  project: {
    icon: Layers,
    iconColor: 'text-indigo-500',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    label: 'Project',
  },
  folder: {
    icon: Folder,
    iconColor: 'text-purple-500',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    label: 'Folder',
  },
  list: {
    icon: ListIcon,
    iconColor: 'text-blue-500',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    label: 'List',
  },
  task: {
    icon: CheckSquare,
    iconColor: 'text-emerald-500',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    label: 'Task',
  },
  subtask: {
    icon: CheckCircle2,
    iconColor: 'text-slate-400',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    label: 'Subtask',
  },
};

const HierarchyTreeNode = ({ node, level = 0, onOpenTask, tasks = [] }) => {
  const [expanded, setExpanded] = useState(true);
  if (!node) return null;

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.list;
  const IconComponent = config.icon;
  const isTask = node.type === 'task';

  const handleClick = () => {
    if (isTask && onOpenTask) {
      const numericId = parseInt(String(node.id).replace('task-', ''), 10);
      const fullTask = tasks.find((t) => t.id === numericId) || {
        id: numericId,
        title: node.title,
        status: node.data?.status || 'To Do',
        priority: node.data?.priority || 'Normal',
        due_date: node.data?.due_date,
      };
      onOpenTask(fullTask);
    } else if (hasChildren) {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div className="space-y-1">
      <div
        onClick={handleClick}
        className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 transition-all ${
          isTask
            ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
            : hasChildren
            ? 'cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
            : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}

          <IconComponent className={`w-4 h-4 shrink-0 ${config.iconColor}`} />

          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {node.title}
          </span>

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${config.badgeClass}`}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {node.data?.status && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${STATUS_PILL_STYLES[node.data.status] || ''}`}>
              {node.data.status}
            </span>
          )}
          {node.data?.priority && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${PRIORITY_BADGES[node.data.priority] || ''}`}>
              {node.data.priority}
            </span>
          )}
          {hasChildren && (
            <span className="text-[11px] font-mono text-slate-400">
              {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="pl-6 ml-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-1">
          {node.children.map((child) => (
            <HierarchyTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onOpenTask={onOpenTask}
              tasks={tasks}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ProjectViewPage = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const listParam = searchParams.get('list');
  const { onOpenTask, onOpenCreateTask, refreshKey } = useOutletContext() || {};
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('list'); // 'list' | 'kanban' | 'calendar' | 'tree' | 'dag'

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('position'); // 'position' | 'priority' | 'due_date' | 'title'
  const [sortOrder, setSortOrder] = useState('asc');

  // Hierarchy Tree & DAG state
  const [treeData, setTreeData] = useState(null);
  const [dagAnalysis, setDagAnalysis] = useState(null);

  const fetchProjectAndTasks = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/tasks?project_id=${projectId}&sort_by=${sortBy}&sort_order=${sortOrder}`),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data || []);
    } catch (err) {
      addToast(err.message || 'Failed to load project details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectAndTasks();
    }
  }, [projectId, sortBy, sortOrder, refreshKey]);

  // Load Tree or DAG when those views are selected
  useEffect(() => {
    if (activeView === 'tree' && projectId) {
      api.get(`/projects/${projectId}/tree`).then((res) => setTreeData(res.data)).catch(console.error);
    }
    if (activeView === 'dag' && projectId) {
      api.get(`/dsa/dependency-analysis?project_id=${projectId}`).then((res) => setDagAnalysis(res.data)).catch(console.error);
    }
  }, [activeView, projectId, refreshKey]);

  // Status Change (for Kanban & List checkboxes)
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
      addToast(`Moved to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (listParam && String(t.task_list_id) !== String(listParam)) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, listParam, statusFilter, priorityFilter, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3 animate-pulse"></div>
        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse"></div>
        <div className="space-y-2">
          <TaskRowSkeleton />
          <TaskRowSkeleton />
          <TaskRowSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Project Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{ backgroundColor: project?.color || '#6366f1' }}
          >
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {project?.name}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {project?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              {project?.description || 'No description provided for this project space.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* View Switcher Tabs & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'list'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" /> List
          </button>

          <button
            onClick={() => setActiveView('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" /> Board
          </button>

          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Calendar
          </button>

          <button
            onClick={() => setActiveView('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'tree'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" /> Hierarchy
          </button>

          <button
            onClick={() => setActiveView('dag')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'dag'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" /> Dependencies
          </button>
        </div>

        {/* Filters and Sorting (shown in List & Board) */}
        {(activeView === 'list' || activeView === 'kanban') && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              {KANBAN_COLUMNS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="position">Sort: Position</option>
              <option value="priority">Sort: Priority</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="title">Sort: Title</option>
              <option value="created_at">Sort: Created</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: LIST VIEW */}
      {activeView === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks match the filter"
              description="Create a new task or adjust your active filters."
              actionText="+ Create Task"
              onAction={onOpenCreateTask}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">Task Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Assignees</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Subtasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={t.status === 'Completed'}
                          onChange={() =>
                            handleUpdateStatus(t.id, t.status === 'Completed' ? 'To Do' : 'Completed')
                          }
                          className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {t.title}
                        </div>
                        {t.task_list_name && (
                          <span className="text-[10px] text-slate-400">{t.task_list_name}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            STATUS_PILL_STYLES[t.status] || ''
                          } focus:outline-hidden`}
                        >
                          {KANBAN_COLUMNS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          PRIORITY_BADGES[t.priority] || ''
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {(t.assignees || []).map((a) => (
                            <span
                              key={a.id}
                              title={a.full_name}
                              className="inline-flex items-center justify-center shrink-0 w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-900 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] leading-none select-none text-center"
                            >
                              {a.full_name?.charAt(0)}
                            </span>
                          ))}
                          {(!t.assignees || t.assignees.length === 0) && (
                            <span className="text-slate-400 text-xs">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {t.subtasks_count > 0 ? `${t.subtasks_count} subtasks` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD */}
      {activeView === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {KANBAN_COLUMNS.map((columnStatus) => {
            const columnTasks = filteredTasks.filter((t) => t.status === columnStatus);

            return (
              <div
                key={columnStatus}
                className="w-80 shrink-0 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {columnStatus}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={onOpenCreateTask}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 p-1">
                  {columnTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No {columnStatus} tasks
                    </div>
                  ) : (
                    columnTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onOpenTask(t)}
                        className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            PRIORITY_BADGES[t.priority] || ''
                          }`}>
                            {t.priority}
                          </span>
                          {/* Quick Column Shift Dropdown */}
                          <select
                            value={t.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                            className="text-[10px] bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-1 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-hidden"
                          >
                            {KANBAN_COLUMNS.map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2">
                          {t.title}
                        </h4>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400">
                          <div className="flex items-center gap-1 text-[11px]">
                            <CalendarIcon className="w-3 h-3 text-slate-400" />
                            <span>
                              {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
                            </span>
                          </div>

                          <div className="flex items-center -space-x-1.5">
                            {(t.assignees || []).map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] leading-none select-none text-center ring-1 ring-white dark:ring-slate-800"
                              >
                                {a.full_name?.charAt(0)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: CALENDAR VIEW */}
      {activeView === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            <span>Tasks by Scheduled Due Date</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTasks
              .filter((t) => t.due_date)
              .map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTask(t)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40 hover:border-indigo-500 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {new Date(t.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border ${PRIORITY_BADGES[t.priority]}`}>
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.title}</h4>
                  <div className="text-xs text-slate-400">{t.status}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 4: HIERARCHY TREE VIEW */}
      {activeView === 'tree' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-500" />
                Project Hierarchy & Structure
              </h3>
              <p className="text-xs text-slate-400">
                Hierarchical breakdown of Project &rarr; Folders &rarr; Lists &rarr; Tasks &rarr; Subtasks
              </p>
            </div>
            {treeData?.dsa_metrics && (
              <div className="flex gap-3 text-xs font-mono text-slate-500">
                <span>Folders: {treeData.dsa_metrics.total_folders}</span>
                <span>Lists: {treeData.dsa_metrics.total_lists}</span>
                <span>Tasks: {treeData.dsa_metrics.total_tasks}</span>
                <span>Subtasks: {treeData.dsa_metrics.total_subtasks}</span>
              </div>
            )}
          </div>

          {!treeData ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading project hierarchy...
            </div>
          ) : !treeData.tree || (Array.isArray(treeData.tree.children) && treeData.tree.children.length === 0 && !treeData.tree.title) ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No hierarchy elements found in this project.
            </div>
          ) : (
            <div className="space-y-2">
              <HierarchyTreeNode
                node={treeData.tree}
                onOpenTask={onOpenTask}
                tasks={tasks}
              />
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: TASK DEPENDENCIES VIEW */}
      {activeView === 'dag' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-amber-500" />
                Task Dependencies & Execution Path
              </h3>
              <p className="text-xs text-slate-400">
                Evaluates task blockers and calculates optimal workflow sequence.
              </p>
            </div>
            {dagAnalysis && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  dagAnalysis.has_cycle ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {dagAnalysis.has_cycle ? 'Circular Dependency Detected' : 'All Dependencies Clear'}
                </span>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Recommended Task Execution Sequence
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {(dagAnalysis?.recommended_execution_sequence || []).map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{step.title}</span>
                  </div>
                  {idx < dagAnalysis.recommended_execution_sequence.length - 1 && (
                    <span className="text-slate-400 font-bold">&rarr;</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
