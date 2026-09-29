import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, Film, FileText, Loader2 } from 'lucide-react';

export const ChatComposer = ({ onSendMessage, onUploadFile, onTyping, disabled }) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleTextChange = (e) => {
    setContent(e.target.value);
    if (onTyping) onTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      for (const file of files) {
        const att = await onUploadFile(file);
        if (att) {
          setAttachments((prev) => [...prev, att]);
        }
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    if ((!content.trim() && attachments.length === 0) || sending || uploading) return;

    try {
      setSending(true);
      const attachmentIds = attachments.map((a) => a.id);
      await onSendMessage(content.trim(), attachmentIds);
      setContent('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
      {/* Pending Attachments Strip */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
            >
              {att.file_type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
              {att.file_type === 'video' && <Film className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              {att.file_type !== 'image' && att.file_type !== 'video' && <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />}

              <span className="max-w-[140px] truncate font-medium text-slate-700 dark:text-slate-300">
                {att.original_name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({formatFileSize(att.file_size)})
              </span>

              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="p-0.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input controls container */}
      <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
        {/* Attachment upload button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.pptx,.ppt,.csv"
        />

        <button
          type="button"
          disabled={uploading || disabled}
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          title="Attach file (Images, Videos, Documents)"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          className="flex-1 max-h-32 min-h-[38px] py-2 px-1 text-xs bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden resize-none"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!content.trim() && attachments.length === 0) || sending || uploading || disabled}
          className="p-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors cursor-pointer shrink-0 shadow-xs"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
