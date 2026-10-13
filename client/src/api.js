// API Client for Pranks Notes Platform

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
export const API_BASE = RAW_API_URL ? RAW_API_URL.replace(/\/+$/, '') : '';
export const BASE_URL = API_BASE ? (API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`) : '/api';

export function getAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (API_BASE && url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}

export async function fetchJson(endpoint, options = {}) {
  const token = localStorage.getItem('pranks_token');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
  setup: async (username, password) => {
    const data = await fetchJson('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) localStorage.setItem('pranks_token', data.token);
    return data;
  },
  login: async (username, password) => {
    const data = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) localStorage.setItem('pranks_token', data.token);
    return data;
  },
  logout: async () => {
    localStorage.removeItem('pranks_token');
    return fetchJson('/auth/logout', { method: 'POST' });
  },
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
    const token = localStorage.getItem('pranks_token');
    const formData = new FormData();
    formData.append('file', file);
    if (noteId) formData.append('note_id', noteId);

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/upload/file`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  importNote: async (file, folderId, status = 'published') => {
    const token = localStorage.getItem('pranks_token');
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folder_id', folderId);
    formData.append('status', status);

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/upload/import-note`, {
      method: 'POST',
      headers,
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
