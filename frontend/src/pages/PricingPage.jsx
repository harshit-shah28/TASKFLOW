import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, ArrowRight, Sparkles, Shield, Zap, HelpCircle,
  CheckCircle2, X
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export const PricingPage = () => {
  const [annualBilling, setAnnualBilling] = useState(true);

  const plans = [
    {
      name: 'Starter',
      badge: 'Free Forever',
      price: '$0',
      period: 'forever',
      description: 'Ideal for individuals, freelancers, and small projects exploring TaskFlow.',
      highlight: false,
      features: [
        'Up to 3 active projects',
        'Unlimited tasks & subtasks',
        'List, Kanban, and Calendar views',
        'In-app notification center',
        'Community discussion support',
        'Single workspace access'
      ],
      ctaText: 'Get Started Free',
      ctaLink: '/register',
      ctaStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
    },
    {
      name: 'Pro Team',
      badge: 'Most Popular',
      price: annualBilling ? '$10' : '$12',
      period: 'per user / month',
      description: 'Designed for fast-moving teams that require real-time chat, dependencies, and email alerts.',
      highlight: true,
      features: [
        'Unlimited workspaces & projects',
        'Real-time team chat & channels',
        'Hierarchy tree & folder structure',
        'Smart dependency blocker engine',
        'Real transactional emails (Resend)',
        '30MB multi-format file attachments',
        'Workspace role management (Owner, Admin, Member)'
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaLink: '/register',
      ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
    },
    {
      name: 'Enterprise',
      badge: 'Advanced Scale',
      price: annualBilling ? '$24' : '$29',
      period: 'per user / month',
      description: 'For growing organizations needing comprehensive audit logging, custom roles, and priority support.',
      highlight: false,
      features: [
        'Everything in Pro Team included',
        'Comprehensive audit logs (EmailLog & activities)',
        'Dedicated onboarding & priority support',
        'Advanced workspace permission controls',
        'Custom SSO integration with Clerk',
        '99.9% uptime SLA commitment'
      ],
      ctaText: 'Contact Sales',
      ctaLink: 'mailto:sales@taskflow.dev?subject=TaskFlow Enterprise Inquiry',
      ctaStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
    }
  ];

  const comparisonFeatures = [
    { name: 'Active Workspaces', starter: '1 Workspace', pro: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Active Projects', starter: '3 Projects', pro: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'List & Kanban Views', starter: true, pro: true, enterprise: true },
    { name: 'Calendar Date Creation', starter: true, pro: true, enterprise: true },
    { name: 'Hierarchy Tree & Depth', starter: false, pro: true, enterprise: true },
    { name: 'Dependency Blocker Graph', starter: false, pro: true, enterprise: true },
    { name: 'Real-Time Team Chat', starter: false, pro: true, enterprise: true },
    { name: 'File Attachments', starter: false, pro: 'Up to 30MB', enterprise: 'Up to 30MB' },
    { name: 'Transactional Email Delivery', starter: false, pro: 'Resend API & SMTP', enterprise: 'Resend API & Dedicated' },
    { name: 'Member Roles & Invitations', starter: 'Member only', pro: 'Owner, Admin, Member', enterprise: 'Custom Roles & RBAC' },
    { name: 'Audit & Activity Logs', starter: false, pro: 'Standard', enterprise: 'Full Historical Audit' }
  ];

  const faqs = [
    {
      q: 'Do I need a credit card to start the trial?',
      a: 'No. You can sign up, create your workspace, and invite teammates without entering any payment information.'
    },
    {
      q: 'How does team workspace invitation work?',
      a: 'Workspace admins generate secure 7-day invitation links or dispatch real transactional emails via Resend. Recipients click the link or register to auto-join the workspace.'
    },
    {
      q: 'Can I switch between monthly and annual billing?',
      a: 'Yes. You can toggle billing cadences anytime from your workspace settings with pro-rated adjustments.'
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. All authentication is secured with industry-standard Clerk JWT tokens, role-based authorization, and encrypted credential storage.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/15 to-cyan-500/15 blur-3xl pointer-events-none rounded-full -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Transparent, Predictable Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Simple plans for teams of <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              any size and velocity.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Start free, invite your team, and scale as your delivery needs expand. No hidden fees or surprise overages.
          </p>

          {/* Billing Switch */}
          <div className="pt-4 flex items-center justify-center gap-3 text-xs">
            <span className={`font-semibold ${!annualBilling ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
            <button
              onClick={() => setAnnualBilling(!annualBilling)}
              className="w-12 h-6 rounded-full bg-slate-800 border border-slate-700 p-0.5 flex items-center transition-colors cursor-pointer"
              aria-label="Toggle annual billing"
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-indigo-500 transition-transform ${
                  annualBilling ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className={`font-semibold flex items-center gap-1.5 ${annualBilling ? 'text-white' : 'text-slate-400'}`}>
              Annual
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                Save 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-8 flex flex-col justify-between transition-all ${
                plan.highlight
                  ? 'bg-slate-800/80 border-2 border-indigo-500/80 shadow-2xl shadow-indigo-600/20 relative'
                  : 'bg-slate-800/40 border border-slate-700/80 hover:border-slate-600'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                  {plan.badge}
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {!plan.highlight && (
                      <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400">{plan.period}</span>
                </div>

                <div className="pt-4 border-t border-slate-700/60 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Included Features:</p>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((f, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                {plan.ctaLink.startsWith('http') || plan.ctaLink.startsWith('mailto') ? (
                  <a
                    href={plan.ctaLink}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${plan.ctaStyle}`}
                  >
                    {plan.ctaText} <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <Link
                    to={plan.ctaLink}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all ${plan.ctaStyle}`}
                  >
                    {plan.ctaText} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Detailed Breakdown</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Compare Plan Capabilities</h3>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/40 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-300">
                    <th className="py-4 px-6 font-bold">Platform Feature</th>
                    <th className="py-4 px-6 font-bold text-center">Starter ($0)</th>
                    <th className="py-4 px-6 font-bold text-center text-indigo-400">Pro Team</th>
                    <th className="py-4 px-6 font-bold text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {comparisonFeatures.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-white">{row.name}</td>
                      <td className="py-3.5 px-6 text-center">
                        {typeof row.starter === 'boolean' ? (
                          row.starter ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />
                        ) : (
                          row.starter
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center font-semibold text-slate-100 bg-indigo-500/5">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />
                        ) : (
                          row.pro
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-slate-600 mx-auto" />
                        ) : (
                          row.enterprise
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing FAQs */}
      <section className="py-16 px-6 border-t border-slate-800 bg-slate-900/60">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Common Questions</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, fIdx) => (
              <div key={fIdx} className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};
