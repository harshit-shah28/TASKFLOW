import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          let bg = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (toast.type === 'success') {
            bg = 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-600 dark:text-emerald-400';
          } else if (toast.type === 'error') {
            bg = 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100';
            Icon = AlertCircle;
            iconColor = 'text-rose-600 dark:text-rose-400';
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100';
            Icon = AlertTriangle;
            iconColor = 'text-amber-600 dark:text-amber-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5 max-w-md ${bg}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
