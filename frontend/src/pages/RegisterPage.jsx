import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { useSignUp } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

// Component for when Clerk is active in environment
const ClerkRegisterForm = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { loginWithClerk } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resending, setResending] = useState(false);

  // Live password strength checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  // Step 1: Initiate signup with Clerk
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements.');
      return;
    }
    if (!isLoaded || !signUp) {
      setError('Authentication service is initializing. Please try again.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create sign up with Clerk
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
      });

      // Prepare email verification code
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setIsVerifying(true);
      addToast(`Verification email sent to ${email.trim()}. Please enter your code.`, 'info');
    } catch (err) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify email code with Clerk
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!isLoaded || !signUp) return;

    setError('');
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });

        // Retrieve Clerk session token
        let clerkToken = '';
        try {
          clerkToken = await completeSignUp.createdSession?.getToken();
        } catch (tErr) {
          // Token will be extracted from session
        }

        // Sync with TaskFlow backend
        await loginWithClerk(
          completeSignUp.createdUserId,
          email.trim(),
          fullName.trim(),
          clerkToken
        );

        addToast('Email verified successfully! Welcome to TaskFlow.', 'success');
        const redirect = searchParams.get('redirect');
        navigate(redirect || '/dashboard');
      } else {
        setError('Verification not complete. Please check the code and try again.');
      }
    } catch (err) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Verification failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email code via Clerk
  const handleResendCode = async () => {
    if (!isLoaded || !signUp || resending) return;
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
      addToast('A new verification code has been dispatched to your email.', 'success');
    } catch (err) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to resend code.';
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
            {isVerifying ? 'Verify your email' : 'Create your account'}
          </h1>
          <p className="text-xs text-slate-500">
            {isVerifying
              ? `Check your inbox for the code sent to ${email}`
              : 'Launch your collaborative project management workspace'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isVerifying ? (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Sarah Jenkins"
                    required
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@company.com"
                    required
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {password.length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Contains at least one letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Contains at least one number
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Get Started Free'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500">
                  Please enter the 6-digit code sent to:
                </p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {email}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full text-center text-2xl font-mono tracking-widest font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length < 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                >
                  {resending ? 'Sending code...' : "Didn't receive code? Resend"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVerifying(false)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Edit details
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

// Component for when Clerk is not configured (graceful offline / test fallback)
const StandardRegisterForm = () => {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(fullName.trim(), email.trim(), password);
      addToast('Welcome to TaskFlow! Personal workspace created & verification email dispatched.', 'success');
      const redirect = searchParams.get('redirect');
      navigate(redirect || '/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
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
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Create your account</h1>
          <p className="text-xs text-slate-500">Launch your collaborative project management workspace</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  required
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  required
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {password.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Contains at least one letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Contains at least one number
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Get Started Free'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const { isClerkEnabled } = useAuth();
  if (isClerkEnabled) {
    return <ClerkRegisterForm />;
  }
  return <StandardRegisterForm />;
};
