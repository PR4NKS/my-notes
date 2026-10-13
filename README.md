# Pranks — Cybersecurity Knowledge-Base & Notes Platform

A full-stack, responsive cybersecurity documentation and knowledge-base platform inspired by and faithfully recreating the design and features in `Capture.JPG`.

---

## 🚀 Features

### 1. UI & Layout (Screenshot Replica)
- **Left Sidebar**:
  - `Pranks` brand header in signature deep maroon (`#881337`).
  - Search pill with instant search dialog (`Ctrl+K`).
  - Theme toggle (Screenshot neutral slate mode vs. dark mode).
  - Documentation root icon and secure Admin access trigger.
  - Expandable `Explorer ˅` section with hierarchical folder tree (`ctf`, `cyber notes`, `tools`, `commands`, `research`, `documentation`).
  - Active note selection indicator with nested navigation.
- **Center Content Panel**:
  - Selected note title indicator, creation date, updated date, and calculated reading time (e.g. `Dec 30, 2025, 3 min read`).
  - Rich Markdown rendering with heading styling matching `Capture.JPG`.
  - Prism syntax-highlighted code blocks with language indicators and one-click copy buttons.
  - Mathematical expression rendering via KaTeX (`$formula$` and `$$block$$`).
  - Tables, blockquotes, bullet lists, and automatic internal wiki links (`[[Note Name]]`).
  - Document & PDF attachment viewer embedded directly into notes.
- **Right Sidebar**:
  - **Interactive Graph View**: Force-directed network graph visualizing real note relationships and backlinks. Click any node to navigate immediately; zoom and pan supported.
  - **Table of Contents ˅**: Automatically parses headings, supports nested indentation, smooth scrolling on click, and live ScrollSpy viewport tracking.
  - Backlinks and cross-referenced document relationships.

### 2. Secure Admin Authentication & Authorization
- Password hashing using **bcrypt** (salt factor 12).
- HTTP-only, secure, SameSite session cookies and JWT authentication tokens.
- Brute-force protection with rate-limiting on login endpoints.
- First-time setup wizard for safe administrator initialization.
- Password change interface.
- Public privacy isolation: Drafts and trashed notes are strictly inaccessible to public visitors (returns 403 Forbidden).

### 3. Admin Dashboard & Note Management
- Live statistic cards: Total notes, published notes, drafts, total folders, attachments, trashed notes.
- Recent changes audit trail with timestamps and IP logging.
- Built-in Markdown Editor with live split-preview, folder assignment, tag management, custom URL slugs, and pin/publish controls.
- Safe Trash Bin with restore and permanent delete options.

### 4. Note Upload & Document Processing System
- Supports `.md`, `.markdown`, `.txt`, `.pdf`, `.docx`, and images (`.png`, `.jpg`, `.webp`, `.svg`).
- Path traversal prevention and filename sanitization.
- Automatic content extraction:
  - Markdown and plain text files automatically create indexed notes.
  - Word documents (`.docx`) are parsed via `mammoth` and imported into notes.
  - PDFs and images are stored securely in `data/uploads/` and linked as attachments.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, SQLite (`better-sqlite3`), bcryptjs, jsonwebtoken, multer, mammoth, helmet, express-rate-limit.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, D3.js (Force Simulation), Marked, DOMPurify, Prism.js, KaTeX.
- **Database**: SQLite (persisted in `data/pranks_notes.db` with WAL mode and foreign key integrity).

---

## 💻 Quick Start

### 1. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Development Mode
Run both backend API server and Vite frontend concurrently:
```bash
npm run dev
```
- Backend runs on `http://localhost:3001`
- Vite dev server runs on `http://localhost:5173` (proxies `/api` and `/uploads` to port 3001)

### 3. Production Build & Start
```bash
# Build frontend assets to client/dist
npm run build

# Start production server
npm start
```
The server serves the full application on `http://localhost:3001`.

---

## 🔑 Default Admin Setup
Upon first launching the platform:
1. Click the lock icon in the top left sidebar (or use the Admin login modal).
2. Enter your desired Admin Username and Master Password (minimum 8 characters).
3. The system will securely hash your password and log you in.

---

## 🧪 Automated Verification Tests
Run the test suite to verify all endpoints, privacy rules, and graph operations:
```bash
node test-suite.js
```
