import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers, Kanban, Calendar, ShieldCheck, Zap, Sparkles, Users, Mail,
  BarChart3, Clock, CheckCircle2, MessageSquare, Paperclip, Search,
  GitBranch, ArrowRight, Shield, FolderTree
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export const FeaturesPage = () => {
  const featureCategories = [
    {
      icon: Layers,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      title: 'Workspace & Role Management',
      description: 'Isolate client accounts or internal departments across dedicated workspaces with fine-grained access control.',
      points: [
        'Multi-workspace architecture with one-click switching',
        'Owner, Admin, Member, and Viewer role hierarchy',
        'Workspace member directory with role promotion & removal'
      ]
    },
    {
      icon: Kanban,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      title: 'Dynamic Kanban & Task Workflows',
      description: 'Visualize project progress through flexible status columns from backlog conception to verified delivery.',
      points: [
        'Drag-and-drop card movements across status lanes',
        'Custom priorities: Urgent, High, Medium, and Low',
        'Subtask checklists and assignees with avatar badges'
      ]
    },
    {
      icon: Calendar,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Calendar Schedule & Date Selection',
      description: 'Schedule milestones and click any date cell to immediately draft tasks with pre-populated deadlines.',
      points: [
        'Interactive monthly schedule grid with today highlight',
        'Click-to-create task for any date on the calendar',
        'Overdue indicators and upcoming 48-hour alerts'
      ]
    },
    {
      icon: FolderTree,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      title: 'Hierarchy & Structural Tree View',
      description: 'Break complex epics down into manageable lists, tasks, and subtasks using hierarchical organization.',
      points: [
        'Folder, list, and task multi-level organizational trees',
        'Clean node expansion and depth visualizer',
        'Maintains structure as project complexity scales'
      ]
    },
    {
      icon: GitBranch,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Smart Dependency Engine',
      description: 'Connect dependent tasks, detect blocking bottlenecks, and prevent circular execution deadlocks.',
      points: [
        'Directed acyclic dependency graphs between tasks',
        'Automatic cycle detection to prevent deadlocks',
        'Real-time blocker alerts when predecessor tasks are delayed'
      ]
    },
    {
      icon: MessageSquare,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      title: 'Real-Time Team Chat & Channels',
      description: 'Contextual communication built directly into each workspace so teams collaborate in real time.',
      points: [
        'Default #general workspace channel with auto-enrollment',
        'Direct 1-on-1 team messaging with unread badges',
        'Multi-format file attachments up to 30MB (images, docs, video)'
      ]
    },
    {
      icon: Mail,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Real Transactional Emails & Invites',
      description: 'Deliver branded notifications and secure invitation links powered by Resend HTTP API and SMTP.',
      points: [
        'Branded HTML invitation emails with 7-day token expiration',
        'Automatic workspace enrollment upon recipient registration',
        'Resend API & SMTP delivery with audit log tracking'
      ]
    },
    {
      icon: ShieldCheck,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      title: 'Enterprise Authentication & Security',
      description: 'Secure access with Clerk authentication, social single sign-on, and complete password reset flows.',
      points: [
        'Clerk email verification and session token handling',
        'Continue with Google and GitHub one-click login',
        'Email code verification for self-service password reset'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="relative pt-16 pb-14 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/15 to-cyan-500/15 blur-3xl pointer-events-none rounded-full -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Complete Platform Capabilities
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Engineered for high velocity. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Every tool your team needs.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            TaskFlow combines workspace multi-tenancy, interactive Kanban & Calendar views, dependency tracking, real-time chat, and verified transactional emails into a single cohesive platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all text-sm cursor-pointer"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-sm"
            >
              Sign In to Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 hover:border-slate-600/80 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${cat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{cat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
                  </div>
                  <ul className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                    {cat.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Views Highlight */}
      <section className="py-16 px-6 border-t border-slate-800 bg-slate-900/60">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Three Perspective Views</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Work the way that suits your style</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Switch effortlessly between structured list execution, fluid Kanban boards, and chronological schedule calendars without losing task state.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Layers className="w-4 h-4" /> List Execution
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filter by assignee, tag, or due date. Quickly check off subtasks, view priority badges, and reorder items in real time.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Kanban className="w-4 h-4" /> Visual Kanban
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organize work into custom status lanes. Drag tasks between columns to update backend status instantly with zero latency.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Calendar className="w-4 h-4" /> Schedule Calendar
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monthly timeline showing task density per day. Click any date cell to draft and assign a task directly for that exact day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-900/50 space-y-6 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ready to experience TaskFlow in action?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Create your first workspace in 30 seconds. Invite teammates, organize boards, and accelerate your project delivery today.
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
