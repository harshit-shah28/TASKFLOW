import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const CalendarPage = () => {
  const { activeWorkspace } = useAuth();
  const { onOpenTask, onOpenCreateTask, refreshKey } = useOutletContext() || {};
  const { addToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/tasks?workspace_id=${activeWorkspace.id}`);
        setTasks(res.data || []);
      } catch (err) {
        addToast(err.message || 'Failed to load calendar tasks.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [activeWorkspace, refreshKey]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group tasks by day number in current month
  const tasksByDay = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    let taskYear, taskMonth, taskDay;
    if (typeof t.due_date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(t.due_date)) {
      const parts = t.due_date.slice(0, 10).split('-');
      taskYear = parseInt(parts[0], 10);
      taskMonth = parseInt(parts[1], 10) - 1;
      taskDay = parseInt(parts[2], 10);
    } else {
      const d = new Date(t.due_date);
      taskYear = d.getFullYear();
      taskMonth = d.getMonth();
      taskDay = d.getDate();
    }
    if (taskYear === year && taskMonth === month) {
      if (!tasksByDay[taskDay]) tasksByDay[taskDay] = [];
      tasksByDay[taskDay].push(t);
    }
  });

  const daysGrid = [];
  // Empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push({ type: 'empty', key: `empty-${i}` });
  }
  // Days of current month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    daysGrid.push({ type: 'day', day, key: `day-${day}`, tasks: tasksByDay[day] || [] });
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Calendar Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual milestone and deadline schedule for {activeWorkspace?.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onOpenCreateTask && onOpenCreateTask('')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Day of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-3">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {daysGrid.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="min-h-24 bg-slate-50/40 dark:bg-slate-950/20 p-2"></div>;
            }

            const isToday = isCurrentMonth && today.getDate() === cell.day;
            const pad = (n) => String(n).padStart(2, '0');
            const cellDateStr = `${year}-${pad(month + 1)}-${pad(cell.day)}`;

            return (
              <div
                key={cell.key}
                onClick={() => onOpenCreateTask && onOpenCreateTask(cellDateStr)}
                className={`min-h-24 p-2 transition-colors flex flex-col justify-between cursor-pointer ${
                  isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white font-extrabold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.tasks.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {cell.tasks.length}
                    </span>
                  )}
                </div>

                {/* Tasks in cell */}
                <div className="space-y-1 overflow-y-auto max-h-16">
                  {cell.tasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenTask) onOpenTask(t);
                      }}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 cursor-pointer"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {cell.tasks.length > 3 && (
                    <span className="text-[9px] text-slate-400 block px-1">
                      +{cell.tasks.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
