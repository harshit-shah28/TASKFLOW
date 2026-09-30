import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, User, Clock, Layers } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, defaultProjectId, defaultListId, defaultDueDate = '' }) => {
  const { activeWorkspace } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [status, setStatus] = useState('To Do');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDueDate(defaultDueDate || '');
    if (!activeWorkspace) return;

    const loadData = async () => {
      try {
        const [projRes, memRes] = await Promise.all([
          api.get(`/projects?workspace_id=${activeWorkspace.id}`),
          api.get(`/workspaces/${activeWorkspace.id}/members`),
        ]);

        const projs = projRes.data || [];
        setProjects(projs);
        setMembers(memRes.data || []);

        const initialProjId = defaultProjectId || (projs.length > 0 ? String(projs[0].id) : '');
        setSelectedProjectId(initialProjId);

        if (defaultListId) {
          setSelectedListId(String(defaultListId));
        } else if (projs.length > 0) {
          // Fetch project details to get root lists
          const pDetails = await api.get(`/projects/${initialProjId}`);
          const lists = pDetails.data?.root_lists || [];
          if (lists.length > 0) {
            setSelectedListId(String(lists[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load project details for modal:', err);
      }
    };

    loadData();
  }, [isOpen, activeWorkspace, defaultProjectId, defaultListId, defaultDueDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Task title is required.', 'error');
      return;
    }
    if (!selectedProjectId) {
      addToast('Please select a project.', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        project_id: parseInt(selectedProjectId),
        task_list_id: selectedListId ? parseInt(selectedListId) : null,
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        due_date: dueDate ? `${dueDate}T23:59:59Z` : null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : 0.0,
        assignee_ids: selectedAssigneeIds.map(Number),
      };

      const res = await api.post('/tasks', payload);
      addToast(`Task "${res.data.title}" created successfully!`, 'success');
      if (onTaskCreated) onTaskCreated(res.data);
      onClose();

      // Reset
      setTitle('');
      setDescription('');
      setDueDate('');
      setEstimatedHours('');
      setSelectedAssigneeIds([]);
    } catch (err) {
      addToast(err.message || 'Failed to create task.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              +
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Create New Task</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Task title or summary..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-lg font-semibold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <textarea
              placeholder="Add description, acceptance criteria, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-500" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Urgent">Urgent (Critical)</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-500" /> Estimated (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 4.0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Assignees Selection */}
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-500" /> Assign To Team Member(s)
              </label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                {members.map((m) => {
                  const isSelected = selectedAssigneeIds.includes(String(m.user_id));
                  return (
                    <button
                      type="button"
                      key={m.user_id}
                      onClick={() => {
                        const idStr = String(m.user_id);
                        setSelectedAssigneeIds((prev) =>
                          isSelected ? prev.filter((id) => id !== idStr) : [...prev, idStr]
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold inline-flex items-center justify-center shrink-0 leading-none select-none text-center">
                        {m.user?.full_name?.charAt(0) || 'U'}
                      </span>
                      {m.user?.full_name || 'Member'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
