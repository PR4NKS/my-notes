import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, X, Search, ShieldCheck, Sun, Moon, 
  ChevronRight, ChevronLeft, Plus, Upload, BookOpen, AlignRight
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
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

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
    setIsMobileRightOpen(false);
  };

  const handleTrashCurrentNote = async (noteToTrash) => {
    const targetId = noteToTrash?.id || currentNoteId;
    if (!targetId || targetId === 'index') return;
    if (!window.confirm(`Move "${noteToTrash?.title || 'this note'}" to trash? Note is not permanently deleted and can be restored anytime.`)) return;
    try {
      await notesApi.delete(targetId, false);
      await refreshData();
      handleSelectNote('index');
    } catch (err) {
      alert(`Failed to move note to trash: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#cbd5e1] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile Top App Bar (Optimized for Touch & Single Hand Use) */}
      <header className="md:hidden flex items-center justify-between px-3 py-2 bg-[#cbd5e1] dark:bg-[#1e293b] border-b border-slate-300 dark:border-slate-800 shrink-0 select-none z-20">
        <button
          onClick={() => {
            setIsMobileLeftOpen(!isMobileLeftOpen);
            if (isMobileRightOpen) setIsMobileRightOpen(false);
          }}
          aria-label="Toggle explorer menu"
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-800 active:scale-95 transition"
        >
          {isMobileLeftOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <h1 
          onClick={() => handleSelectNote('index')}
          className="text-lg font-bold text-[#881337] dark:text-[#fda4af] cursor-pointer tracking-tight"
        >
          Pranks
        </h1>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search knowledge base"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-800 active:scale-95 transition"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-800 active:scale-95 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setIsMobileRightOpen(!isMobileRightOpen);
              if (isMobileLeftOpen) setIsMobileLeftOpen(false);
            }}
            aria-label="Toggle outline and graph view"
            title="Outline & Graph"
            className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 transition ${
              isMobileRightOpen 
                ? 'bg-[#881337] text-white shadow-sm' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-800'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
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
            onCloseMobile={() => setIsMobileLeftOpen(false)}
          />
        </div>

        {/* Backdrop for mobile left drawer */}
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
          onTrashNote={handleTrashCurrentNote}
          onNavigateNote={handleSelectNote}
        />

        {/* Right Sidebar (Desktop side panel + Mobile drawer) */}
        <div className={`
          fixed md:static inset-y-0 right-0 z-40 transform transition-transform duration-200 ease-in-out md:transform-none
          ${isMobileRightOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          <RightSidebar
            networkData={networkData}
            currentNoteId={currentNoteId}
            currentNote={currentNote}
            onSelectNote={handleSelectNote}
            isOpen={isRightSidebarOpen}
            onToggleOpen={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            isMobileOpen={isMobileRightOpen}
            onCloseMobile={() => setIsMobileRightOpen(false)}
          />
        </div>

        {/* Backdrop for mobile right drawer */}
        {isMobileRightOpen && (
          <div
            onClick={() => setIsMobileRightOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        )}
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
