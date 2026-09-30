import React from 'react';
import { Link } from 'react-router-dom';
import {
  GitBranch, Kanban, Users, Shield, Zap, Sparkles,
  ArrowRight, CheckCircle2, MessageSquare, Calendar, Layers, Mail
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export const SolutionsPage = () => {
  const solutions = [
    {
      badge: 'For Engineering & Technical Teams',
      icon: GitBranch,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      title: 'Eliminate deadlocks with smart dependency tracking',
      description: 'Ship software on time with transparent task dependencies, blocker alerts, and granular subtask checklists.',
      benefits: [
        'Directed dependency graphs that prevent circular blockers',
        'Prioritization flags (Urgent, High, Medium, Low) for bug triage',
        'Direct file attachments for logs, specs, and screenshots'
      ]
    },
    {
      badge: 'For Product & Project Managers',
      icon: Kanban,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      title: 'Orchestrate roadmaps across multiple views',
      description: 'Gain full sprint visibility with drag-and-drop Kanban boards, chronological calendar deadlines, and hierarchy trees.',
      benefits: [
        'Instant perspective switching between List, Board, and Calendar',
        'Click any calendar date cell to draft tasks with set due dates',
        'Task completion metrics and 48-hour deadline warning radar'
      ]
    },
    {
      badge: 'For Operations & Multi-Client Agencies',
      icon: Layers,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Partition clients cleanly across dedicated workspaces',
      description: 'Keep client projects completely segregated while allowing account managers to switch workspaces in one click.',
      benefits: [
        'Fine-grained roles: Owner, Admin, Member, and read-only Viewer',
        'Secure 7-day email invitations with role pre-assignment',
        'Shared #general channel and 1-on-1 team direct messaging'
      ]
    },
    {
      badge: 'For Remote & Distributed Organizations',
      icon: Mail,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      title: 'Stay aligned asynchronously with real transactional alerts',
      description: 'Keep distributed teammates in sync through verified transactional email notifications and real-time chat.',
      benefits: [
        'Branded email delivery powered by Resend HTTP API & SMTP',
        'Zero fake notifications: physical socket delivery tracking',
        'Automatic workspace enrollment when invited members sign up'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="relative pt-16 pb-12 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/20 to-cyan-500/15 blur-3xl pointer-events-none rounded-full -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-purple-400">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Tailored Solutions for Every Team
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Built to adapt to the way <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              your organization delivers.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Whether managing complex software engineering dependencies, cross-client agency portfolios, or remote sprint teams — TaskFlow provides the exact structure you need.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all text-sm cursor-pointer"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm"
            >
              Explore All Features
            </Link>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {solutions.map((sol, idx) => {
              const Icon = sol.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-5 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {sol.badge}
                      </span>
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${sol.color}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">{sol.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{sol.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-300">Key Capabilities:</p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {sol.benefits.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
            Find the right flow for your team today.
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Free forever for small teams. No credit card required. Upgrade as your delivery velocity accelerates.
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
