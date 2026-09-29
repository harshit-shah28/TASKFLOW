import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  initSocket, getSocket, joinConversationRoom, leaveConversationRoom,
  emitTypingStart, emitTypingStop
} from '../../services/socket';
import { ChatConversationList } from './ChatConversationList';
import { ChatMessageArea } from './ChatMessageArea';
import { ChatComposer } from './ChatComposer';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { NewChatModal } from './NewChatModal';

export const ChatContainer = ({ onUnreadChange }) => {
  const { user, activeWorkspace } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Socket-related state
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // [{ id, full_name }]

  // Modals state
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Mobile navigation state ('list' | 'chat')
  const [mobileView, setMobileView] = useState('list');

  const typingTimeoutRef = useRef(null);
  const activeConvRef = useRef(activeConversation);
  activeConvRef.current = activeConversation;

  // 1. Select conversation & fetch messages
  const selectConversation = useCallback(async (conv) => {
    if (!conv) return;
    if (activeConvRef.current?.id) {
      leaveConversationRoom(activeConvRef.current.id);
    }

    setActiveConversation(conv);
    setMobileView('chat');
    joinConversationRoom(conv.id);
    setTypingUsers([]);

    try {
      setLoadingMessages(true);
      const res = await api.get(`/chat/conversations/${conv.id}/messages?limit=60`);
      setMessages(res.data || []);

      // If conversation had unread messages, mark as read
      if (conv.unread_count > 0) {
        await api.post(`/chat/conversations/${conv.id}/read`);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
        if (onUnreadChange) {
          // Recompute total unread
          setConversations((curr) => {
            const tot = curr.reduce((acc, c) => acc + (c.unread_count || 0), 0);
            onUnreadChange(tot);
            return curr;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [onUnreadChange]);

  // 2. Fetch conversations for active workspace
  const fetchConversations = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const res = await api.get(`/chat/conversations?workspace_id=${activeWorkspace.id}`);
      const list = res.data || [];
      setConversations(list);

      // Report total unread count to parent
      const totalUnread = list.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      if (onUnreadChange) onUnreadChange(totalUnread);

      // If no active conversation yet and conversations exist, select the first one (#general)
      if (!activeConvRef.current && list.length > 0) {
        selectConversation(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, onUnreadChange, selectConversation]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 3. Socket.IO event setup
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    // Request current online users
    socket.emit('get_online_users');

    const handleConnected = (data) => {
      if (data?.online_users) {
        setOnlineUserIds(data.online_users);
      }
    };

    const handleOnlineList = (data) => {
      if (data?.online_users) {
        setOnlineUserIds(data.online_users);
      }
    };

    const handleUserOnline = (data) => {
      if (data?.user_id) {
        setOnlineUserIds((prev) => Array.from(new Set([...prev, data.user_id])));
      }
    };

    const handleUserOffline = (data) => {
      if (data?.user_id) {
        setOnlineUserIds((prev) => prev.filter((id) => id !== data.user_id));
      }
    };

    const handleNewMessage = (payload) => {
      const { conversation_id, message } = payload;

      // Update message stream if this conversation is active
      if (activeConvRef.current && activeConvRef.current.id === conversation_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Mark read immediately since conversation is open
        if (message.sender_id !== user?.id) {
          api.post(`/chat/conversations/${conversation_id}/read`).catch(() => {});
        }
      }

      // Update conversations list (latest message & unread badge)
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id === conversation_id) {
            const isCurrentlyOpen = activeConvRef.current?.id === conversation_id;
            const inc = !isCurrentlyOpen && message.sender_id !== user?.id ? 1 : 0;
            return {
              ...c,
              last_message: message,
              last_message_at: message.created_at,
              unread_count: isCurrentlyOpen ? 0 : (c.unread_count || 0) + inc,
            };
          }
          return c;
        });

        // Re-sort conversations by last_message_at DESC
        next.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));

        // Update total unread notification
        const tot = next.reduce((acc, c) => acc + (c.unread_count || 0), 0);
        if (onUnreadChange) onUnreadChange(tot);

        return next;
      });
    };

    const handleTypingStart = (data) => {
      if (activeConvRef.current && activeConvRef.current.id === data.conversation_id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });

        // Auto remove typing indicator after 4 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== data.user.id));
        }, 4000);
      }
    };

    const handleTypingStop = (data) => {
      if (activeConvRef.current && activeConvRef.current.id === data.conversation_id) {
        setTypingUsers((prev) => prev.filter((u) => u.id !== data.user_id));
      }
    };

    const handleConversationCreated = (data) => {
      if (data?.conversation) {
        setConversations((prev) => {
          if (prev.some((c) => c.id === data.conversation.id)) return prev;
          return [data.conversation, ...prev];
        });
      }
    };

    socket.on('connected', handleConnected);
    socket.on('online_users_list', handleOnlineList);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('new_message', handleNewMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('conversation_created', handleConversationCreated);

    return () => {
      socket.off('connected', handleConnected);
      socket.off('online_users_list', handleOnlineList);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('new_message', handleNewMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('conversation_created', handleConversationCreated);
    };
  }, [user, onUnreadChange]);

  // 4. Send message handler
  const handleSendMessage = async (content, attachmentIds) => {
    if (!activeConversation) return;

    // Send typing stop
    emitTypingStop(activeConversation.id);

    const res = await api.post(`/chat/conversations/${activeConversation.id}/messages`, {
      content,
      attachment_ids: attachmentIds,
    });

    const newMsg = res.data;
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });

    // Update conversation list item
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, last_message: newMsg, last_message_at: newMsg.created_at }
          : c
      )
    );
  };

  // 5. Upload file handler
  const handleUploadFile = async (file) => {
    if (!activeConversation) return null;
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(
      `/chat/conversations/${activeConversation.id}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data;
  };

  // 6. User typing trigger
  const handleComposerTyping = () => {
    if (!activeConversation) return;
    emitTypingStart(activeConversation.id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(activeConversation.id);
    }, 2500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex h-[750px] relative">
      {/* Left Column: Conversation & Channel List */}
      <div
        className={`${
          mobileView === 'list' ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 shrink-0 h-full`}
      >
        <ChatConversationList
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={selectConversation}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onlineUserIds={onlineUserIds}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      {/* Right Column: Chat History & Composer */}
      <div
        className={`${
          mobileView === 'chat' ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col h-full min-w-0`}
      >
        <ChatMessageArea
          activeConversation={activeConversation}
          messages={messages}
          currentUserId={user?.id}
          onlineUserIds={onlineUserIds}
          typingUsers={typingUsers}
          onOpenAttachment={(att) => setPreviewAttachment(att)}
          onBackMobile={() => setMobileView('list')}
        />

        {activeConversation && (
          <ChatComposer
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            onTyping={handleComposerTyping}
            disabled={loadingMessages}
          />
        )}
      </div>

      {/* Media Lightbox / Document Preview Modal */}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* New Conversation Modal (Direct Message & Channel Creation) */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        activeWorkspace={activeWorkspace}
        currentUserId={user?.id}
        onSelectConversation={(conv) => {
          setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
          selectConversation(conv);
        }}
      />
    </div>
  );
};
