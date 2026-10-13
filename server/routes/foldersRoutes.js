import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth, optionalAuth, logAudit } from '../auth.js';

const router = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// Check circular hierarchy
function isDescendant(potentialChildId, targetParentId) {
  if (potentialChildId === targetParentId) return true;
  let current = db.prepare('SELECT parent_id FROM folders WHERE id = ?').get(targetParentId);
  while (current && current.parent_id) {
    if (current.parent_id === potentialChildId) return true;
    current = db.prepare('SELECT parent_id FROM folders WHERE id = ?').get(current.parent_id);
  }
  return false;
}

// GET /api/folders
router.get('/', optionalAuth, (req, res) => {
  try {
    const isAdmin = !!req.user;
    const folders = db.prepare('SELECT * FROM folders ORDER BY sort_order ASC, name ASC').all();

    // Get note counts per folder
    let countQuery = `
      SELECT folder_id, COUNT(*) as count 
      FROM notes 
      WHERE is_trashed = 0
    `;
    if (!isAdmin) {
      countQuery += ` AND status = 'published'`;
    }
    countQuery += ` GROUP BY folder_id`;

    const counts = db.prepare(countQuery).all();
    const countMap = {};
    counts.forEach(c => {
      if (c.folder_id) countMap[c.folder_id] = c.count;
    });

    // Build hierarchy tree
    const folderMap = {};
    const rootFolders = [];

    folders.forEach(f => {
      folderMap[f.id] = {
        ...f,
        noteCount: countMap[f.id] || 0,
        children: []
      };
    });

    folders.forEach(f => {
      if (f.parent_id && folderMap[f.parent_id]) {
        folderMap[f.parent_id].children.push(folderMap[f.id]);
      } else {
        rootFolders.push(folderMap[f.id]);
      }
    });

    // Deduplicate children across each folder
    Object.values(folderMap).forEach(folder => {
      const seen = new Set();
      folder.children = folder.children.filter(child => {
        const key = child.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    // Deduplicate root folders
    const uniqueRoots = [];
    const seenRoots = new Set();
    for (const r of rootFolders) {
      const key = r.name.toLowerCase().trim();
      if (!seenRoots.has(key)) {
        seenRoots.add(key);
        uniqueRoots.push(r);
      }
    }

    res.json({
      tree: uniqueRoots,
      all: folders.map(f => ({ ...f, noteCount: countMap[f.id] || 0 }))
    });
  } catch (err) {
    console.error('Fetch folders error:', err);
    res.status(500).json({ error: 'Failed to retrieve folders.' });
  }
});

// POST /api/folders (Create folder - Admin Only)
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    const cleanName = name.trim();
    let folderId = slugify(cleanName);
    const existing = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId);
    if (existing) {
      folderId = `${folderId}-${crypto.randomBytes(2).toString('hex')}`;
    }

    if (parent_id) {
      const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(parent_id);
      if (!parent) {
        return res.status(400).json({ error: 'Specified parent folder does not exist.' });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO folders (id, name, parent_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(folderId, cleanName, parent_id || null);

    logAudit('CREATE_FOLDER', 'folder', folderId, `Created folder: "${cleanName}"`, req);

    res.status(201).json({
      success: true,
      message: 'Folder created successfully.',
      folder: { id: folderId, name: cleanName, parent_id: parent_id || null }
    });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: 'Failed to create folder.' });
  }
});

// PUT /api/folders/:id (Rename or move folder - Admin Only)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    let targetParent = existing.parent_id;
    if (parent_id !== undefined) {
      if (parent_id === id) {
        return res.status(400).json({ error: 'Folder cannot be its own parent.' });
      }
      if (parent_id && isDescendant(id, parent_id)) {
        return res.status(400).json({ error: 'Cannot move a folder into its own subfolder (circular reference).' });
      }
      targetParent = parent_id || null;
    }

    const targetName = name ? name.trim() : existing.name;

    const stmt = db.prepare(`
      UPDATE folders
      SET name = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(targetName, targetParent, id);

    logAudit('UPDATE_FOLDER', 'folder', id, `Updated folder: "${targetName}"`, req);

    res.json({
      success: true,
      message: 'Folder updated successfully.',
      folder: { id, name: targetName, parent_id: targetParent }
    });
  } catch (err) {
    console.error('Update folder error:', err);
    res.status(500).json({ error: 'Failed to update folder.' });
  }
});

// DELETE /api/folders/:id (Delete folder - Admin Only)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    // Unassign notes from this folder or subfolders before deletion
    db.prepare('UPDATE notes SET folder_id = NULL WHERE folder_id = ?').run(id);

    // Delete folder
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);

    logAudit('DELETE_FOLDER', 'folder', id, `Deleted folder: "${existing.name}"`, req);

    res.json({ success: true, message: 'Folder deleted successfully.' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: 'Failed to delete folder.' });
  }
});

export default router;
