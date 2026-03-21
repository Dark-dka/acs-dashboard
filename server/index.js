/**
 * index.js — ACS Dashboard Backend
 *
 * Endpoints:
 *   POST /api/auth/login          — login with username/password → JWT
 *   GET  /api/auth/me             — current user
 *   GET  /api/auth/users          — list users (admin)
 *   POST /api/auth/users          — create user (admin)
 *   DELETE /api/auth/users/:id    — delete user (admin)
 *   ALL  /api/acs/*               — proxy to ACS API (auth required)
 */
require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');

const { seedAdmin } = require('./db');
const authRouter = require('./routes/auth');
const proxyRouter = require('./routes/proxy');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/acs', proxyRouter);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 404
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ ok: false, error: err.message });
});

// ── Start ───────────────────────────────────────────────────────────────────
seedAdmin();
app.listen(PORT, () => {
  console.log(`\n🚀 ACS Backend running on http://localhost:${PORT}`);
  console.log(`   ACS API: ${process.env.ACS_BASE_URL}`);
  console.log(`   Login: ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}\n`);
});
