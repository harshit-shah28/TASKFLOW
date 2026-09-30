import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BarChart3, Clock, AlertTriangle, CheckCircle2,
  Sparkles, Layers, ArrowRight, Activity, Users, Shield, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export const AnalyticsPage = () => {
  const { user } = useAuth();

  const analyticsPillars = [
    {
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Sprint Velocity & Completion Tracking',
      description: 'Track how quickly your team moves work from backlog to completion with real-time percentage indicators.',
      metrics: ['Task completion velocity percentages', 'Active sprint throughput tracking', 'Closed vs in-progress ratios']
    },
    {
      icon: AlertTriangle,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Bottleneck & Blocker Identification',
      description: 'Isolate blocked tasks and dependency deadlocks early, keeping high-priority deliverables on schedule.',
      metrics: ['Critical path dependency alerts', '48-hour deadline risk warnings', 'Overdue task indicators']
    },
    {
      icon: Users,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      title: 'Team Workload Distribution',
      description: 'Balance workload evenly across your workspace members to prevent burnout and maintain steady velocity.',
      metrics: ['Assignee task distribution metrics', 'Role-based capacity oversight', 'Departmental workspace partitioning']
    },
    {
      icon: Activity,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      title: 'Audit Logs & Notification Delivery',
      description: 'Audit every operational event in your workspace from task status transitions to real transactional email delivery.',
      metrics: ['Full workspace activity event streams', 'Email delivery audit tracking via Resend/SMTP', 'Invitation acceptance logs']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="relative pt-16 pb-14 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-600/20 via-indigo-600/20 to-purple-600/15 blur-3xl pointer-events-none rounded-full -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Productivity & Operational Intelligence
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Real-time insight. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Zero guesswork.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Gain immediate visibility into team workload, project throughput, status distributions, and milestone deadlines across your entire workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all text-sm cursor-pointer"
              >
                View Live Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all text-sm cursor-pointer"
                >
                  Explore Analytics Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Live Interactive Analytics Preview Graphic */}
      <section className="py-8 px-6">
        <div className="max-w-5xl mx-auto rounded-2xl border border-slate-700 bg-slate-800/60 p-3 shadow-2xl backdrop-blur-xl">
          <div className="bg-slate-950 rounded-xl p-5 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span className="text-xs text-slate-400 font-mono ml-2">TaskFlow Productivity Radar</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Status: Healthy
              </span>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Completion Rate</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">84.2%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">28 of 33 tasks finished</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Urgent Priorities</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">2 Tasks</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Assigned to team leads</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Upcoming Deadlines</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">3 Due Soon</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Next 48-hour window</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Notification Delivery</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">99.9% Sent</div>
                <div className="text-[11px] text-slate-500 mt-0.5">In-app & Resend email</div>
              </div>
            </div>

            {/* Workflow distribution visual */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Sprint Status Distribution</span>
                <span>33 Total Tasks</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: '55%' }} title="Completed (55%)"></div>
                <div className="bg-indigo-500 h-full" style={{ width: '25%' }} title="In Progress (25%)"></div>
                <div className="bg-amber-500 h-full" style={{ width: '12%' }} title="Review (12%)"></div>
                <div className="bg-slate-600 h-full" style={{ width: '8%' }} title="Backlog (8%)"></div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed (18)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> In Progress (8)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Review (4)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-600"></span> To Do (3)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Pillars Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Four Core Pillars</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Actionable metrics for every team level</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsPillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${p.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-white">{p.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                  <ul className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    {p.metrics.map((m, mIdx) => (
                      <li key={mIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 border-t border-slate-800 bg-slate-900/60">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Transform raw project data into delivery confidence.
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Get instant dashboard analytics across all your projects with zero manual setup.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all text-sm cursor-pointer"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
