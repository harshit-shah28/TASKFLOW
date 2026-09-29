import React, { useState, useEffect } from 'react';
import {
  Sparkles, FolderTree, Search, Database, Layers,
  Activity, GitCommit, ArrowUpDown, CheckCircle2, Play, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const DsaArchitecturePage = () => {
  const { activeWorkspace } = useAuth();
  const { addToast } = useToast();

  const [dsaOverview, setDsaOverview] = useState(null);
  const [heapTasks, setHeapTasks] = useState([]);
  const [loadingHeap, setLoadingHeap] = useState(false);

  useEffect(() => {
    api.get('/dsa/overview').then((res) => setDsaOverview(res.data)).catch(console.error);
  }, []);

  const handleTestHeap = async () => {
    if (!activeWorkspace) return;
    try {
      setLoadingHeap(true);
      const res = await api.get(`/dsa/priority-tasks?workspace_id=${activeWorkspace.id}`);
      setHeapTasks(res.data.prioritized_tasks || []);
      addToast(`Extracted ${res.data.heap_size} tasks from Binary Heap in O(log n) order!`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to extract tasks from Heap.', 'error');
    } finally {
      setLoadingHeap(false);
    }
  };

  const DSA_CARDS = [
    {
      id: 1,
      name: 'N-Ary Tree',
      file: 'backend/dsa/n_ary_tree.py',
      icon: <FolderTree className="w-5 h-5 text-indigo-500" />,
      purpose: 'Models the organizational hierarchy of TaskFlow (Workspace -> Projects -> Folders -> Lists -> Tasks -> Subtasks).',
      why: 'Relational databases store parent IDs, but hierarchical queries (breadcrumbs, recursive tree export, cascade size counts) are naturally modeled as an N-Ary tree with arbitrary child branches.',
      complexity: 'Traversal: O(V + E) DFS/BFS • Subtree Count: O(N) • Path to Root: O(Depth)',
      usage: 'Project Tree View and nested sidebar navigation'
    },
    {
      id: 2,
      name: 'Trie (Prefix Tree)',
      file: 'backend/dsa/trie.py',
      icon: <Search className="w-5 h-5 text-cyan-500" />,
      purpose: 'Fast prefix matching and autocomplete across Tasks, Projects, Users, and Tags.',
      why: 'Full-table SQL LIKE queries become slow as datasets scale. A Trie indexes character sequences and multi-word title tokens so user keystrokes match instantly in O(k) time.',
      complexity: 'Insert: O(L) • Prefix Lookup: O(P + M) where P=prefix length, M=match count',
      usage: 'Global Search Topbar (Ctrl+K) & autocomplete'
    },
    {
      id: 3,
      name: 'Custom Hash Map (Separate Chaining)',
      file: 'backend/dsa/hash_map.py',
      icon: <Database className="w-5 h-5 text-amber-500" />,
      purpose: 'In-memory fast lookup cache for active workspace entities, permissions, and member roles.',
      why: 'Avoids redundant database round-trips for high-frequency permission and task lookups during requests.',
      complexity: 'Average Lookup/Insert: O(1) • Worst Case: O(N) with dynamic doubling rehashing',
      usage: 'Session & workspace permission caching'
    },
    {
      id: 4,
      name: 'Priority Queue (Binary Heap)',
      file: 'backend/dsa/priority_queue.py',
      icon: <Layers className="w-5 h-5 text-rose-500" />,
      purpose: 'Prioritizes urgent work and nearest deadlines in O(log n) time.',
      why: 'Instead of re-sorting all tasks whenever a single task changes priority, a Binary Heap maintains the maximum-urgency item at root index 0.',
      complexity: 'Push: O(log N) • Pop Top: O(log N) • Peek: O(1)',
      usage: 'Dashboard Urgent Tasks extraction & deadline scheduler'
    },
    {
      id: 5,
      name: 'FIFO Event Queue',
      file: 'backend/dsa/event_queue.py',
      icon: <Activity className="w-5 h-5 text-emerald-500" />,
      purpose: 'Thread-safe bounded FIFO buffer for notifications, email delivery jobs, and audit logs.',
      why: 'Decouples primary REST API responses from background notification side-effects, guaranteeing events are processed in strict chronological order.',
      complexity: 'Enqueue: O(1) • Dequeue: O(1)',
      usage: 'Notification pipeline & activity stream buffer'
    },
    {
      id: 6,
      name: 'Dependency Graph (DAG)',
      file: 'backend/dsa/dependency_graph.py',
      icon: <GitCommit className="w-5 h-5 text-purple-500" />,
      purpose: 'Directed Acyclic Graph detecting cycle deadlocks and calculating optimal execution sequence via Kahn’s Topological Sort.',
      why: 'Prevents circular dependencies (e.g., Task A depends on Task B, which depends on Task A) and computes the valid project critical path.',
      complexity: 'Cycle Detection: O(V + E) • Topological Sort: O(V + E)',
      usage: 'Task detail dependency linker & DAG view'
    },
    {
      id: 7,
      name: 'Custom Sorting (MergeSort & QuickSort)',
      file: 'backend/dsa/sorting_utils.py',
      icon: <ArrowUpDown className="w-5 h-5 text-blue-500" />,
      purpose: 'Multi-attribute sorting of tasks and projects by priority, due date, position, or title.',
      why: 'MergeSort provides guaranteed O(N log N) stable sorting (preserving secondary order), while QuickSort provides in-place partitioning.',
      complexity: 'MergeSort: O(N log N) guaranteed stable • QuickSort: Avg O(N log N)',
      usage: 'Task List & Board view custom order filters'
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-800/40 rounded-3xl p-8 backdrop-blur-xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Academic DSA Implementation
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          TaskFlow Data Structures & Algorithms Architecture
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          TaskFlow integrates 7 dedicated custom DSA modules written from scratch. Each data structure solves a concrete architectural challenge in project hierarchy, search, prioritization, and dependency scheduling.
        </p>
      </div>

      {/* Live Interactive Heap Demonstration Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Interactive Test: Live Binary Heap Extraction
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Streams tasks from current workspace into a custom Max-Heap and pops them in strict priority order.
            </p>
          </div>

          <button
            onClick={handleTestHeap}
            disabled={loadingHeap}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {loadingHeap ? 'Heapifying...' : 'Run Heap Extraction'}
          </button>
        </div>

        {heapTasks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {heapTasks.map((t, idx) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Heap Pop #{idx + 1}</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-slate-800 font-bold text-[10px]">
                    {t.priority}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.title}</h4>
                <p className="text-[11px] text-slate-400">{t.project_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7 DSA Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DSA_CARDS.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{card.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">{card.file}</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  DSA #{card.id}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">Purpose</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{card.purpose}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">Why it was chosen</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{card.why}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-500 font-mono">
                <span>Complexity:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{card.complexity}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Active Integration:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{card.usage}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
