import React from 'react';
import { FolderPlus, CheckCircle2, Search, Inbox, AlertCircle } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderPlus,
  title = "No items yet",
  description = "Get started by creating your first entry.",
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/40 dark:bg-slate-900/40 my-6">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/30">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
