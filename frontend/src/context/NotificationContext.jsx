import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { token, activeWorkspace } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=25');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchChatUnread = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    try {
      const res = await api.get(`/chat/unread-count?workspace_id=${activeWorkspace.id}`);
      setChatUnreadCount(res.data?.unread_count || 0);
    } catch (err) {
      // Silently ignore
    }
  }, [token, activeWorkspace]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      fetchChatUnread();
      const interval = setInterval(() => {
        fetchNotifications();
        fetchChatUnread();
      }, 30000); // 30s sync
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setChatUnreadCount(0);
    }
  }, [token, fetchNotifications, fetchChatUnread]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const totalInboxUnread = unreadCount + chatUnreadCount;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        chatUnreadCount,
        totalInboxUnread,
        setChatUnreadCount,
        fetchChatUnread,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
