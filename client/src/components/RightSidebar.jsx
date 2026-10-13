import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Link2, ExternalLink } from 'lucide-react';
import GraphView from './GraphView.jsx';
import TableOfContents from './TableOfContents.jsx';

export default function RightSidebar({
  networkData,
  currentNoteId,
  currentNote,
  onSelectNote,
  isOpen,
  onToggleOpen,
}) {
  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        title="Open Outline & Graph"
        className="fixed right-2 top-4 z-20 p-2 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    );
  }

  const incomingLinks = currentNote?.links?.incoming || [];
  const outgoingLinks = currentNote?.links?.outgoing || [];

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full bg-[#cbd5e1] dark:bg-[#1e293b] border-l border-slate-300 dark:border-slate-800 p-4 select-none overflow-y-auto">
      {/* Collapse control */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300/60 dark:border-slate-800">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Navigation & Outline
        </span>
        <button
          onClick={onToggleOpen}
          title="Collapse Panel"
          className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-500 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Graph View Section (Matching Capture.JPG) */}
      <GraphView
        networkData={networkData}
        currentNoteId={currentNoteId}
        onSelectNote={onSelectNote}
      />

      {/* Table of Contents Section (Matching Capture.JPG) */}
      <TableOfContents content={currentNote?.content || ''} />

      {/* Linked Notes / Backlinks Section */}
      {(incomingLinks.length > 0 || outgoingLinks.length > 0) && (
        <div className="mt-6 pt-4 border-t border-slate-300 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <Link2 className="w-3.5 h-3.5" />
            <span>Document Relationships</span>
          </div>

          {outgoingLinks.length > 0 && (
            <div className="mb-2.5">
              <span className="text-[11px] text-slate-500 uppercase font-medium">Links To:</span>
              <div className="flex flex-col gap-1 mt-1 pl-1">
                {outgoingLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => onSelectNote(link.id || link.slug)}
                    className="flex items-center gap-1.5 text-xs text-left text-slate-700 dark:text-slate-300 hover:text-[#881337] dark:hover:text-[#fda4af] truncate transition"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{link.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {incomingLinks.length > 0 && (
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-medium">Referenced In:</span>
              <div className="flex flex-col gap-1 mt-1 pl-1">
                {incomingLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => onSelectNote(link.id || link.slug)}
                    className="flex items-center gap-1.5 text-xs text-left text-slate-700 dark:text-slate-300 hover:text-[#881337] dark:hover:text-[#fda4af] truncate transition"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{link.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
