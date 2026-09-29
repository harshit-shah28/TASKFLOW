import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children, isClerkEnabled = false }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('taskflow_token') || null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Switch active workspace and persist in localStorage
  const setActiveWorkspace = useCallback((ws) => {
    if (!ws) return;
    setActiveWorkspaceState(ws);
    localStorage.setItem('taskflow_active_workspace_id', String(ws.id));
  }, []);

  // Fetch current user and accessible workspaces
  const fetchCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem('taskflow_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      const userWorkspaces = response.data.workspaces || [];

      setUser(userData);
      setWorkspaces(userWorkspaces);

      // Restore active workspace or choose first
      const savedWsId = localStorage.getItem('taskflow_active_workspace_id');
      const found = userWorkspaces.find((w) => String(w.id) === String(savedWsId));
      if (found) {
        setActiveWorkspaceState(found);
      } else if (userWorkspaces.length > 0) {
        setActiveWorkspace(userWorkspaces[0]);
      }
    } catch (err) {
      console.error('Failed to restore authentication session:', err);
      localStorage.removeItem('taskflow_token');
      setToken(null);
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
    } finally {
      setLoading(false);
    }
  }, [setActiveWorkspace]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Login handler
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser, workspaces: userWorkspaces } = response.data;

    localStorage.setItem('taskflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setWorkspaces(userWorkspaces || []);

    if (userWorkspaces && userWorkspaces.length > 0) {
      setActiveWorkspace(userWorkspaces[0]);
    }
    return response;
  };

  // Register handler
  const register = async (fullName, email, password) => {
    const response = await api.post('/auth/register', {
      full_name: fullName,
      email,
      password,
    });
    const { token: newToken, user: newUser, default_workspace } = response.data;

    localStorage.setItem('taskflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (default_workspace) {
      setWorkspaces([default_workspace]);
      setActiveWorkspace(default_workspace);
    }
    return response;
  };

  // OAuth complete handler
  const loginWithOAuthToken = (newToken, newUser, userWorkspaces = []) => {
    localStorage.setItem('taskflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setWorkspaces(userWorkspaces);
    if (userWorkspaces.length > 0) {
      setActiveWorkspace(userWorkspaces[0]);
    }
  };

  // Clerk authentication sync handler
  const loginWithClerk = async (clerkUserId, email, fullName, clerkToken = '') => {
    const response = await api.post('/auth/clerk-sync', {
      clerk_user_id: clerkUserId,
      email,
      full_name: fullName,
      token: clerkToken
    });
    const { token: newToken, user: newUser, workspaces: userWorkspaces, default_workspace } = response.data;

    localStorage.setItem('taskflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
    const wsList = userWorkspaces && userWorkspaces.length > 0 ? userWorkspaces : (default_workspace ? [default_workspace] : []);
    setWorkspaces(wsList);

    if (wsList.length > 0) {
      setActiveWorkspace(wsList[0]);
    }
    return response;
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_active_workspace_id');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
  };

  // Refresh profile or workspaces after edits
  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const addWorkspaceToState = (newWs) => {
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspace(newWs);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workspaces,
        activeWorkspace,
        loading,
        isClerkEnabled,
        login,
        register,
        loginWithClerk,
        loginWithOAuthToken,
        logout,
        setActiveWorkspace,
        refreshUser,
        addWorkspaceToState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
