/**
 * routes/auth.js — Auth routes
 * POST /api/auth/login      — username + password → JWT
 * GET  /api/auth/me         — current user info
 * GET  /api/auth/users      — list users (admin only)
 * POST /api/auth/users      — create user (admin only)
 * DELETE /api/auth/users/:id — delete user (admin only)
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Users } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES = '8h';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Введите логин и пароль' });
  }

  const user = Users.findByUsername(username.trim());
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return res.json({
    ok: true,
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = Users.findById(req.user.id);
  if (!user) return res.status(404).json({ ok: false, error: 'Пользователь не найден' });
  return res.json({ ok: true, data: user });
});

// GET /api/auth/users (admin)
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  return res.json({ ok: true, data: Users.list() });
});

// POST /api/auth/users (admin)
router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role = 'operator' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Введите логин и пароль' });
  }
  if (!['admin', 'operator'].includes(role)) {
    return res.status(400).json({ ok: false, error: 'Роль: admin или operator' });
  }
  try {
    const id = Users.create(username.trim(), password, role);
    return res.json({ ok: true, data: { id, username, role } });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, error: 'Пользователь с таким именем уже существует' });
    }
    throw e;
  }
});

// DELETE /api/auth/users/:id (admin)
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ ok: false, error: 'Нельзя удалить самого себя' });
  }
  Users.delete(id);
  return res.json({ ok: true });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = Users.findByUsername(req.user.username);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ ok: false, error: 'Неверный текущий пароль' });
  }
  Users.changePassword(req.user.id, newPassword);
  return res.json({ ok: true });
});

module.exports = router;
