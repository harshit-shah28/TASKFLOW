import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isClerkEnabled } = useAuth();

  if (!token && isClerkEnabled) {
    const qs = searchParams.toString();
    return <Navigate to={`/forgot-password${qs ? '?' + qs : ''}`} replace />;
  }

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Missing or invalid reset token from URL link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });
      setSuccess(true);
      addToast('Password reset successfully! You can now log in.', 'success');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Token may be expired or used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img src="/logo.svg" alt="TaskFlow" className="w-10 h-10 rounded-xl shadow-md" />
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              TASKFLOW
            </span>
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Set New Password</h1>
          <p className="text-xs text-slate-500">Create a secure new password for your account</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Password Updated</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your password has been changed. You can now sign in with your new credentials.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Sign In Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating password...' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
