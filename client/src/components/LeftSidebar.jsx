import React, { useState } from 'react';
import { 
  Search, Sun, Moon, BookOpen, ChevronDown, ChevronRight, 
  Folder, FolderOpen, FileText, Plus, Upload, Trash2, 
  ShieldCheck, Shield, Lock, Settings
} from 'lucide-react';

export default function LeftSidebar({
  foldersTree,
  notes,
  currentNoteId,
  onSelectNote,
  onOpenSearch,
  theme,
  onToggleTheme,
  authStatus,
  onOpenAdmin,
  onNewNote,
  onUploadNote,
}) {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [openFolders, setOpenFolders] = useState({});

  const toggleFolder = (folderId, e) => {
    e.stopPropagation();
    setOpenFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Group notes by folder
  const notesByFolder = {};
  const rootNotes = [];

  notes.forEach(note => {
    if (!note.folder_id) {
      if (note.slug !== 'index' && note.title.toLowerCase() !== 'index') {
        rootNotes.push(note);
      }
    } else {
      if (!notesByFolder[note.folder_id]) {
        notesByFolder[note.folder_id] = [];
      }
      notesByFolder[note.folder_id].push(note);
    }
  });

  const renderFolderItem = (folder, depth = 0) => {
    const isOpen = !!openFolders[folder.id];
    const folderNotes = notesByFolder[folder.id] || [];
    const hasChildren = (folder.children && folder.children.length > 0) || folderNotes.length > 0;
    const paddingLeft = `${depth * 14 + 6}px`;

    return (
      <div key={folder.id} className="flex flex-col select-none">
        <div
          onClick={(e) => toggleFolder(folder.id, e)}
          style={{ paddingLeft }}
          className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-300/60 dark:hover:bg-slate-800/60 cursor-pointer transition text-slate-700 dark:text-slate-300 group"
        >
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <span className="w-3.5" />
          )}

          {isOpen ? (
            <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
          )}

          <span className="text-[13.5px] truncate font-normal tracking-tight">
            {folder.name}
          </span>
        </div>

        {/* Nested Content */}
        {isOpen && (
          <div className="flex flex-col">
            {/* Subfolders */}
            {folder.children && folder.children.map(child => renderFolderItem(child, depth + 1))}

            {/* Notes inside this folder */}
            {folderNotes.map(note => {
              const isSelected = note.id === currentNoteId || note.slug === currentNoteId;
              const notePaddingLeft = `${(depth + 1) * 14 + 10}px`;

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id || note.slug)}
                  style={{ paddingLeft: notePaddingLeft }}
                  className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition text-[13px] ${
                    isSelected
                      ? 'bg-[#881337]/15 dark:bg-[#fda4af]/15 text-[#881337] dark:text-[#fda4af] font-semibold border-l-2 border-[#881337] dark:border-[#fda4af]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-300/40 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{note.title}</span>
                  {note.status === 'draft' && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold ml-auto">
                      D
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full bg-[#cbd5e1] dark:bg-[#1e293b] border-r border-slate-300 dark:border-slate-800 p-4 select-none overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 
          onClick={() => onSelectNote('index')}
          className="text-2xl font-bold tracking-tight text-[#881337] dark:text-[#fda4af] cursor-pointer hover:opacity-90 transition font-sans"
        >
          Pranks
        </h1>

        {authStatus?.isAuthenticated && (
          <button
            onClick={() => onOpenAdmin('dashboard')}
            title="Admin Dashboard"
            className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-[#881337] dark:text-[#fda4af]"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Bar & Action Buttons (Exact Replica of Screenshot) */}
      <div className="flex items-center gap-1.5 mb-5">
        <div 
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-400/80 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-900/40 text-slate-500 hover:border-slate-500 cursor-pointer transition text-xs shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span>Search</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-full border border-slate-400/80 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Documentation / Root Icon */}
        <button
          onClick={() => onSelectNote('index')}
          title="Root Documentation"
          className="p-1.5 rounded-full border border-slate-400/80 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>

        {/* Admin Login / Manage Trigger */}
        <button
          onClick={() => onOpenAdmin(authStatus?.isAuthenticated ? 'dashboard' : 'login')}
          title={authStatus?.isAuthenticated ? 'Admin Dashboard' : 'Admin Login'}
          className={`p-1.5 rounded-full border transition ${
            authStatus?.isAuthenticated
              ? 'border-[#881337] bg-rose-100 dark:bg-rose-950 text-[#881337] dark:text-[#fda4af]'
              : 'border-slate-400/80 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          {authStatus?.isAuthenticated ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Explorer Section */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between pb-1.5 mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <button
            onClick={() => setExplorerOpen(!explorerOpen)}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition tracking-wide"
          >
            <span>Explorer</span>
            {explorerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {authStatus?.isAuthenticated && (
            <div className="flex items-center gap-1">
              <button
                onClick={onNewNote}
                title="New Note"
                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onUploadNote}
                title="Upload Notes / Files"
                className="p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {explorerOpen && (
          <div className="flex flex-col gap-0.5 overflow-y-auto pr-1">
            {/* Root Notes (like index) */}
            {rootNotes.map(note => {
              const isSelected = note.id === currentNoteId || note.slug === currentNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id || note.slug)}
                  className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition text-[13.5px] ${
                    isSelected
                      ? 'bg-[#881337]/15 dark:bg-[#fda4af]/15 text-[#881337] dark:text-[#fda4af] font-semibold border-l-2 border-[#881337] dark:border-[#fda4af]'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-300/40 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{note.title}</span>
                </div>
              );
            })}

            {/* Folders tree */}
            {foldersTree.map(folder => renderFolderItem(folder))}
          </div>
        )}
      </div>

      {/* Admin Bottom Bar */}
      {authStatus?.isAuthenticated && (
        <div className="pt-3 mt-auto border-t border-slate-300 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Admin ({authStatus.user?.username})</span>
          </span>
          <button
            onClick={() => onOpenAdmin('dashboard')}
            className="hover:text-slate-900 dark:hover:text-slate-200 underline"
          >
            Manage
          </button>
        </div>
      )}
    </aside>
  );
}
