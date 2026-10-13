import React from 'react';
import { 
  Calendar, Clock, Edit3, Share2, Tag, FileText, 
  Download, Eye, CheckCircle2, AlertCircle, FileCode, Trash2
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer.jsx';

// Format date into "Dec 30, 2025" style as seen in screenshot
function formatDate(dateStr) {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

export default function CenterPanel({
  note,
  isLoading,
  authStatus,
  onEditNote,
  onTrashNote,
  onNavigateNote,
}) {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center h-full bg-[#cdd3d8] dark:bg-[#0f172a] p-8">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-[#881337] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading documentation...</span>
        </div>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center h-full bg-[#cdd3d8] dark:bg-[#0f172a] p-8 text-center">
        <FileCode className="w-16 h-16 text-slate-400 mb-4 stroke-[1.2]" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Note Selected</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Select a note from the Explorer on the left, use the Search bar, or click any node in the Graph View.
        </p>
        {authStatus?.isAuthenticated && (
          <button
            onClick={() => onEditNote(null)}
            className="px-4 py-2 bg-[#881337] text-white rounded-lg text-sm font-medium hover:bg-[#9f1239] transition shadow"
          >
            Create New Note
          </button>
        )}
      </main>
    );
  }

  const pdfAttachments = (note.attachments || []).filter(a => a.mime_type === 'application/pdf');

  return (
    <main className="flex-1 flex flex-col h-full bg-[#cbd5e1] dark:bg-[#0f172a] overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-7">
        {/* Top Header metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-300/50 dark:border-slate-800">
          <div className="flex flex-col min-w-0">
            {/* Note title indicator */}
            <span className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 font-sans tracking-tight break-words">
              {note.title}
            </span>

            {/* Date and reading time */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span>{formatDate(note.created_at)}</span>
              <span>•</span>
              <span>{note.reading_time || '3 min read'}</span>

              {note.status === 'draft' && (
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                  Draft
                </span>
              )}
            </div>
          </div>

          {/* Action buttons with touch-friendly min targets */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleCopyLink}
              title="Share / Copy Link"
              aria-label="Share note link"
              className="px-3 py-2 min-h-[38px] rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 transition text-xs font-medium flex items-center gap-1.5 active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            {authStatus?.isAuthenticated && (
              <>
                {note.slug !== 'index' && (
                  <button
                    onClick={() => onTrashNote && onTrashNote(note)}
                    title="Move note to trash (safe, can be restored anytime)"
                    aria-label="Move to trash"
                    className="px-3 py-2 min-h-[38px] rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trash</span>
                  </button>
                )}
                <button
                  onClick={() => onEditNote(note)}
                  title="Edit Note"
                  aria-label="Edit note"
                  className="px-3.5 py-2 min-h-[38px] rounded-lg bg-[#881337] hover:bg-[#9f1239] text-white text-xs font-medium transition shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Note</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-6">
            {note.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-200/90 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700"
              >
                <Tag className="w-2.5 h-2.5" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}

        {/* Primary Markdown Content */}
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer
            content={note.content}
            onNavigateNote={onNavigateNote}
          />
        </div>

        {/* Embedded PDF Documents if any */}
        {pdfAttachments.length > 0 && (
          <div className="mt-10 pt-6 border-t border-slate-300 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#881337]" />
              <span>Attached Documents ({pdfAttachments.length})</span>
            </h3>
            <div className="flex flex-col gap-4">
              {pdfAttachments.map((att) => (
                <div key={att.id} className="rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow">
                  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-xs font-medium">
                    <span>{att.original_name}</span>
                    <a
                      href={att.storage_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-1 text-[#881337] dark:text-[#fda4af] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                  <iframe
                    src={att.storage_path}
                    title={att.original_name}
                    className="w-full h-[500px] border-0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer timestamp */}
        <div className="mt-12 pt-4 border-t border-slate-300/70 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Last updated: {formatDate(note.updated_at || note.created_at)}</span>
          <span>Pranks Security Research</span>
        </div>
      </div>
    </main>
  );
}
