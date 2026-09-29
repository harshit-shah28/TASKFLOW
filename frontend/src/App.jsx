import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { SSOCallbackPage } from './pages/SSOCallbackPage';

// Protected pages
import { DashboardPage } from './pages/DashboardPage';
import { ProjectViewPage } from './pages/ProjectViewPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { InboxPage } from './pages/InboxPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { DsaArchitecturePage } from './pages/DsaArchitecturePage';

// Protected route guard
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Redirect if already authenticated
const PublicOnlyRoute = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
};

export const App = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/sso-callback" element={<SSOCallbackPage />} />

      {/* Authenticated Application Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects/:projectId" element={<ProjectViewPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/dsa" element={<DsaArchitecturePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
