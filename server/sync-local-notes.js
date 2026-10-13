import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db, { calculateReadingTime, parseAndSyncNoteLinks } from './db.js';

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

export function syncLocalCyberNotes() {
  const rootCyberNotesDir = path.join(process.cwd(), 'cyber notes');
  if (!fs.existsSync(rootCyberNotesDir)) return;

  console.log('[Sync] Scanning and syncing existing "cyber notes" directory...');

  const insertFolder = db.prepare(`
    INSERT OR IGNORE INTO folders (id, name, parent_id, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertNote = db.prepare(`
    INSERT OR IGNORE INTO notes (id, slug, title, folder_id, content, excerpt, status, tags, reading_time, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  // Ensure top-level 'cyber-notes' folder exists
  insertFolder.run('cyber-notes', 'cyber notes', null, 2);

  function walkDir(currentPath, parentFolderId) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.includes('web security')) {
          continue; // exclude Web Security
        }

        let displayName = entry.name;
        let targetParentId = parentFolderId;

        if (lowerName.includes('bug bounty')) {
          displayName = 'Bug Bounty';
          targetParentId = null; // Display as root folder alongside ctf and cyber notes
        } else if (lowerName === 'cheetsheat') {
          displayName = 'Cheatsheets';
        }

        let folderSlug = `folder-${slugify(entry.name)}-${crypto.createHash('md5').update(fullPath).digest('hex').slice(0, 6)}`;
        if (lowerName.includes('bug bounty')) {
          folderSlug = 'folder-bug-bountynotes-dce2cc';
        }

        const existing = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderSlug);
        if (!existing) {
          insertFolder.run(folderSlug, displayName, targetParentId, 0);
        } else {
          db.prepare('UPDATE folders SET name = ?, parent_id = ? WHERE id = ?').run(displayName, targetParentId, folderSlug);
        }
        walkDir(fullPath, folderSlug);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const ext = path.extname(entry.name);
          const baseName = path.basename(entry.name, ext);
          const noteSlug = slugify(baseName) || `note-${Date.now()}`;
          const noteId = `note-local-${crypto.createHash('md5').update(fullPath).digest('hex').slice(0, 8)}`;

          // Infer title from first markdown header if available
          let noteTitle = baseName;
          const firstHeader = content.match(/^#\s+(.+)$/m);
          if (firstHeader && firstHeader[1]) {
            noteTitle = firstHeader[1].replace(/[🛡️📌🎯⚡🚩]/g, '').trim() || baseName;
          }

          const readingTime = calculateReadingTime(content);
          const excerpt = content.replace(/[#*`_~\[\]]/g, '').slice(0, 180).trim();

          insertNote.run(
            noteId,
            noteSlug,
            noteTitle,
            parentFolderId,
            content,
            excerpt,
            'published',
            JSON.stringify(['local-import', baseName.toLowerCase()]),
            readingTime
          );

          parseAndSyncNoteLinks(noteId, content);
        } catch (err) {
          console.error(`[Sync] Error reading note ${entry.name}:`, err.message);
        }
      }
    }
  }

  walkDir(rootCyberNotesDir, 'cyber-notes');
  console.log('[Sync] Finished syncing local cyber notes.');
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('sync-local-notes.js')) {
  syncLocalCyberNotes();
}
