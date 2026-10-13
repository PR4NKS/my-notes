// API Client for Pranks Notes Platform

const BASE_URL = '/api';

export async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// Auth API
export const authApi = {
  getStatus: () => fetchJson('/auth/status'),
  setup: (username, password) => fetchJson('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  login: (username, password) => fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  logout: () => fetchJson('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword, newPassword) => fetchJson('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  getMe: () => fetchJson('/auth/me'),
};

// Notes API
export const notesApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`/notes${qs ? `?${qs}` : ''}`);
  },
  getOne: (idOrSlug) => fetchJson(`/notes/${idOrSlug}`),
  create: (noteData) => fetchJson('/notes', {
    method: 'POST',
    body: JSON.stringify(noteData),
  }),
  update: (id, noteData) => fetchJson(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(noteData),
  }),
  delete: (id, permanent = false) => fetchJson(`/notes/${id}${permanent ? '?permanent=true' : ''}`, {
    method: 'DELETE',
  }),
  restore: (id) => fetchJson(`/notes/${id}/restore`, { method: 'POST' }),
  getGraphNetwork: () => fetchJson('/notes/graph/network'),
};

// Folders API
export const foldersApi = {
  getAll: () => fetchJson('/folders'),
  create: (name, parent_id) => fetchJson('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parent_id }),
  }),
  update: (id, name, parent_id) => fetchJson(`/folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, parent_id }),
  }),
  delete: (id) => fetchJson(`/folders/${id}`, { method: 'DELETE' }),
};

// Search API
export const searchApi = {
  search: (query) => fetchJson(`/search?q=${encodeURIComponent(query)}`),
};

// Upload API
export const uploadApi = {
  uploadFile: async (file, noteId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (noteId) formData.append('note_id', noteId);

    const res = await fetch(`${BASE_URL}/upload/file`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  importNote: async (file, folderId, status = 'published') => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', folderId);
    formData.append('status', status);

    const res = await fetch(`${BASE_URL}/upload/import-note`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Note import failed');
    return data;
  },
};

// Admin API
export const adminApi = {
  getStats: () => fetchJson('/admin/stats'),
  getActivity: () => fetchJson('/admin/activity'),
};
