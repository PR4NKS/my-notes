import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { syncLocalCyberNotes } from './sync-local-notes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let baseDataDir = path.join(__dirname, '..', 'data');

if (process.env.VERCEL) {
  const tmpDataDir = path.join('/tmp', 'data');
  if (!fs.existsSync(tmpDataDir)) {
    fs.mkdirSync(tmpDataDir, { recursive: true });
    const sourceDb = path.join(baseDataDir, 'pranks_notes.db');
    const targetDb = path.join(tmpDataDir, 'pranks_notes.db');
    if (fs.existsSync(sourceDb)) {
      try {
        fs.copyFileSync(sourceDb, targetDb);
      } catch (err) {
        console.warn('Failed to copy db to /tmp:', err.message);
      }
    }
  }
  baseDataDir = tmpDataDir;
} else if (!fs.existsSync(baseDataDir)) {
  fs.mkdirSync(baseDataDir, { recursive: true });
}

export const dataDir = baseDataDir;
export const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'pranks_notes.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for reliability and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      folder_id TEXT,
      content TEXT NOT NULL,
      excerpt TEXT,
      status TEXT DEFAULT 'published', -- 'published' | 'draft'
      tags TEXT, -- JSON array of strings
      reading_time TEXT,
      is_pinned INTEGER DEFAULT 0,
      is_trashed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS note_links (
      source_note_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      link_text TEXT,
      PRIMARY KEY (source_note_id, target_note_id),
      FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_notes_slug ON notes(slug);
    CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
    CREATE INDEX IF NOT EXISTS idx_notes_trashed ON notes(is_trashed);
    CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
  `);

  seedInitialData();
  syncLocalCyberNotes();
}

// Function to calculate estimated reading time
export function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const words = text ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} min read`;
}

// Extract internal links from markdown content: [[Target Note]] or [Text](slug)
export function parseAndSyncNoteLinks(noteId, content) {
  const deleteStmt = db.prepare('DELETE FROM note_links WHERE source_note_id = ?');
  deleteStmt.run(noteId);

  if (!content) return;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO note_links (source_note_id, target_note_id, link_text)
    VALUES (?, ?, ?)
  `);

  // 1. Match wiki links: [[Target Note]] or [[Target Note|Custom Text]]
  const wikiLinkRegex = /\[\[([a-zA-Z0-9_\-\s]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    const linkText = match[2] ? match[2].trim() : rawTarget;
    // Find note by title or slug
    const target = db.prepare(`
      SELECT id FROM notes 
      WHERE (LOWER(title) = LOWER(?) OR LOWER(slug) = LOWER(?)) 
        AND is_trashed = 0
    `).get(rawTarget, rawTarget.toLowerCase().replace(/\s+/g, '-'));

    if (target && target.id !== noteId) {
      insertStmt.run(noteId, target.id, linkText);
    }
  }

  // 2. Match standard markdown links to internal notes: [text](/notes/slug) or [text](slug)
  const mdLinkRegex = /\[([^\]]+)\]\((?:\/notes\/)?([a-zA-Z0-9_\-]+)\)/g;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const targetSlug = match[2];
    const target = db.prepare(`
      SELECT id FROM notes 
      WHERE (LOWER(slug) = LOWER(?) OR LOWER(title) = LOWER(?)) 
        AND is_trashed = 0
    `).get(targetSlug, targetSlug);

    if (target && target.id !== noteId) {
      insertStmt.run(noteId, target.id, linkText);
    }
  }
}

// Helper to seed folders and default notes
function seedInitialData() {
  const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
  if (noteCount > 0) return; // already seeded

  console.log('[DB] Seeding initial folders and documentation...');

  const insertFolder = db.prepare(`
    INSERT OR IGNORE INTO folders (id, name, parent_id, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  // Top level folders matching screenshot and prompt
  insertFolder.run('ctf', 'ctf', null, 1);
  insertFolder.run('cyber-notes', 'cyber notes', null, 2);
  insertFolder.run('tools', 'tools', null, 3);
  insertFolder.run('commands', 'commands', null, 4);
  insertFolder.run('research', 'research', null, 5);
  insertFolder.run('documentation', 'documentation', null, 6);

  // Subfolders
  insertFolder.run('ctf-challenges', 'Challenges', 'ctf', 1);
  insertFolder.run('ctf-writeups', 'Writeups', 'ctf', 2);

  insertFolder.run('bug-bounty', 'Bug Bounty', null, 2);
  insertFolder.run('cn-net', 'Network Security', 'cyber-notes', 2);
  insertFolder.run('cn-ad', 'Active Directory', 'cyber-notes', 3);
  insertFolder.run('cn-linux', 'Linux Security', 'cyber-notes', 4);
  insertFolder.run('cn-win', 'Windows Security', 'cyber-notes', 5);
  insertFolder.run('cn-vuln', 'Vulnerability Research', 'cyber-notes', 6);

  // Insert Notes
  const insertNote = db.prepare(`
    INSERT INTO notes (id, slug, title, folder_id, content, excerpt, status, tags, reading_time, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Primary Index Note (from Capture.JPG)
  const indexContent = `# 🛡️ Centralized Hacking Techniques & Technical Guides

## 📌 Project Overview

This project is aimed at providing **technical guides and structured knowledge** on a wide range of hacking and cybersecurity topics.
Its primary focus is on **advanced attack surfaces**, with special emphasis on:

* **Active Directory**
* **Bug Bounty**

Additional topics will be added over time to expand coverage across multiple domains of offensive security.

The ultimate goal is to centralize hacking techniques, methodologies, and concepts into a cohesive, searchable, and interconnected knowledge base.

## 🎯 Objectives

1. **Centralize Offensive Knowledge**: Aggregate tactical notes, command cheatsheets, and attack trees into a unified reference.
2. **Interactive Methodology Mapping**: Track attack paths and technique relations via the [[Graph View]] and linked documentation.
3. **Reproducible Proof-of-Concepts**: Provide verifiable exploit walkthroughs and mitigation recommendations.
4. **Continuous Expansion**: Document emerging CVEs, Active Directory attack primitives, and modern Bug Bounty methodologies.

## 🛠️ Core Focus Domains

| Domain | Key Techniques | Primary Targets |
| :--- | :--- | :--- |
| **Active Directory** | Kerberoasting, AS-REP Roasting, DCSync, BloodHound path analysis, AD CS Abuse | Domain Controllers, Tier-0 Assets |
| **Bug Bounty** | SQL Injection, SSRF, CORS Misconfigurations, JWT Attacks, Clickjacking, Race Conditions | Web Applications, Cloud APIs |
| **Network & Infrastructure** | Pivot tunnels, Port redirection, MITM, VLAN hopping | Perimeter routers, Internal switches |
| **Binary Exploitation** | Buffer overflows, ROP chains, Heap exploitation, ASLR/DEP bypass | Custom daemons, Embedded firmware |

### 🔍 Quick Command Example: Kerberoasting

\`\`\`bash
# Request SPN tickets using Impacket GetUserSPNs
impacket-GetUserSPNs "CORP.LOCAL/jdoe:Password123!" -request -dc-ip 10.10.10.1 -outputfile hashes.kerberoast

# Crack TGS hashes offline with hashcat
hashcat -m 13100 -a 0 hashes.kerberoast /usr/share/wordlists/rockyou.txt -O
\`\`\`

### 🔗 Bug Bounty & Attack Guides
* [[Active Directory Attack Paths]]
* [[Kerberoasting & AS-REP Roasting Deep Dive]]
* [[Server-side request forgery (SSRF)]]
* [[How to Detect SQL Injection]]
* [[SQL Injection Cheat Sheet]]
* [[JWT Attacks]]
* [[CORS  Misconfigurations]]
* [[clickjacking]]
* [[HTB: Phantom - Full Writeup]]

> **OPSEC Caution**: All techniques documented here are strictly intended for authorized penetration testing, vulnerability research, and security engineering.
`;

  insertNote.run(
    'note-index-001',
    'index',
    'index',
    null,
    indexContent,
    'Centralized Hacking Techniques & Technical Guides. Primary focus on advanced attack surfaces.',
    'published',
    JSON.stringify(['overview', 'methodology', 'cheatsheet']),
    '3 min read',
    1,
    '2025-12-30 14:20:00',
    '2025-12-30 14:20:00'
  );

  // 2. Active Directory Attack Paths
  const adContent = `# 🏰 Active Directory Attack Paths

## 📌 Overview
Active Directory (AD) remains the predominant identity backbone for enterprise environments. Compromising the domain involves chained privilege escalations, credential abuse, and trust exploitation.

### 🗺️ Kill Chain Phases
1. **Initial Access**: Password spraying, phishing, or external foothold.
2. **Reconnaissance**: BloodHound / SharpHound data collection and LDAP queries.
3. **Lateral Movement**: Pass-the-Hash, Overpass-the-Hash, WMI / WinRM execution.
4. **Domain Dominance**: Golden Ticket, Skeleton Key, DCSync.

### ⚔️ Key Primitives
* Kerberos ticket manipulation: [[Kerberoasting & AS-REP Roasting Deep Dive]]
* Active Directory Certificate Services (AD CS) misconfigurations (ESC1 to ESC8)
* Unconstrained & Constrained Delegation abuse

See root reference in [[index]].
`;

  insertNote.run(
    'note-ad-001',
    'active-directory-attack-paths',
    'Active Directory Attack Paths',
    'cn-ad',
    adContent,
    'Enterprise domain privilege escalation and lateral movement attack paths.',
    'published',
    JSON.stringify(['active-directory', 'kerberos', 'bloodhound']),
    '4 min read',
    0,
    '2026-01-05 10:15:00',
    '2026-01-05 10:15:00'
  );

  // 3. Kerberoasting & AS-REP Roasting Deep Dive
  const roastContent = `# ⚡ Kerberoasting & AS-REP Roasting Deep Dive

## 📌 Concept & Protocol Architecture
Kerberos service ticket requests (TGS-REQ) allow any authenticated domain user to request a ticket encrypted with the Service Principal Name (SPN) account's NTLM hash. Offline brute-forcing extracts plaintext credentials without alerting host monitoring.

### 🛠️ Execution Syntax

\`\`\`powershell
# Query domain accounts with SPNs set using PowerShell ActiveDirectory module
Get-ADUser -Filter {ServicePrincipalName -like "*"} -Properties ServicePrincipalName,MemberOf
\`\`\`

\`\`\`bash
# Request RC4-HMAC ticket and dump for offline hash cracking
python3 GetUserSPNs.py corp.local/attacker:Summer2024 -request -dc-ip 192.168.1.10
\`\`\`

Referenced back to [[Active Directory Attack Paths]] and central [[index]].
`;

  insertNote.run(
    'note-roast-001',
    'kerberoasting-as-rep-roasting',
    'Kerberoasting & AS-REP Roasting Deep Dive',
    'cn-ad',
    roastContent,
    'Detailed breakdown of TGS request abuse and offline Kerberos ticket cracking.',
    'published',
    JSON.stringify(['active-directory', 'kerberos', 'credentials']),
    '5 min read',
    0,
    '2026-01-12 16:30:00',
    '2026-01-12 16:30:00'
  );


  // 5. HTB: Phantom - Full Writeup
  const ctfContent = `# 🚩 HTB: Phantom - Full Writeup

## 📌 Summary
* **OS**: Linux
* **Difficulty**: Hard
* **Key Vulnerabilities**: Prototype Pollution to RCE, GDB Server privilege escalation.

### 🔍 Enumeration
Port scan results:
\`\`\`text
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.9p1
80/tcp   open  http    nginx 1.18.0
3000/tcp open  ppp?    Node.js Express App
\`\`\`

### 💥 Exploitation
Exploited prototype pollution in user preference JSON parser to overwrite \`child_process\` parameters.

Linked to [[index]] and [[Server-Side Request Forgery Playbook]].
`;

  insertNote.run(
    'note-ctf-001',
    'htb-phantom-writeup',
    'HTB: Phantom - Full Writeup',
    'ctf-writeups',
    ctfContent,
    'HackTheBox Phantom challenge walkthrough covering Prototype Pollution to RCE and kernel exploitation.',
    'published',
    JSON.stringify(['ctf', 'writeup', 'nodejs', 'privesc']),
    '7 min read',
    0,
    '2026-02-02 21:10:00',
    '2026-02-02 21:10:00'
  );

  // Connect the links in note_links
  parseAndSyncNoteLinks('note-index-001', indexContent);
  parseAndSyncNoteLinks('note-ad-001', adContent);
  parseAndSyncNoteLinks('note-roast-001', roastContent);
  parseAndSyncNoteLinks('note-ctf-001', ctfContent);

  console.log('[DB] Seeding completed successfully.');
}

export default db;
