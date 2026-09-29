import React, { useEffect, useRef } from 'react';
import {
  Hash, ArrowLeft, Download, Eye, FileText, Film, Image as ImageIcon,
  Check, CheckCheck
} from 'lucide-react';

export const ChatMessageArea = ({
  activeConversation,
  messages = [],
  currentUserId,
  onlineUserIds = [],
  typingUsers = [],
  onOpenAttachment,
  onBackMobile,
}) => {
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('taskflow_token');

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
          <Hash className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
          No conversation selected
        </h3>
        <p className="text-xs text-slate-500 max-w-xs">
          Select a channel or direct message from the left, or start a new chat.
        </p>
      </div>
    );
  }

  const otherUser = activeConversation.other_user;
  const isDirect = activeConversation.type === 'direct';
  const isOnline = otherUser && onlineUserIds.includes(otherUser.id);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 min-w-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {isDirect ? (
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
                {otherUser?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {isDirect ? otherUser?.full_name || 'Direct Message' : `#${activeConversation.name}`}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {isDirect
                ? isOnline
                  ? 'Active now'
                  : 'Offline'
                : activeConversation.description || `${activeConversation.members?.length || 0} members`}
            </p>
          </div>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <Hash className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              This is the beginning of {isDirect ? `your conversation with ${otherUser?.full_name || 'this member'}` : `#${activeConversation.name}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Send a message or share a file to start collaborating.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 mb-0.5">
                    {msg.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {msg.sender?.full_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble Card */}
                  <div
                    className={`p-3 rounded-2xl text-xs break-words shadow-2xs ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs'
                    }`}
                  >
                    {/* Text content */}
                    {msg.content && (
                      <p className="whitespace-pre-wrap leading-relaxed select-text">
                        {msg.content}
                      </p>
                    )}

                    {/* Attachments rendering */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`space-y-2 ${msg.content ? 'mt-2' : ''}`}>
                        {msg.attachments.map((att) => {
                          const previewUrl = `${att.preview_url}?token=${encodeURIComponent(token || '')}`;
                          const downloadUrl = `${att.download_url}?token=${encodeURIComponent(token || '')}`;

                          if (att.file_type === 'image') {
                            return (
                              <div
                                key={att.id}
                                onClick={() => onOpenAttachment(att)}
                                className="relative rounded-xl overflow-hidden cursor-pointer group max-w-sm"
                              >
                                <img
                                  src={previewUrl}
                                  alt={att.original_name}
                                  className="w-full max-h-60 object-cover rounded-xl transition-transform duration-200 group-hover:scale-102"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <span className="p-1.5 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5" /> Preview
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          if (att.file_type === 'video') {
                            return (
                              <div key={att.id} className="max-w-sm rounded-xl overflow-hidden">
                                <video
                                  controls
                                  className="w-full max-h-60 rounded-xl bg-black"
                                >
                                  <source src={previewUrl} type={att.mime_type} />
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                            );
                          }

                          // Document / Other
                          return (
                            <div
                              key={att.id}
                              onClick={() => onOpenAttachment(att)}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer border ${
                                isMe
                                  ? 'bg-indigo-700/60 border-indigo-500/40 text-white hover:bg-indigo-700'
                                  : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className={`w-4 h-4 shrink-0 ${isMe ? 'text-indigo-200' : 'text-indigo-500'}`} />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-xs">
                                    {att.original_name}
                                  </p>
                                  <p className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                    {formatFileSize(att.file_size)}
                                  </p>
                                </div>
                              </div>

                              <a
                                href={downloadUrl}
                                download={att.original_name}
                                onClick={(e) => e.stopPropagation()}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isMe
                                    ? 'hover:bg-indigo-800 text-white'
                                    : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400'
                                }`}
                                title="Download File"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Message timestamp and delivery status for own message */}
                  {isMe && (
                    <div className="flex items-center justify-end gap-1 px-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatMessageTime(msg.created_at)}
                      </span>
                      <CheckCheck className="w-3 h-3 text-indigo-500" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Ephemeral typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1 animate-in fade-in duration-150">
            <div className="flex gap-1 items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <span>
              {typingUsers.map((u) => u.full_name).join(', ')}{' '}
              {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
