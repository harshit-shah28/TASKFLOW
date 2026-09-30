import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, CheckCircle2 } from 'lucide-react';

export const PublicFooter = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/80 text-slate-400 py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="TaskFlow" className="w-8 h-8 rounded-lg shadow-md" />
              <span className="text-lg font-extrabold tracking-tight text-white">TASKFLOW</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Modern project and workspace management platform designed for high-velocity teams. Plan, execute, and deliver without friction.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </div>
          </div>

          {/* Product Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="hover:text-white transition-colors">
                  Features & Capabilities
                </Link>
              </li>
              <li>
                <Link to="/solutions" className="hover:text-white transition-colors">
                  Solutions by Team
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="hover:text-white transition-colors">
                  Productivity Analytics
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Plans & Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Account & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Access</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Free Account
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-white transition-colors">
                  Reset Password
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition-colors">
                  Workspace Roles
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Trust & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Security & Trust</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Role-based Access Control</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Real Transactional Delivery</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>JWT & Clerk Authentication</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Audit Logging Enabled</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>TASKFLOW &copy; 2026. Modern Project & Team Management Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/features" className="hover:text-slate-400 transition-colors">Overview</Link>
            <Link to="/pricing" className="hover:text-slate-400 transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-slate-400 transition-colors">Sign In</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
