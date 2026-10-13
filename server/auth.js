import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pranks_secret_key_prod_9921_!@#';
const TOKEN_COOKIE_NAME = 'pranks_admin_token';

// Audit logger
export function logAudit(action, targetType, targetId, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(action, targetType, targetId, typeof details === 'object' ? JSON.stringify(details) : details, ip);
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}

// Check if any admin exists
export function hasAdminUser() {
  const count = db.prepare('SELECT COUNT(*) as count FROM admin_users').get().count;
  return count > 0;
}

// Create initial admin
export async function createAdminUser(username, password) {
  const hash = await bcrypt.hash(password, 12);
  const stmt = db.prepare(`
    INSERT INTO admin_users (username, password_hash)
    VALUES (?, ?)
  `);
  const result = stmt.run(username, hash);
  return { id: result.lastInsertRowid, username };
}

// Verify credentials
export async function verifyAdmin(username, password) {
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;
  return { id: user.id, username: user.username };
}

// Change password
export async function updateAdminPassword(userId, newPassword) {
  const hash = await bcrypt.hash(newPassword, 12);
  const stmt = db.prepare(`
    UPDATE admin_users 
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  return stmt.run(hash, userId);
}

// Sign JWT token
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Extract and verify user from req
export function getAuthenticatedUser(req) {
  // Check cookie or Authorization header
  let token = req.cookies ? req.cookies[TOKEN_COOKIE_NAME] : null;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

// Middleware: Require Admin Authentication
export function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Admin credentials required.' });
  }
  req.user = user;
  next();
}

// Middleware: Optional Authentication (sets req.user if present, but doesn't block)
export function optionalAuth(req, res, next) {
  req.user = getAuthenticatedUser(req);
  next();
}

export { TOKEN_COOKIE_NAME };
