import express from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAuth, (req, res) => {
  try {
    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE is_trashed = 0').get().count;
    const publishedNotes = db.prepare("SELECT COUNT(*) as count FROM notes WHERE status = 'published' AND is_trashed = 0").get().count;
    const draftNotes = db.prepare("SELECT COUNT(*) as count FROM notes WHERE status = 'draft' AND is_trashed = 0").get().count;
    const trashedNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE is_trashed = 1').get().count;
    const totalFolders = db.prepare('SELECT COUNT(*) as count FROM folders').get().count;
    const totalAttachments = db.prepare('SELECT COUNT(*) as count FROM attachments').get().count;

    const recentNotes = db.prepare(`
      SELECT id, slug, title, status, updated_at
      FROM notes
      WHERE is_trashed = 0
      ORDER BY updated_at DESC
      LIMIT 6
    `).all();

    const recentLogs = db.prepare(`
      SELECT id, action, target_type, details, ip_address, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    res.json({
      totalNotes,
      publishedNotes,
      draftNotes,
      trashedNotes,
      totalFolders,
      totalAttachments,
      recentNotes,
      recentLogs
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
});

// GET /api/admin/activity
router.get('/activity', requireAuth, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT id, action, target_type, target_id, details, ip_address, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    res.json(logs);
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

export default router;
