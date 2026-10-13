import express from 'express';
import db from '../db.js';
import { optionalAuth } from '../auth.js';

const router = express.Router();

function createSnippet(content, query, maxLen = 140) {
  if (!content) return '';
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);

  if (idx === -1) {
    return content.slice(0, maxLen).trim() + (content.length > maxLen ? '...' : '');
  }

  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}

// GET /api/search?q=query
router.get('/', optionalAuth, (req, res) => {
  try {
    const isAdmin = !!req.user;
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json([]);
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;

    let sql = `
      SELECT n.id, n.slug, n.title, n.content, n.excerpt, n.status, n.tags, n.reading_time,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE (
        LOWER(n.title) LIKE ? OR
        LOWER(n.content) LIKE ? OR
        LOWER(n.tags) LIKE ? OR
        LOWER(COALESCE(f.name, '')) LIKE ?
      )
      AND n.is_trashed = 0
    `;

    if (!isAdmin) {
      sql += ` AND n.status = 'published'`;
    }

    sql += ` ORDER BY (CASE WHEN LOWER(n.title) LIKE ? THEN 1 ELSE 2 END), n.updated_at DESC LIMIT 25`;

    const results = db.prepare(sql).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

    const formatted = results.map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      folder_name: row.folder_name,
      status: row.status,
      reading_time: row.reading_time,
      tags: row.tags ? JSON.parse(row.tags) : [],
      snippet: createSnippet(row.content, q.trim()),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search execution failed.' });
  }
});

export default router;
