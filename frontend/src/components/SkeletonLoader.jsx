import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>
    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
  </div>
);

export const TaskRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-800 animate-pulse bg-white/50 dark:bg-slate-900/50">
    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-20 ml-auto"></div>
    <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
    <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
  </div>
);

export const BoardColumnSkeleton = () => (
  <div className="w-80 shrink-0 bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 animate-pulse flex flex-col gap-3">
    <div className="flex justify-between items-center mb-2">
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-6"></div>
    </div>
    <div className="h-28 bg-white dark:bg-slate-800/80 rounded-xl"></div>
    <div className="h-28 bg-white dark:bg-slate-800/80 rounded-xl"></div>
    <div className="h-28 bg-white dark:bg-slate-800/80 rounded-xl"></div>
  </div>
);
