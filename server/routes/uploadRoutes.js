import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mammoth from 'mammoth';
import db, { calculateReadingTime, parseAndSyncNoteLinks, uploadsDir } from '../db.js';
import { requireAuth, logAudit } from '../auth.js';

const router = express.Router();
const uploadDirectory = uploadsDir;

// Allowed MIME types and extensions
const ALLOWED_EXTENSIONS = new Set([
  '.md', '.markdown', '.txt',
  '.pdf',
  '.docx',
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'
]);

function getExtension(file) {
  let ext = path.extname(file.originalname || '').toLowerCase();
  if (!ext && file.mimetype) {
    if (file.mimetype === 'image/png') ext = '.png';
    else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') ext = '.jpg';
    else if (file.mimetype === 'image/webp') ext = '.webp';
    else if (file.mimetype === 'image/gif') ext = '.gif';
    else if (file.mimetype === 'image/svg+xml') ext = '.svg';
  }
  return ext || '.png';
}

// Sanitize filename to prevent directory traversal
function sanitizeFilename(file) {
  const ext = getExtension(file);
  const rawName = file.originalname || 'pasted_image';
  const rawBase = path.basename(rawName, path.extname(rawName));
  const base = rawBase.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60) || 'image';
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${base}_${Date.now()}_${randomSuffix}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFilename(file));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max limit
  },
  fileFilter: (req, file, cb) => {
    const ext = getExtension(file);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type ${ext} is not supported.`));
    }
    cb(null, true);
  }
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

// POST /api/upload/file (Upload attachment or document)
router.post('/file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const { note_id } = req.body;
    const fileId = `att-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;

    const attachmentRecord = {
      id: fileId,
      note_id: note_id || null,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
      storage_path: `/uploads/${req.file.filename}`,
      url: `/uploads/${req.file.filename}`,
      extension: ext
    };

    const stmt = db.prepare(`
      INSERT INTO attachments (id, note_id, filename, original_name, mime_type, size, storage_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      attachmentRecord.id,
      attachmentRecord.note_id,
      attachmentRecord.filename,
      attachmentRecord.original_name,
      attachmentRecord.mime_type,
      attachmentRecord.size,
      attachmentRecord.storage_path
    );

    logAudit('UPLOAD_FILE', 'attachment', fileId, `Uploaded file: ${req.file.originalname}`, req);

    res.json({
      success: true,
      message: 'File uploaded successfully.',
      file: attachmentRecord
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed.' });
  }
});

// POST /api/upload/import-note (Imports markdown, txt, docx directly into notes)
router.post('/import-note', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded for note import.' });
    }

    const { folder_id, status } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const originalBaseName = path.basename(req.file.originalname, ext);
    let noteContent = '';

    if (ext === '.md' || ext === '.markdown' || ext === '.txt') {
      noteContent = fs.readFileSync(req.file.path, 'utf-8');
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: req.file.path });
      noteContent = `# ${originalBaseName}\n\n${result.value}`;
    } else if (ext === '.pdf') {
      noteContent = `# ${originalBaseName}\n\n[📄 View Embedded Document](/uploads/${req.file.filename})\n\n*(Uploaded PDF Document)*`;
    } else {
      noteContent = `# ${originalBaseName}\n\n![${originalBaseName}](/uploads/${req.file.filename})`;
    }

    // Title inference: check if first line is '# Title'
    let noteTitle = originalBaseName;
    const firstLineMatch = noteContent.match(/^#\s+(.+)$/m);
    if (firstLineMatch && firstLineMatch[1]) {
      noteTitle = firstLineMatch[1].replace(/[🛡️📌🎯⚡🚩]/g, '').trim() || originalBaseName;
    }

    const noteId = `note-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    let slug = slugify(noteTitle) || `note-${Date.now()}`;
    const existingSlug = db.prepare('SELECT id FROM notes WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const readingTime = calculateReadingTime(noteContent);
    const excerpt = noteContent.replace(/[#*`_~\[\]]/g, '').slice(0, 180).trim();
    const noteStatus = status === 'draft' ? 'draft' : 'published';

    const insertStmt = db.prepare(`
      INSERT INTO notes (id, slug, title, folder_id, content, excerpt, status, tags, reading_time, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    insertStmt.run(
      noteId,
      slug,
      noteTitle,
      folder_id || null,
      noteContent,
      excerpt,
      noteStatus,
      JSON.stringify(['imported', ext.replace('.', '')]),
      readingTime
    );

    // Link uploaded file as an attachment
    const attId = `att-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO attachments (id, note_id, filename, original_name, mime_type, size, storage_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attId,
      noteId,
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      `/uploads/${req.file.filename}`
    );

    parseAndSyncNoteLinks(noteId, noteContent);

    logAudit('IMPORT_NOTE', 'note', noteId, `Imported note from file: ${req.file.originalname}`, req);

    res.status(201).json({
      success: true,
      message: 'Note imported and published successfully.',
      note: {
        id: noteId,
        slug,
        title: noteTitle,
        folder_id: folder_id || null,
        status: noteStatus,
        reading_time: readingTime
      }
    });
  } catch (err) {
    console.error('Note import error:', err);
    res.status(500).json({ error: err.message || 'Note import failed.' });
  }
});

export default router;
