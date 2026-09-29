import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, ArrowRight, Layers, Kanban, Calendar,
  ShieldCheck, Zap, Sparkles, Users, Mail, BarChart3, Clock, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="TaskFlow" className="w-9 h-9 rounded-xl shadow-lg" />
            <span className="text-xl font-extrabold tracking-tight">TASKFLOW</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Enterprise SaaS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#analytics" className="hover:text-white transition-colors">Analytics</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Glow gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-cyan-500/20 blur-3xl pointer-events-none rounded-full -z-10"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Modern Workspace, Project & Productivity Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Plan, collaborate, and execute with <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">zero friction.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            From granular task subtasks and visual Kanban boards to dependency tracking and real transactional email notifications — TaskFlow empowers teams to deliver faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all text-sm cursor-pointer"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm"
            >
              Explore Workspace
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> No credit card required
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> Real transactional email support
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" /> Real-time dependency tracking
            </span>
          </div>
        </div>

        {/* Dashboard Preview Graphic */}
        <div id="analytics" className="max-w-5xl mx-auto mt-14 rounded-2xl border border-slate-700 bg-slate-800/60 p-2 shadow-2xl backdrop-blur-xl scroll-mt-24">
          <div className="bg-slate-950 rounded-xl p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span className="text-xs text-slate-500 font-mono ml-2">taskflow.app / dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                  Sprint Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">Completed Tasks</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">84.2%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">28 of 33 tasks</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">Active Sprints</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">4 Projects</div>
                <div className="text-[11px] text-slate-500 mt-0.5">8 team members</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">Upcoming Deadlines</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">3 Tasks</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Next 48 hours</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">Notifications Sent</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">99.9% Delivered</div>
                <div className="text-[11px] text-slate-500 mt-0.5">In-app & Email</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 border-t border-slate-800 bg-slate-900/50 scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Engineered for High-Velocity Teams</h2>
            <h3 className="text-3xl font-extrabold text-white">Everything you need to deliver on time</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Hierarchical Organization</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Workspaces &rarr; Projects &rarr; Folders &rarr; Task Lists &rarr; Tasks &rarr; Subtasks. Maintain structure regardless of organization scale.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Real Transactional Emails</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Task assignments, mentions, comments, and deadline alerts dispatch styled notifications via email and in-app updates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">Smart Dependency Tracking</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Identify blockers, prevent scheduling deadlocks, and calculate optimal execution sequences automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        <p>TASKFLOW &copy; 2026. Modern Project & Team Management Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};
