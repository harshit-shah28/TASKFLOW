import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import api from '../services/api';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing from the URL link.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setSuccess(true);
      } catch (err) {
        setError(err.message || 'Email verification link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <img src="/logo.svg" alt="TaskFlow" className="w-10 h-10 rounded-xl shadow-md" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            TASKFLOW
          </span>
        </Link>

        {loading && (
          <div className="py-8 space-y-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Verifying your email...</h2>
            <p className="text-xs text-slate-500">Connecting with the TaskFlow security service</p>
          </div>
        )}

        {!loading && success && (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Email Verified! 🎉</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your TaskFlow account has been verified. You now have full access to workspace collaboration.
            </p>
            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Verification Failed</h2>
            <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
