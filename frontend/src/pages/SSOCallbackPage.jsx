import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthenticateWithRedirectCallback, useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const ClerkSSOCallbackHandler = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useClerkAuth();
  const { loginWithClerk } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || syncing) return;

    let isMounted = true;
    const completeSSOSync = async () => {
      setSyncing(true);
      try {
        let clerkToken = '';
        try {
          clerkToken = await getToken();
        } catch (tErr) {
          console.warn('Could not retrieve Clerk JWT during SSO sync:', tErr);
        }

        const primaryEmail =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          '';

        const fullName =
          user.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          (primaryEmail ? primaryEmail.split('@')[0] : 'User');

        await loginWithClerk(user.id, primaryEmail, fullName, clerkToken);

        if (isMounted) {
          addToast(`Welcome to TaskFlow, ${fullName}!`, 'success');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('SSO sync failed:', err);
        if (isMounted) {
          setError(err.message || 'Failed to complete Google authentication.');
        }
      } finally {
        if (isMounted) {
          setSyncing(false);
        }
      }
    };

    completeSSOSync();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, user, syncing, getToken, loginWithClerk, navigate, addToast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2.5">
          <img src="/logo.svg" alt="TaskFlow" className="w-10 h-10 rounded-xl shadow-md" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            TASKFLOW
          </span>
        </div>

        {error ? (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-lg font-bold">
              !
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Authentication Error
            </h2>
            <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto"></div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Completing Google sign-in...
            </h2>
            <p className="text-xs text-slate-500">
              Synchronizing your secure workspace with TaskFlow
            </p>
            {/* AuthenticateWithRedirectCallback handles OAuth redirect tokens from Clerk */}
            <div className="hidden">
              <AuthenticateWithRedirectCallback
                signInForceRedirectUrl="/sso-callback"
                signUpForceRedirectUrl="/sso-callback"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SSOCallbackPage = () => {
  const { isClerkEnabled } = useAuth();
  if (!isClerkEnabled) {
    return <Navigate to="/login" replace />;
  }
  return <ClerkSSOCallbackHandler />;
};
