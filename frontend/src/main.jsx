import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/Toast';
import App from './App';
import './index.css';

const clerkPublishableKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();
const isClerkConfigured = clerkPublishableKey.startsWith('pk_');

const RootApp = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider isClerkEnabled={isClerkConfigured}>
        <NotificationProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <RootApp />
      </ClerkProvider>
    ) : (
      <RootApp />
    )}
  </React.StrictMode>
);
