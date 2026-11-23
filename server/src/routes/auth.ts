import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { UserRow } from '../domain/types.js';

const router = Router();

// Demo users persona picker
router.get('/auth/demo-users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `).all();

  res.json({ users });
});

// Email and password login
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' },
    });
  }

  const user = db.prepare(`
    SELECT u.*, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE LOWER(u.email) = LOWER(?)
  `).get(email.trim()) as any;

  if (!user) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    department_name: user.department_name,
    department_code: user.department_code,
  };

  const token = generateToken(authUser);

  // Set httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.json({
    user: authUser,
    token, // Also return in body for easy client Bearer authorization
  });
});

// Logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Current user
router.get('/auth/me', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
  }

  res.json({ user });
});

export default router;
