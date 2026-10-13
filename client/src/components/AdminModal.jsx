import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Lock, Shield, LayoutDashboard, FileText, Upload, 
  FolderPlus, Trash2, Key, LogOut, CheckCircle2, 
  AlertCircle, Loader2, ArrowLeft, Eye, Save, Plus, 
  FileUp, RefreshCw, BarChart3, Clock, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { authApi, notesApi, foldersApi, uploadApi, adminApi } from '../api.js';
import MarkdownRenderer from './MarkdownRenderer.jsx';

export default function AdminModal({
  isOpen,
  onClose,
  initialView = 'dashboard',
  editingNote = null,
  authStatus,
  onAuthChange,
  folders,
  onRefreshData,
  onSelectNote,
}) {
  const [currentView, setCurrentView] = useState(initialView);
  const [stats, setStats] = useState(null);
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  // Note editor state
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editFolderId, setEditFolderId] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState('published');
  const [editTags, setEditTags] = useState('');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [isEditorPreview, setIsEditorPreview] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);

  // Upload state
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploadAsDraft, setUploadAsDraft] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Folder management state
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');

  // Sync initial view and editing note
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      if (!authStatus?.isAuthenticated) {
        setCurrentView('login');
      } else if (editingNote !== undefined && editingNote !== null) {
        populateEditor(editingNote);
        setCurrentView('editor');
      } else {
        setCurrentView(initialView || 'dashboard');
      }
    }
  }, [isOpen, initialView, editingNote, authStatus]);

  // Load stats when dashboard is opened
  useEffect(() => {
    if (isOpen && authStatus?.isAuthenticated && currentView === 'dashboard') {
      loadStats();
    } else if (isOpen && authStatus?.isAuthenticated && currentView === 'trash') {
      loadTrashedNotes();
    }
  }, [isOpen, currentView, authStatus]);

  const populateEditor = (n) => {
    if (n) {
      setEditId(n.id);
      setEditTitle(n.title || '');
      setEditSlug(n.slug || '');
      setEditFolderId(n.folder_id || '');
      setEditContent(n.content || '');
      setEditStatus(n.status || 'published');
      setEditTags(Array.isArray(n.tags) ? n.tags.join(', ') : '');
      setEditIsPinned(!!n.is_pinned);
    } else {
      setEditId(null);
      setEditTitle('');
      setEditSlug('');
      setEditFolderId('');
      setEditContent('# New Note\n\nWrite documentation here...');
      setEditStatus('published');
      setEditTags('');
      setEditIsPinned(false);
    }
  };

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrashedNotes = async () => {
    try {
      setIsLoading(true);
      const data = await notesApi.getAll({ trashed: true });
      setTrashedNotes(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatic Image Upload and Markdown Insertion (Paste / Drop / Pick)
  const uploadAndInsertImage = async (file) => {
    if (!file) return;
    setIsUploadingImage(true);
    setErrorMsg('');

    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : editContent.length;
    const end = textarea ? textarea.selectionEnd : editContent.length;

    const imageName = file.name || `image_${Date.now()}.png`;
    const placeholder = `\n![Uploading ${imageName}...]()\n`;

    const nextContent = editContent.substring(0, start) + placeholder + editContent.substring(end);
    setEditContent(nextContent);

    try {
      const data = await uploadApi.uploadFile(file, editId || null);
      const imageUrl = data.file.url || data.file.storage_path;
      const markdownImage = `\n![${imageName}](${imageUrl})\n`;

      setEditContent((prev) => prev.replace(placeholder, markdownImage));
      setSuccessMsg(`Image uploaded: ${imageName}`);
    } catch (err) {
      setErrorMsg(`Failed to upload image: ${err.message}`);
      setEditContent((prev) => prev.replace(placeholder, ''));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          uploadAndInsertImage(file);
        }
        return;
      }
    }
  };

  const handleDrop = (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type && files[i].type.startsWith('image/')) {
          e.preventDefault();
          uploadAndInsertImage(files[i]);
          return;
        }
      }
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      if (!authStatus?.hasAdmin) {
        // Setup initial admin
        await authApi.setup(username, password);
        setSuccessMsg('Admin account initialized!');
      } else {
        await authApi.login(username, password);
        setSuccessMsg('Logged in successfully!');
      }
      await onAuthChange();
      setCurrentView('dashboard');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
      await onAuthChange();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Save note handler
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setErrorMsg('Note title is required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const tagsArray = editTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const notePayload = {
        title: editTitle.trim(),
        slug: editSlug.trim() || undefined,
        folder_id: editFolderId || null,
        content: editContent,
        status: editStatus,
        tags: tagsArray,
        is_pinned: editIsPinned ? 1 : 0,
      };

      let result;
      if (editId) {
        result = await notesApi.update(editId, notePayload);
        setSuccessMsg('Note updated successfully!');
      } else {
        result = await notesApi.create(notePayload);
        setSuccessMsg('Note created successfully!');
      }

      await onRefreshData();
      if (result.note) {
        onSelectNote(result.note.id || result.note.slug);
      }
      setTimeout(() => {
        setCurrentView('dashboard');
      }, 700);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setErrorMsg('Please select at least one file to upload.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setUploadProgress(10);

    try {
      let importedCount = 0;
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        await uploadApi.importNote(file, uploadFolderId || null, uploadAsDraft ? 'draft' : 'published');
        importedCount++;
        setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
      }

      setSuccessMsg(`Successfully imported ${importedCount} file(s) into knowledge base!`);
      setUploadFiles([]);
      await onRefreshData();
      setTimeout(() => setCurrentView('dashboard'), 1200);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Create folder handler
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      await foldersApi.create(newFolderName.trim(), newFolderParentId || null);
      setSuccessMsg(`Folder "${newFolderName}" created!`);
      setNewFolderName('');
      setNewFolderParentId('');
      await onRefreshData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete folder handler
  const handleDeleteFolder = async (folderId, folderName) => {
    if (!confirm(`Are you sure you want to delete folder "${folderName}"? Notes inside will become uncategorized.`)) {
      return;
    }
    setIsLoading(true);
    try {
      await foldersApi.delete(folderId);
      setSuccessMsg(`Folder "${folderName}" deleted.`);
      await onRefreshData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccessMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Restore note
  const handleRestoreNote = async (id) => {
    try {
      await notesApi.restore(id);
      setSuccessMsg('Note restored!');
      await loadTrashedNotes();
      await onRefreshData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Permanent delete
  const handlePermanentDelete = async (id) => {
    if (!confirm('This will permanently delete this note. Cannot be undone!')) return;
    try {
      await notesApi.delete(id, true);
      setSuccessMsg('Note permanently deleted.');
      await loadTrashedNotes();
      await onRefreshData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#881337] dark:text-[#fda4af]" />
            <span className="font-bold text-lg text-slate-800 dark:text-slate-100">
              Pranks Administration
            </span>
          </div>

          <div className="flex items-center gap-3">
            {authStatus?.isAuthenticated && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
                Admin: {authStatus.user?.username}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-100 dark:bg-rose-950/80 border-b border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-100 dark:bg-emerald-950/80 border-b border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Navigation Tabs (if authenticated) */}
          {authStatus?.isAuthenticated && (
            <div className="w-56 shrink-0 bg-slate-200/60 dark:bg-slate-950/60 border-r border-slate-300 dark:border-slate-800 p-3 flex flex-col gap-1 select-none">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  currentView === 'dashboard'
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Stats</span>
              </button>

              <button
                onClick={() => {
                  populateEditor(null);
                  setCurrentView('editor');
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  currentView === 'editor'
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Note Editor</span>
              </button>

              <button
                onClick={() => setCurrentView('upload')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  currentView === 'upload'
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload & Import</span>
              </button>

              <button
                onClick={() => setCurrentView('folders')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  currentView === 'folders'
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                <span>Folder Manager</span>
              </button>

              <button
                onClick={() => setCurrentView('trash')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  currentView === 'trash'
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Trash Recovery</span>
              </button>

              <button
                onClick={() => setCurrentView('settings')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  currentView === 'settings'
                    ? 'bg-[#881337] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Change Password</span>
              </button>

              <div className="mt-auto pt-3 border-t border-slate-300 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
            {/* VIEW: LOGIN / SETUP */}
            {(!authStatus?.isAuthenticated || currentView === 'login') && (
              <div className="max-w-md mx-auto my-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-6 shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-[#881337] dark:text-[#fda4af]">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {authStatus?.hasAdmin ? 'Administrator Login' : 'Initial Admin Setup'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {authStatus?.hasAdmin
                          ? 'Enter your credentials to manage documentation.'
                          : 'First-time launch: initialize administrator account.'}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Admin Username
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#881337]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#881337]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mt-2 w-full py-2.5 px-4 bg-[#881337] hover:bg-[#9f1239] text-white text-sm font-semibold rounded-lg transition shadow flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{authStatus?.hasAdmin ? 'Authenticate' : 'Initialize Administrator'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW: DASHBOARD STATS */}
            {authStatus?.isAuthenticated && currentView === 'dashboard' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Platform Statistics
                    </h2>
                    <p className="text-xs text-slate-500">Live summary of all documentation, folders, and assets.</p>
                  </div>
                  <button
                    onClick={loadStats}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-slate-500 block">Total Notes</span>
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                        {stats.totalNotes}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Published</span>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                        {stats.publishedNotes}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-amber-600 dark:text-amber-400 block">Drafts</span>
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                        {stats.draftNotes}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-slate-500 block">Folders</span>
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                        {stats.totalFolders}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-slate-500 block">Attachments</span>
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                        {stats.totalAttachments}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="text-xs text-rose-600 dark:text-rose-400 block">Trash</span>
                      <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                        {stats.trashedNotes}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent activity audit logs */}
                {stats?.recentLogs && stats.recentLogs.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Recent Activity & Audit Trail</span>
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                      {stats.recentLogs.map((log) => (
                        <div key={log.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {log.action}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{log.details}</span>
                          </div>
                          <span className="text-slate-400 text-[11px] font-mono">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW: NOTE EDITOR */}
            {authStatus?.isAuthenticated && currentView === 'editor' && (
              <form onSubmit={handleSaveNote} className="flex flex-col h-full gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {editId ? 'Edit Note' : 'Create New Note'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditorPreview(!isEditorPreview)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isEditorPreview ? 'Edit Raw' : 'Live Preview'}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-1.5 bg-[#881337] hover:bg-[#9f1239] text-white text-xs font-semibold rounded-lg transition shadow flex items-center gap-1.5"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Note</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. Active Directory Kerberoasting"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Folder
                    </label>
                    <select
                      value={editFolderId}
                      onChange={(e) => setEditFolderId(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    >
                      <option value="">(Root / No folder)</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editStatus === 'published'}
                        onChange={(e) => setEditStatus(e.target.checked ? 'published' : 'draft')}
                        className="rounded accent-[#881337]"
                      />
                      <span>Publish (Make visible publicly)</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsPinned}
                        onChange={(e) => setEditIsPinned(e.target.checked)}
                        className="rounded accent-[#881337]"
                      />
                      <span>Pin Note</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Custom URL Slug (Optional)
                    </label>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      placeholder="e.g. ad-kerberoast-playbook"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tags (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="active-directory, ctf, privesc"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    />
                  </div>
                </div>

                {/* Editor Toolbar with Automatic Image Paste & Upload */}
                <div className="flex items-center justify-between px-1 py-1 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                      title="Upload an image from local disk or paste directly into the box"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#881337] dark:text-[#fda4af]" />
                      <span>{isUploadingImage ? 'Uploading Image...' : 'Insert / Upload Image'}</span>
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          uploadAndInsertImage(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                    {isUploadingImage && (
                      <span className="flex items-center gap-1.5 text-xs text-[#881337] dark:text-[#fda4af] font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading image to server...</span>
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-[11px] text-slate-400">
                    💡 Tip: Copy any image & press Ctrl+V to paste & upload automatically.
                  </span>
                </div>

                {/* Editor or Split Preview */}
                <div className="flex-1 flex gap-3 min-h-[300px]">
                  {!isEditorPreview ? (
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      placeholder="Write your markdown content here... Tip: use [[Note Name]] to link to other notes. Paste (Ctrl+V) any copied image to upload automatically."
                      className="w-full h-full p-4 font-mono text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-[#881337] resize-none"
                    />
                  ) : (
                    <div className="w-full h-full p-6 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <MarkdownRenderer content={editContent} />
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* VIEW: UPLOAD & IMPORT */}
            {authStatus?.isAuthenticated && currentView === 'upload' && (
              <form onSubmit={handleUploadSubmit} className="max-w-2xl mx-auto flex flex-col gap-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Import Notes & Upload Files
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supports Markdown (.md, .markdown), text (.txt), PDF (.pdf), Word (.docx), and images.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Destination Folder
                    </label>
                    <select
                      value={uploadFolderId}
                      onChange={(e) => setUploadFolderId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">(Root / No folder)</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadAsDraft}
                        onChange={(e) => setUploadAsDraft(e.target.checked)}
                        className="rounded accent-[#881337]"
                      />
                      <span>Save as Draft (Don't publish immediately)</span>
                    </label>
                  </div>
                </div>

                {/* Dropzone */}
                <div 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer flex flex-col items-center justify-center gap-2"
                  onClick={() => document.getElementById('file-upload-input').click()}
                >
                  <FileUp className="w-10 h-10 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Click to select files or drag & drop here
                  </span>
                  <span className="text-xs text-slate-400">
                    .md, .txt, .pdf, .docx, .png, .jpg (Max 25MB each)
                  </span>
                  <input
                    id="file-upload-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                  />
                </div>

                {uploadFiles.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                      Selected Files ({uploadFiles.length}):
                    </span>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                      {uploadFiles.map((f, idx) => (
                        <li key={idx} className="py-1.5 flex items-center justify-between">
                          <span className="font-mono text-slate-800 dark:text-slate-200">{f.name}</span>
                          <span className="text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {uploadProgress > 0 && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#881337] h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || uploadFiles.length === 0}
                  className="py-2.5 px-4 bg-[#881337] hover:bg-[#9f1239] text-white font-semibold text-sm rounded-lg transition shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Upload & Import into Knowledge Base</span>
                </button>
              </form>
            )}

            {/* VIEW: FOLDER MANAGER */}
            {authStatus?.isAuthenticated && currentView === 'folders' && (
              <div className="max-w-2xl mx-auto flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Manage Folders
                  </h3>
                  <p className="text-xs text-slate-500">
                    Organize your cybersecurity knowledge base into hierarchical categories.
                  </p>
                </div>

                <form onSubmit={handleCreateFolder} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      New Folder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g. Reverse Engineering"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="w-48">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Parent Folder (Optional)
                    </label>
                    <select
                      value={newFolderParentId}
                      onChange={(e) => setNewFolderParentId(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">(Top-level)</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#881337] hover:bg-[#9f1239] text-white text-xs font-semibold rounded-lg transition"
                  >
                    Create
                  </button>
                </form>

                {/* Existing Folders List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {folders.map(f => (
                    <div key={f.id} className="p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{f.name}</span>
                        {f.parent_id && (
                          <span className="text-xs text-slate-400">
                            (Subfolder of {folders.find(p => p.id === f.parent_id)?.name || 'Parent'})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteFolder(f.id, f.name)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: TRASH RECOVERY */}
            {authStatus?.isAuthenticated && currentView === 'trash' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Trash Bin & Recovery
                    </h3>
                    <p className="text-xs text-slate-500">Restore accidentally deleted notes or purge them permanently.</p>
                  </div>
                  <button
                    onClick={loadTrashedNotes}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {trashedNotes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    The trash bin is empty. No deleted notes found.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {trashedNotes.map(n => (
                      <div key={n.id} className="p-4 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</span>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Deleted {new Date(n.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreNote(n.id)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(n.id)}
                            className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-medium hover:bg-rose-700 transition"
                          >
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: CHANGE PASSWORD */}
            {authStatus?.isAuthenticated && currentView === 'settings' && (
              <div className="max-w-md mx-auto my-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Change Administrator Password
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Update your master access credentials.
                  </p>

                  <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        New Password (Min 8 characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mt-2 w-full py-2 bg-[#881337] hover:bg-[#9f1239] text-white text-xs font-semibold rounded-lg transition"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
