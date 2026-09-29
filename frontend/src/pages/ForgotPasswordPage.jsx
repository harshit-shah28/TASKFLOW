import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSignIn } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../services/api';

// Clerk-powered password reset flow
const ClerkForgotPasswordForm = () => {
  const { isLoaded, signIn } = useSignIn();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Send reset code to email via Clerk
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!isLoaded || !signIn) {
      setError('Authentication service is initializing. Please try again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setStep('verify');
      addToast(`Password reset verification code sent to ${email.trim()}.`, 'info');
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Failed to initiate password reset.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and set new password with Clerk
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isLoaded || !signIn) return;

    setError('');
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });

      if (result.status === 'complete') {
        // Attempt to sync new password with TaskFlow backend database as well
        let clerkToken = '';
        try {
          clerkToken = await result.createdSession?.getToken();
        } catch (tErr) {
          // Token extraction error ignored
        }

        if (result.createdUserId) {
          try {
            await api.post('/auth/clerk-sync', {
              clerk_user_id: result.createdUserId,
              email: email.trim(),
              password: password,
              token: clerkToken,
            });
          } catch (syncErr) {
            // Non-blocking sync error
          }
        }

        setSuccess(true);
        addToast('Password reset successfully! You can now sign in.', 'success');
      } else {
        setError('Password reset was not completed. Please check your verification code.');
      }
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Failed to reset password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend reset code via Clerk
  const handleResendCode = async () => {
    if (!isLoaded || !signIn || resending) return;
    setResending(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      addToast('A new reset verification code has been dispatched to your email.', 'info');
    } catch (err) {
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        'Failed to resend reset code.';
      setError(msg);
    } finally {
      setResending(false);
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
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {success
              ? 'Password Updated'
              : step === 'verify'
              ? 'Set New Password'
              : 'Reset Password'}
          </h1>
          <p className="text-xs text-slate-500">
            {success
              ? 'Your password has been changed successfully'
              : step === 'verify'
              ? `Enter the 6-digit code sent to ${email} and your new password`
              : "Enter your registered email and we'll send you a verification code"}
          </p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your password has been changed successfully. You can now sign in with your new credentials.
              </p>
              <Link
                to={`/login?email=${encodeURIComponent(email)}`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Sign In Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : step === 'verify' ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {resending ? 'Resending...' : 'Resend Code'}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={6}
                    className="w-full text-sm font-mono tracking-wider bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

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
                {loading ? 'Updating password...' : 'Update Password'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setError('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Use a different email address
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
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
                {loading ? 'Sending code...' : 'Send Reset Code'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

// Fallback form for offline / standard backend token environments
const StandardForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
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
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Reset Password</h1>
          <p className="text-xs text-slate-500">We'll send you a secure link to reset your account password</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Check your inbox</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                If an account with <strong>{email}</strong> exists, we've sent password reset instructions.
              </p>
              <Link
                to="/login"
                className="inline-block pt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
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
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  const { isClerkEnabled } = useAuth();
  if (isClerkEnabled) {
    return <ClerkForgotPasswordForm />;
  }
  return <StandardForgotPasswordForm />;
};
