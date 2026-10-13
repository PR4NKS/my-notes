import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, X, Search, ShieldCheck, Sun, Moon, 
  ChevronRight, ChevronLeft, Plus, Upload, BookOpen
} from 'lucide-react';
import LeftSidebar from './components/LeftSidebar.jsx';
import CenterPanel from './components/CenterPanel.jsx';
import RightSidebar from './components/RightSidebar.jsx';
import SearchModal from './components/SearchModal.jsx';
import AdminModal from './components/AdminModal.jsx';
import { authApi, notesApi, foldersApi } from './api.js';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pranks_theme') || 'light');
  const [authStatus, setAuthStatus] = useState(null);
  const [foldersTree, setFoldersTree] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [notesList, setNotesList] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState('index');
  const [currentNote, setCurrentNote] = useState(null);
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  // Layout UI states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminInitialView, setAdminInitialView] = useState('dashboard');
  const [editingNoteData, setEditingNoteData] = useState(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);

  // Sync theme with document class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pranks_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch Auth Status
  const refreshAuth = useCallback(async () => {
    try {
      const data = await authApi.getStatus();
      setAuthStatus(data);
    } catch (err) {
      console.error('Failed to get auth status:', err);
    }
  }, []);

  // Fetch Folders & Notes List & Graph
  const refreshData = useCallback(async () => {
    try {
      const [foldersRes, notesRes, graphRes] = await Promise.all([
        foldersApi.getAll(),
        notesApi.getAll(),
        notesApi.getGraphNetwork(),
      ]);

      setFoldersTree(foldersRes.tree || []);
      setAllFolders(foldersRes.all || []);
      setNotesList(notesRes || []);
      setNetworkData(graphRes || { nodes: [], links: [] });
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  // Load Single Note
  const loadNote = useCallback(async (idOrSlug) => {
    if (!idOrSlug) return;
    setIsLoadingNote(true);
    try {
      const data = await notesApi.getOne(idOrSlug);
      setCurrentNote(data);
      setCurrentNoteId(data.id);
      window.location.hash = `note/${data.slug || data.id}`;
    } catch (err) {
      console.error('Failed to load note:', err);
      setCurrentNote(null);
    } finally {
      setIsLoadingNote(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshAuth();
    refreshData();

    // Check hash URL on launch
    const hash = window.location.hash;
    const match = hash.match(/#note\/([a-zA-Z0-9_\-]+)/);
    const initialSlug = match ? match[1] : 'index';
    loadNote(initialSlug);
  }, [refreshAuth, refreshData, loadNote]);

  // Listen to hash change for internal navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#note\/([a-zA-Z0-9_\-]+)/);
      if (match && match[1]) {
        loadNote(match[1]);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadNote]);

  // Global Keyboard Shortcuts (Ctrl+K = search, Esc = close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Admin Actions Triggers
  const handleOpenAdmin = (view = 'dashboard') => {
    setAdminInitialView(view);
    setEditingNoteData(null);
    setIsAdminModalOpen(true);
  };

  const handleEditCurrentNote = (noteToEdit) => {
    setEditingNoteData(noteToEdit || currentNote);
    setAdminInitialView('editor');
    setIsAdminModalOpen(true);
  };

  const handleCreateNewNote = () => {
    setEditingNoteData(null);
    setAdminInitialView('editor');
    setIsAdminModalOpen(true);
  };

  const handleUploadNotes = () => {
    setAdminInitialView('upload');
    setIsAdminModalOpen(true);
  };

  const handleSelectNote = (idOrSlug) => {
    loadNote(idOrSlug);
    setIsMobileLeftOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#cbd5e1] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile Top App Bar (visible only on small screens) */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-[#cbd5e1] dark:bg-[#1e293b] border-b border-slate-300 dark:border-slate-800">
        <button
          onClick={() => setIsMobileLeftOpen(!isMobileLeftOpen)}
          className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800"
        >
          {isMobileLeftOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <h1 
          onClick={() => handleSelectNote('index')}
          className="text-lg font-bold text-[#881337] dark:text-[#fda4af] cursor-pointer"
        >
          Pranks
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout Matching Screenshot */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <div className={`
          fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out md:transform-none
          ${isMobileLeftOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <LeftSidebar
            foldersTree={foldersTree}
            notes={notesList}
            currentNoteId={currentNoteId}
            onSelectNote={handleSelectNote}
            onOpenSearch={() => setIsSearchOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
            authStatus={authStatus}
            onOpenAdmin={handleOpenAdmin}
            onNewNote={handleCreateNewNote}
            onUploadNote={handleUploadNotes}
          />
        </div>

        {/* Backdrop for mobile drawer */}
        {isMobileLeftOpen && (
          <div
            onClick={() => setIsMobileLeftOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        )}

        {/* Center Content Documentation Panel */}
        <CenterPanel
          note={currentNote}
          isLoading={isLoadingNote}
          authStatus={authStatus}
          onEditNote={handleEditCurrentNote}
          onNavigateNote={handleSelectNote}
        />

        {/* Right Sidebar (Graph View & Table of Contents) */}
        <RightSidebar
          networkData={networkData}
          currentNoteId={currentNoteId}
          currentNote={currentNote}
          onSelectNote={handleSelectNote}
          isOpen={isRightSidebarOpen}
          onToggleOpen={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        />
      </div>

      {/* Instant Search Overlay */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={handleSelectNote}
      />

      {/* Admin Management Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        initialView={adminInitialView}
        editingNote={editingNoteData}
        authStatus={authStatus}
        onAuthChange={refreshAuth}
        folders={allFolders}
        onRefreshData={refreshData}
        onSelectNote={handleSelectNote}
      />
    </div>
  );
}
