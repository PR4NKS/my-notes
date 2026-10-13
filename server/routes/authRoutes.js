import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  hasAdminUser, 
  createAdminUser, 
  verifyAdmin, 
  updateAdminPassword, 
  generateToken, 
  requireAuth, 
  getAuthenticatedUser,
  logAudit,
  TOKEN_COOKIE_NAME 
} from '../auth.js';

const router = express.Router();

// Rate limiting for login attempts (prevent brute-force attacks as per prompt sec 2)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  const hasAdmin = hasAdminUser();
  const user = getAuthenticatedUser(req);
  res.json({
    hasAdmin,
    isAuthenticated: !!user,
    user: user ? { id: user.id, username: user.username } : null
  });
});

// POST /api/auth/setup (First-time admin setup)
router.post('/setup', async (req, res) => {
  try {
    if (hasAdminUser()) {
      return res.status(400).json({ error: 'Admin user already exists. Setup is locked.' });
    }

    const { username, password } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const admin = await createAdminUser(username.trim(), password);
    const token = generateToken({ id: admin.id, username: admin.username });

    res.cookie(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logAudit('ADMIN_SETUP', 'admin_user', admin.id, `First-time setup for ${admin.username}`, req);

    res.json({
      success: true,
      message: 'Admin account initialized successfully.',
      user: { id: admin.id, username: admin.username }
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Internal server error during admin setup.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = await verifyAdmin(username.trim(), password);
    if (!admin) {
      logAudit('LOGIN_FAILED', 'admin_user', null, `Failed login attempt for ${username}`, req);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken({ id: admin.id, username: admin.username });

    res.cookie(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logAudit('LOGIN_SUCCESS', 'admin_user', admin.id, `Logged in: ${admin.username}`, req);

    res.json({
      success: true,
      message: 'Authentication successful.',
      user: { id: admin.id, username: admin.username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (user) {
    logAudit('LOGOUT', 'admin_user', user.id, `Logged out: ${user.username}`, req);
  }
  res.clearCookie(TOKEN_COOKIE_NAME);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const verified = await verifyAdmin(req.user.username, currentPassword);
    if (!verified) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    await updateAdminPassword(req.user.id, newPassword);
    logAudit('PASSWORD_CHANGED', 'admin_user', req.user.id, `Password changed by ${req.user.username}`, req);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error updating password.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
