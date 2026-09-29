import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CheckSquare, Folder, User, Tag, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const GlobalSearchModal = ({ isOpen, onClose, onSelectTask }) => {
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], projects: [], users: [], tags: [] });
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ tasks: [], projects: [], users: [], tags: [] });
      setTotalMatches(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeWorkspace || !query.trim()) {
      setResults({ tasks: [], projects: [], users: [], tags: [] });
      setTotalMatches(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/search?workspace_id=${activeWorkspace.id}&q=${encodeURIComponent(query.trim())}`);
        setResults(res.data.results || { tasks: [], projects: [], users: [], tags: [] });
        setTotalMatches(res.data.total_matches || 0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen, activeWorkspace]);

  // Handle keyboard shortcut Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectTask = (task) => {
    onClose();
    if (onSelectTask) {
      onSelectTask(task);
    } else {
      navigate(`/projects/${task.project_id}?task=${task.id}`);
    }
  };

  const handleSelectProject = (project) => {
    onClose();
    navigate(`/projects/${project.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, members, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Results Area */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {loading && (
            <div className="text-center py-8 text-sm text-slate-400 animate-pulse">
              Searching workspace...
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="py-10 text-center text-slate-400 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400 opacity-60" />
              <p>Type to search across the entire workspace instantly</p>
              <p className="text-xs text-slate-500 mt-1">Quickly locate tasks, projects, teammates, and tags</p>
            </div>
          )}

          {!loading && query.trim() && totalMatches === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              <p>No matches found for <strong className="text-slate-700 dark:text-slate-300">"{query}"</strong></p>
              <p className="text-xs text-slate-500 mt-1">Try another keyword or search by project title</p>
            </div>
          )}

          {/* Group: Tasks */}
          {!loading && results.tasks?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                Tasks ({results.tasks.length})
              </div>
              <div className="space-y-1">
                {results.tasks.map((task) => (
                  <div
                    key={`task-${task.id}`}
                    onClick={() => handleSelectTask(task)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{task.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {task.priority}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Projects */}
          {!loading && results.projects?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                Projects ({results.projects.length})
              </div>
              <div className="space-y-1">
                {results.projects.map((proj) => (
                  <div
                    key={`proj-${proj.id}`}
                    onClick={() => handleSelectProject(proj)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: proj.color || '#6366f1' }}></div>
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                          {proj.title}
                        </div>
                        <div className="text-xs text-slate-400">{proj.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Members */}
          {!loading && results.users?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                Team Members ({results.users.length})
              </div>
              <div className="space-y-1">
                {results.users.map((mem) => (
                  <div
                    key={`user-${mem.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
                        {mem.title?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{mem.title}</div>
                        <div className="text-xs text-slate-400">{mem.email}</div>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
                      {mem.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group: Tags */}
          {!loading && results.tags?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                Tags ({results.tags.length})
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                {results.tags.map((tag) => (
                  <span
                    key={`tag-${tag.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border"
                    style={{
                      borderColor: `${tag.color}40`,
                      backgroundColor: `${tag.color}15`,
                      color: tag.color || '#6366f1'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }}></span>
                    #{tag.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> to select
            </span>
            <span>ESC to close</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 font-medium">Quick Search</span>
        </div>
      </div>
    </div>
  );
};
