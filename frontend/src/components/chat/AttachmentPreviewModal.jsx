import React, { useEffect } from 'react';
import { X, Download, FileText, Film, Image as ImageIcon } from 'lucide-react';

export const AttachmentPreviewModal = ({ attachment, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  const token = localStorage.getItem('taskflow_token');
  const previewUrl = `${attachment.preview_url}?token=${encodeURIComponent(token || '')}`;
  const downloadUrl = `${attachment.download_url}?token=${encodeURIComponent(token || '')}`;

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachment.file_type === 'image' && <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />}
            {attachment.file_type === 'video' && <Film className="w-4 h-4 text-rose-500 shrink-0" />}
            {attachment.file_type === 'document' && <FileText className="w-4 h-4 text-amber-500 shrink-0" />}
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {attachment.original_name}
            </span>
            <span className="text-xs text-slate-400 font-mono shrink-0">
              ({formatFileSize(attachment.file_size)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={attachment.original_name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/40 min-h-[300px]">
          {attachment.file_type === 'image' && (
            <img
              src={previewUrl}
              alt={attachment.original_name}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-xs"
            />
          )}

          {attachment.file_type === 'video' && (
            <video
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg shadow-xs bg-black"
            >
              <source src={previewUrl} type={attachment.mime_type} />
              Your browser does not support the video tag.
            </video>
          )}

          {attachment.file_type !== 'image' && attachment.file_type !== 'video' && (
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {attachment.original_name}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {formatFileSize(attachment.file_size)} • {attachment.mime_type}
              </p>
              <a
                href={downloadUrl}
                download={attachment.original_name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
