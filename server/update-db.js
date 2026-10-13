import Database from 'better-sqlite3';
import { calculateReadingTime, parseAndSyncNoteLinks } from './db.js';

const db = new Database('data/pranks_notes.db');

console.log('[Update] Applying user changes: Remove Web Security, promote Bug Bounty, rename to Pranks...');

// 1. Delete 'cn-web' (Web Security) folder
const deleteWebFolder = db.prepare("DELETE FROM folders WHERE id = 'cn-web' OR LOWER(name) = 'web security'");
deleteWebFolder.run();

// 2. Remove dummy note-ssrf-001 if present
db.prepare("DELETE FROM notes WHERE id = 'note-ssrf-001'").run();

// 3. Promote/rename Bug Bounty folder
const renameBugBounty = db.prepare(`
  UPDATE folders 
  SET name = 'Bug Bounty', parent_id = NULL, sort_order = 2
  WHERE id = 'folder-bug-bountynotes-dce2cc' OR LOWER(name) LIKE '%bug bounty%'
`);
renameBugBounty.run();

// Also rename subfolder cheetsheat to Cheatsheet if exists
db.prepare("UPDATE folders SET name = 'Cheatsheets' WHERE LOWER(name) = 'cheetsheat'").run();

// 4. Update index note content to feature Bug Bounty prominently
const updatedIndexContent = `# 🛡️ Centralized Hacking Techniques & Technical Guides

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
* [[🧠 Race Conditions in Bug Bounty (Advanced & Beast Mode Guide)]]
* [[ Path Traversal Vulnerability – Complete Notes]]
* [[HTB: Phantom - Full Writeup]]

> **OPSEC Caution**: All techniques documented here are strictly intended for authorized penetration testing, vulnerability research, and security engineering.
`;

const readingTime = calculateReadingTime(updatedIndexContent);
const excerpt = updatedIndexContent.replace(/[#*`_~\[\]]/g, '').slice(0, 180).trim();

db.prepare(`
  UPDATE notes
  SET content = ?, excerpt = ?, reading_time = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = 'note-index-001' OR slug = 'index'
`).run(updatedIndexContent, excerpt, readingTime);

// Re-sync note links for index note
parseAndSyncNoteLinks('note-index-001', updatedIndexContent);

console.log('[Update] Database successfully updated with Bug Bounty notes and Web Security removed.');
