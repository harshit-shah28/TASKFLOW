import React, { useState, useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';

export const AppLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDueDate, setCreateTaskDueDate] = useState('');
  const [activeModalTaskId, setActiveModalTaskId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleOpenCreateTask = (dueDate = '') => {
    setCreateTaskDueDate(typeof dueDate === 'string' ? dueDate : '');
    setIsCreateTaskOpen(true);
  };

  const handleCloseCreateTask = () => {
    setIsCreateTaskOpen(false);
    setCreateTaskDueDate('');
  };

  // Watch for ?task=<id> in URL query string to open task modal directly
  useEffect(() => {
    const taskIdParam = searchParams.get('task');
    if (taskIdParam) {
      setActiveModalTaskId(parseInt(taskIdParam));
    }
  }, [searchParams]);

  // Global Ctrl+K / Cmd+K listener for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenTask = (taskOrId) => {
    const id = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
    setActiveModalTaskId(id);
    setSearchParams((prev) => {
      prev.set('task', String(id));
      return prev;
    });
  };

  const handleCloseTaskModal = () => {
    setActiveModalTaskId(null);
    setSearchParams((prev) => {
      prev.delete('task');
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-row">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenCreateTask={() => handleOpenCreateTask('')}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet context={{ onOpenTask: handleOpenTask, onOpenCreateTask: handleOpenCreateTask, refreshKey, triggerRefresh }} />
        </main>
      </div>

      {/* Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTask={handleOpenTask}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        defaultDueDate={createTaskDueDate}
        onClose={handleCloseCreateTask}
        onTaskCreated={() => {
          triggerRefresh();
        }}
      />

      {activeModalTaskId && (
        <TaskDetailModal
          taskId={activeModalTaskId}
          isOpen={Boolean(activeModalTaskId)}
          onClose={handleCloseTaskModal}
          onTaskUpdated={() => {
            triggerRefresh();
          }}
          onTaskDeleted={() => {
            handleCloseTaskModal();
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
};
