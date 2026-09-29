import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (socket && socket.connected) {
    return socket;
  }
  return initSocket();
};

export const initSocket = () => {
  const token = localStorage.getItem('taskflow_token');
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // If already connected with the same token, reuse
  if (socket) {
    if (socket.connected) return socket;
    socket.connect();
    return socket;
  }

  socket = io(window.location.origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      token: token,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    // Socket connected
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err?.message || err);
  });

  socket.on('disconnect', (reason) => {
    // Socket disconnected
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversationRoom = (conversationId) => {
  const s = getSocket();
  if (s) {
    s.emit('join_conversation', { conversation_id: conversationId });
  }
};

export const leaveConversationRoom = (conversationId) => {
  const s = getSocket();
  if (s) {
    s.emit('leave_conversation', { conversation_id: conversationId });
  }
};

export const emitTypingStart = (conversationId) => {
  const s = getSocket();
  if (s) {
    s.emit('typing_start', { conversation_id: conversationId });
  }
};

export const emitTypingStop = (conversationId) => {
  const s = getSocket();
  if (s) {
    s.emit('typing_stop', { conversation_id: conversationId });
  }
};
