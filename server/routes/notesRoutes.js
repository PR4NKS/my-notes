import express from 'express';
import crypto from 'crypto';
import db, { calculateReadingTime, parseAndSyncNoteLinks } from '../db.js';
import { requireAuth, optionalAuth, logAudit } from '../auth.js';

const router = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// GET /api/notes (List notes)
router.get('/', optionalAuth, (req, res) => {
  try {
    const isAdmin = !!req.user;
    const { folder_id, tag, trashed, status } = req.query;

    let query = `
      SELECT n.id, n.slug, n.title, n.folder_id, n.excerpt, n.status, n.tags, 
             n.reading_time, n.is_pinned, n.is_trashed, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE 1=1
    `;
    const params = [];

    // Privacy & permission boundary
    if (!isAdmin) {
      query += ` AND n.status = 'published' AND n.is_trashed = 0`;
    } else {
      if (trashed === '1' || trashed === 'true') {
        query += ` AND n.is_trashed = 1`;
      } else {
        query += ` AND n.is_trashed = 0`;
      }

      if (status) {
        query += ` AND n.status = ?`;
        params.push(status);
      }
    }

    if (folder_id) {
      query += ` AND n.folder_id = ?`;
      params.push(folder_id);
    }

    query += ` ORDER BY n.is_pinned DESC, n.updated_at DESC`;

    const notes = db.prepare(query).all(...params);

    // Format tags array
    const formatted = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// GET /api/notes/graph/network (Graph View data from real stored links)
router.get('/graph/network', optionalAuth, (req, res) => {
  try {
    const isAdmin = !!req.user;
    
    // Notes query
    let notesQuery = `SELECT id, slug, title, status FROM notes WHERE is_trashed = 0`;
    if (!isAdmin) {
      notesQuery += ` AND status = 'published'`;
    }
    const notes = db.prepare(notesQuery).all();
    const noteIdSet = new Set(notes.map(n => n.id));

    // Links query - only include links where both source and target exist and are visible
    const linksRaw = db.prepare(`
      SELECT source_note_id as source, target_note_id as target, link_text
      FROM note_links
    `).all();

    const validLinks = linksRaw.filter(l => noteIdSet.has(l.source) && noteIdSet.has(l.target));

    res.json({
      nodes: notes.map(n => ({
        id: n.id,
        slug: n.slug,
        title: n.title,
        status: n.status
      })),
      links: validLinks
    });
  } catch (err) {
    console.error('Graph data error:', err);
    res.status(500).json({ error: 'Failed to generate graph data.' });
  }
});

// GET /api/notes/:idOrSlug (Single Note)
router.get('/:idOrSlug', optionalAuth, (req, res) => {
  try {
    const isAdmin = !!req.user;
    const { idOrSlug } = req.params;

    let query = `
      SELECT n.*, f.name as folder_name, f.parent_id as folder_parent_id
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE (n.id = ? OR n.slug = ?)
    `;
    const note = db.prepare(query).get(idOrSlug, idOrSlug);

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    // Authorization check
    if (!isAdmin && (note.status !== 'published' || note.is_trashed === 1)) {
      return res.status(403).json({ error: 'Access denied. This note is private or draft.' });
    }

    // Get linked notes (outgoing and incoming)
    const outgoing = db.prepare(`
      SELECT n.id, n.slug, n.title
      FROM note_links nl
      JOIN notes n ON nl.target_note_id = n.id
      WHERE nl.source_note_id = ? AND n.is_trashed = 0 ${isAdmin ? '' : "AND n.status = 'published'"}
    `).all(note.id);

    const incoming = db.prepare(`
      SELECT n.id, n.slug, n.title
      FROM note_links nl
      JOIN notes n ON nl.source_note_id = n.id
      WHERE nl.target_note_id = ? AND n.is_trashed = 0 ${isAdmin ? '' : "AND n.status = 'published'"}
    `).all(note.id);

    // Get attachments
    const attachments = db.prepare(`
      SELECT id, filename, original_name, mime_type, size, created_at
      FROM attachments
      WHERE note_id = ?
    `).all(note.id);

    res.json({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : [],
      links: {
        outgoing,
        incoming
      },
      attachments
    });
  } catch (err) {
    console.error('Fetch single note error:', err);
    res.status(500).json({ error: 'Failed to retrieve note.' });
  }
});

// POST /api/notes (Create Note - Admin Only)
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, content, folder_id, status, tags, is_pinned, slug: customSlug } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const noteId = `note-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    let slug = customSlug ? slugify(customSlug) : slugify(title);
    if (!slug) slug = `note-${Date.now()}`;

    // Ensure slug uniqueness
    const existingSlug = db.prepare('SELECT id FROM notes WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const noteContent = content || '';
    const readingTime = calculateReadingTime(noteContent);
    const excerpt = noteContent.replace(/[#*`_~\[\]]/g, '').slice(0, 180).trim();
    const noteStatus = status === 'draft' ? 'draft' : 'published';
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

    const insertStmt = db.prepare(`
      INSERT INTO notes (id, slug, title, folder_id, content, excerpt, status, tags, reading_time, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      noteId,
      slug,
      title.trim(),
      folder_id || null,
      noteContent,
      excerpt,
      noteStatus,
      tagsJson,
      readingTime,
      is_pinned ? 1 : 0
    );

    // Sync graph links
    parseAndSyncNoteLinks(noteId, noteContent);

    logAudit('CREATE_NOTE', 'note', noteId, `Created note: "${title}" (${noteStatus})`, req);

    res.status(201).json({
      success: true,
      message: 'Note created successfully.',
      note: {
        id: noteId,
        slug,
        title: title.trim(),
        folder_id: folder_id || null,
        status: noteStatus,
        reading_time: readingTime
      }
    });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Internal server error creating note.' });
  }
});

// PUT /api/notes/:id (Update Note - Admin Only)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, folder_id, status, tags, is_pinned, slug: customSlug } = req.body;

    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    let slug = existing.slug;
    if (customSlug && customSlug !== existing.slug) {
      slug = slugify(customSlug);
      const duplicate = db.prepare('SELECT id FROM notes WHERE slug = ? AND id != ?').get(slug, id);
      if (duplicate) {
        return res.status(400).json({ error: 'Slug is already in use by another note.' });
      }
    }

    const noteTitle = title ? title.trim() : existing.title;
    const noteContent = content !== undefined ? content : existing.content;
    const readingTime = calculateReadingTime(noteContent);
    const excerpt = noteContent.replace(/[#*`_~\[\]]/g, '').slice(0, 180).trim();
    const noteStatus = status !== undefined ? status : existing.status;
    const tagsJson = tags !== undefined ? JSON.stringify(Array.isArray(tags) ? tags : []) : existing.tags;
    const pinnedVal = is_pinned !== undefined ? (is_pinned ? 1 : 0) : existing.is_pinned;
    const folderVal = folder_id !== undefined ? (folder_id || null) : existing.folder_id;

    const updateStmt = db.prepare(`
      UPDATE notes
      SET title = ?, slug = ?, folder_id = ?, content = ?, excerpt = ?,
          status = ?, tags = ?, reading_time = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(
      noteTitle,
      slug,
      folderVal,
      noteContent,
      excerpt,
      noteStatus,
      tagsJson,
      readingTime,
      pinnedVal,
      id
    );

    // Sync graph links
    parseAndSyncNoteLinks(id, noteContent);

    logAudit('UPDATE_NOTE', 'note', id, `Updated note: "${noteTitle}"`, req);

    res.json({
      success: true,
      message: 'Note updated successfully.',
      note: {
        id,
        slug,
        title: noteTitle,
        folder_id: folderVal,
        status: noteStatus,
        reading_time: readingTime
      }
    });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// DELETE /api/notes/:id (Trash or Permanent Delete - Admin Only)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    if (permanent === 'true' || permanent === '1' || existing.is_trashed === 1) {
      // Hard delete
      db.prepare('DELETE FROM notes WHERE id = ?').run(id);
      logAudit('DELETE_NOTE_PERMANENT', 'note', id, `Permanently deleted note: "${existing.title}"`, req);
      res.json({ success: true, message: 'Note permanently deleted.' });
    } else {
      // Move to trash
      db.prepare('UPDATE notes SET is_trashed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      logAudit('TRASH_NOTE', 'note', id, `Moved note to trash: "${existing.title}"`, req);
      res.json({ success: true, message: 'Note moved to trash.' });
    }
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// POST /api/notes/:id/restore (Restore note from trash - Admin Only)
router.post('/:id/restore', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    db.prepare('UPDATE notes SET is_trashed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    parseAndSyncNoteLinks(id, existing.content);

    logAudit('RESTORE_NOTE', 'note', id, `Restored note from trash: "${existing.title}"`, req);
    res.json({ success: true, message: 'Note restored from trash.' });
  } catch (err) {
    console.error('Restore note error:', err);
    res.status(500).json({ error: 'Failed to restore note.' });
  }
});

export default router;
