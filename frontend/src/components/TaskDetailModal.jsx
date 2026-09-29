import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, Flag, CheckCircle2, User, Tag,
  MessageSquare, Trash2, Plus, GitCommit, AlertTriangle, Send, CheckSquare
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const STATUS_COLORS = {
  'To Do': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  'In Progress': 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'Review': 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Blocked': 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  'Completed': 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

const PRIORITY_COLORS = {
  'Urgent': 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
  'High': 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
  'Normal': 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
  'Low': 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
};

export const TaskDetailModal = ({ taskId, isOpen, onClose, onTaskUpdated, onTaskDeleted }) => {
  const { user: currentUser, activeWorkspace } = useAuth();
  const { addToast } = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allTasksInProject, setAllTasksInProject] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [selectedDepTaskId, setSelectedDepTaskId] = useState('');
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'

  useEffect(() => {
    if (!isOpen || !taskId) return;

    const loadTask = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/tasks/${taskId}`);
        const t = res.data;
        setTask(t);
        setTitle(t.title || '');
        setDescription(t.description || '');

        // Fetch sibling tasks for dependencies dropdown
        if (t.project_id) {
          const sibRes = await api.get(`/tasks?project_id=${t.project_id}`);
          setAllTasksInProject((sibRes.data || []).filter((s) => s.id !== t.id));
        }

        // Fetch workspace members for assignees
        if (activeWorkspace) {
          const memRes = await api.get(`/workspaces/${activeWorkspace.id}/members`);
          setWorkspaceMembers(memRes.data || []);
        }
      } catch (err) {
        addToast(err.message || 'Failed to load task details.', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId, isOpen, activeWorkspace, addToast, onClose]);

  if (!isOpen) return null;

  // Update Status
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      setTask(res.data);
      if (onTaskUpdated) onTaskUpdated(res.data);
      addToast(`Status changed to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Update Priority
  const handlePriorityChange = async (newPriority) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/priority`, { priority: newPriority });
      setTask(res.data);
      if (onTaskUpdated) onTaskUpdated(res.data);
      addToast(`Priority changed to ${newPriority}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update priority', 'error');
    }
  };

  // Save Title / Description updates
  const handleSaveDetails = async () => {
    try {
      const res = await api.put(`/tasks/${task.id}`, {
        title: title.trim(),
        description: description.trim(),
      });
      setTask(res.data);
      if (onTaskUpdated) onTaskUpdated(res.data);
      addToast('Task details saved.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save changes.', 'error');
    }
  };

  // Add Subtask
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!subtaskInput.trim()) return;
    try {
      const res = await api.post(`/tasks/${task.id}/subtasks`, { title: subtaskInput.trim() });
      const updatedSubtasks = [...(task.subtasks || []), res.data];
      const updatedTask = { ...task, subtasks: updatedSubtasks };
      setTask(updatedTask);
      if (onTaskUpdated) onTaskUpdated(updatedTask);
      setSubtaskInput('');
      addToast('Subtask added', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to add subtask', 'error');
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    try {
      const res = await api.post('/comments', {
        task_id: task.id,
        content: commentInput.trim(),
      });
      setTask((prev) => ({
        ...prev,
        comments: [res.data, ...(prev.comments || [])],
      }));
      setCommentInput('');
      addToast('Comment posted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to post comment', 'error');
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setTask((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== commentId),
      }));
      addToast('Comment removed', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to remove comment', 'error');
    }
  };

  // Add Dependency (with live DAG cycle warning)
  const handleAddDependency = async () => {
    if (!selectedDepTaskId) return;
    try {
      const res = await api.post(`/tasks/${task.id}/dependencies`, {
        depends_on_task_id: parseInt(selectedDepTaskId),
        dependency_type: 'waiting_on',
      });
      setTask(res.data);
      if (onTaskUpdated) onTaskUpdated(res.data);
      setSelectedDepTaskId('');
      addToast('Dependency linked successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Cannot add dependency: circular blocker detected.', 'error');
    }
  };

  // Remove Dependency
  const handleRemoveDependency = async (depTaskId) => {
    try {
      const res = await api.delete(`/tasks/${task.id}/dependencies/${depTaskId}`);
      setTask(res.data);
      if (onTaskUpdated) onTaskUpdated(res.data);
      addToast('Dependency removed', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to remove dependency', 'error');
    }
  };

  // Assign Member
  const handleToggleAssignee = async (memberUserId) => {
    const isAssigned = (task.assignees || []).some((a) => a.id === memberUserId);
    try {
      if (isAssigned) {
        const res = await api.delete(`/tasks/${task.id}/assignees/${memberUserId}`);
        setTask(res.data);
        if (onTaskUpdated) onTaskUpdated(res.data);
      } else {
        const res = await api.post(`/tasks/${task.id}/assignees`, { user_id: memberUserId });
        setTask(res.data);
        if (onTaskUpdated) onTaskUpdated(res.data);
        addToast('Assignee added and notified via email/app', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update assignee', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      addToast('Task deleted successfully', 'success');
      if (onTaskDeleted) onTaskDeleted(task.id);
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to delete task', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400">TASK-{task?.id}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {task?.project_name || 'Project'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              title="Delete Task"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading task details...</div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Left 2 Cols: Main Content */}
            <div className="md:col-span-2 p-6 space-y-6">
              {/* Title input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveDetails}
                  className="w-full text-xl font-bold bg-transparent text-slate-900 dark:text-slate-100 border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-hidden pb-1"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSaveDetails}
                  placeholder="Add a detailed description, notes, or instructions..."
                  rows={4}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Subtasks ({task?.subtasks?.length || 0})
                  </label>
                </div>
                
                <div className="space-y-1.5 mb-3">
                  {(task?.subtasks || []).map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={sub.status === 'Completed'}
                          onChange={() => {
                            const newStatus = sub.status === 'Completed' ? 'To Do' : 'Completed';
                            api.patch(`/tasks/${sub.id}/status`, { status: newStatus }).then(() => {
                              setTask((prev) => {
                                const updated = {
                                  ...prev,
                                  subtasks: prev.subtasks.map((s) =>
                                    s.id === sub.id ? { ...s, status: newStatus } : s
                                  ),
                                };
                                if (onTaskUpdated) onTaskUpdated(updated);
                                return updated;
                              });
                            });
                          }}
                          className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span
                          className={`text-sm ${
                            sub.status === 'Completed'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {sub.title}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new subtask..."
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    className="flex-1 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </form>
              </div>

              {/* Task Dependencies */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-amber-500" />
                  Task Dependencies
                </label>

                {task?.dependencies?.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {task.dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-900 dark:text-amber-200">
                            Waiting on:
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {dep.depends_on_task_title || `Task #${dep.depends_on_task_id}`}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-slate-800 text-[10px] text-slate-500">
                            {dep.depends_on_task_status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(dep.depends_on_task_id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={selectedDepTaskId}
                    onChange={(e) => setSelectedDepTaskId(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    <option value="">Select task that blocks this task...</option>
                    {allTasksInProject.map((s) => (
                      <option key={s.id} value={s.id}>
                        #{s.id} - {s.title} ({s.status})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddDependency}
                    disabled={!selectedDepTaskId}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl disabled:opacity-40 cursor-pointer"
                  >
                    Link Blocker
                  </button>
                </div>
              </div>

              {/* Discussion & Comments */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                      activeTab === 'comments'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Discussion ({task?.comments?.length || 0})
                  </button>
                </div>

                {/* New Comment Box */}
                <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Write a comment... (Type @name to mention a teammate)"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Post
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3">
                  {(task?.comments || []).map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                            {comm.author_name?.charAt(0) || 'U'}
                          </span>
                          {comm.author_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {comm.user_id === currentUser?.id && (
                            <button
                              onClick={() => handleDeleteComment(comm.id)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {comm.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Metadata & Attributes */}
            <div className="p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/30">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Status
                </label>
                <select
                  value={task?.status || 'To Do'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border ${STATUS_COLORS[task?.status || 'To Do']} focus:outline-hidden`}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">In Review</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Priority
                </label>
                <select
                  value={task?.priority || 'Normal'}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border ${PRIORITY_COLORS[task?.priority || 'Normal']} focus:outline-hidden`}
                >
                  <option value="Urgent">Urgent (Critical)</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Assignees
                </label>
                <div className="space-y-1 mb-2">
                  {(task?.assignees || []).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">{a.full_name}</span>
                      <button onClick={() => handleToggleAssignee(a.id)} className="text-slate-400 hover:text-rose-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleToggleAssignee(parseInt(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="">+ Assign team member...</option>
                  {workspaceMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.full_name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates & Hours */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Due Date:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {task?.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'No due date'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Created By:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {task?.creator_name || 'System'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Created At:</span>
                  <span className="font-medium text-slate-500">
                    {task?.created_at ? new Date(task.created_at).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
