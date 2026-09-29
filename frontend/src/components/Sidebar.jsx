import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Inbox, Calendar, Folder, List,
  ChevronRight, ChevronDown, Plus, Settings, ChevronLeft,
  Sparkles, Layers, ShieldCheck, Mail
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const { activeWorkspace } = useAuth();
  const { totalInboxUnread, unreadCount } = useNotifications();
  const displayInboxUnread = totalInboxUnread !== undefined ? totalInboxUnread : unreadCount;
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [loading, setLoading] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Fetch projects for active workspace
  useEffect(() => {
    if (!activeWorkspace) return;
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/projects?workspace_id=${activeWorkspace.id}`);
        setProjects(res.data || []);
      } catch (err) {
        console.error('Failed to load projects for sidebar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [activeWorkspace]);

  const toggleProjectExpand = async (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));

    // If expanding and project hierarchy not yet fetched in full
    if (!expandedProjects[projectId]) {
      try {
        const res = await api.get(`/projects/${projectId}`);
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, ...res.data } : p))
        );
      } catch (err) {
        console.error('Failed to fetch project hierarchy:', err);
      }
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim() || !activeWorkspace) return;

    try {
      const res = await api.post('/projects', {
        workspace_id: activeWorkspace.id,
        name: newProjectName.trim(),
        color: '#6366f1',
      });
      setProjects((prev) => [...prev, res.data]);
      setNewProjectName('');
      setIsCreatingProject(false);
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-18' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src="/logo.svg" alt="TaskFlow" className="w-8 h-8 shrink-0 rounded-lg shadow-xs" />
            {!isCollapsed && (
              <div className="truncate">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                  TASKFLOW
                </span>
                <span className="text-[10px] font-bold uppercase ml-1.5 px-1.5 py-0.5 rounded-sm bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  SaaS
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Main Primary Links */}
          <div className="space-y-1">
            <NavLink to="/dashboard" onClick={onCloseMobile} className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-500" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>

            <NavLink to="/my-tasks" onClick={onCloseMobile} className={navLinkClass}>
              <CheckSquare className="w-4 h-4 shrink-0 text-emerald-500" />
              {!isCollapsed && <span>My Tasks</span>}
            </NavLink>

            <NavLink to="/inbox" onClick={onCloseMobile} className={navLinkClass}>
              <div className="relative">
                <Inbox className="w-4 h-4 shrink-0 text-amber-500" />
                {displayInboxUnread > 0 && isCollapsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500"></span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Inbox</span>
                  {displayInboxUnread > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {displayInboxUnread}
                    </span>
                  )}
                </div>
              )}
            </NavLink>

            <NavLink to="/calendar" onClick={onCloseMobile} className={navLinkClass}>
              <Calendar className="w-4 h-4 shrink-0 text-blue-500" />
              {!isCollapsed && <span>Calendar</span>}
            </NavLink>
          </div>

          {/* Spaces & Projects Section */}
          <div>
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Projects & Spaces
                </span>
                <button
                  onClick={() => setIsCreatingProject(!isCreatingProject)}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Create Project"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Project Creation Form */}
            {isCreatingProject && !isCollapsed && (
              <form onSubmit={handleCreateProject} className="px-2 mb-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Projects Hierarchy List */}
            <div className="space-y-0.5">
              {projects.map((proj) => {
                const isExpanded = expandedProjects[proj.id];
                const isProjActive = location.pathname.startsWith(`/projects/${proj.id}`);

                return (
                  <div key={proj.id} className="space-y-0.5">
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer group ${
                        isProjActive
                          ? 'bg-slate-100 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div
                        onClick={() => {
                          navigate(`/projects/${proj.id}`);
                          onCloseMobile();
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-md shrink-0"
                          style={{ backgroundColor: proj.color || '#6366f1' }}
                        ></span>
                        {!isCollapsed && <span className="truncate">{proj.name}</span>}
                      </div>

                      {!isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProjectExpand(proj.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Sub-hierarchy (Folders & Lists) */}
                    {isExpanded && !isCollapsed && (
                      <div className="pl-6 pr-2 py-1 space-y-1 text-xs border-l-2 border-slate-100 dark:border-slate-800 ml-4 animate-in fade-in duration-150">
                        {/* Folders */}
                        {(proj.folders || []).map((f) => (
                          <div key={`folder-${f.id}`} className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-1 font-medium">
                              <Folder className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="truncate">{f.name}</span>
                            </div>
                            {/* Lists in folder */}
                            {(f.lists || []).map((l) => (
                              <div
                                key={`list-${l.id}`}
                                onClick={() => {
                                  navigate(`/projects/${proj.id}?list=${l.id}`);
                                  onCloseMobile();
                                }}
                                className="pl-4 py-1 flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              >
                                <List className="w-3 h-3 shrink-0" />
                                <span className="truncate">{l.name}</span>
                              </div>
                            ))}
                          </div>
                        ))}

                        {/* Root Lists */}
                        {(proj.root_lists || []).map((l) => (
                          <div
                            key={`root-list-${l.id}`}
                            onClick={() => {
                              navigate(`/projects/${proj.id}?list=${l.id}`);
                              onCloseMobile();
                            }}
                            className="flex items-center gap-2 py-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-medium"
                          >
                            <List className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{l.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Settings */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
            <NavLink to="/settings" onClick={onCloseMobile} className={navLinkClass}>
              <Settings className="w-4 h-4 shrink-0 text-slate-500" />
              {!isCollapsed && <span>Settings</span>}
            </NavLink>
          </div>
        </div>

        {/* Footer Workspace Info */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="truncate">{activeWorkspace?.name}</span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected
            </span>
          </div>
        )}
      </aside>
    </>
  );
};
