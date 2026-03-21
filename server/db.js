/**
 * db.js — Simple JSON file–based user store (no native dependencies)
 *
 * Schema: { users: [{ id, username, password, role, created_at }] }
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'acs_users.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) return { users: [] };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ── Seed default admin ────────────────────────────────────────────────────────
function seedAdmin() {
  const db = readDB();
  if (db.users.length === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    db.users.push({
      id: 1,
      username,
      password: hash,
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    writeDB(db);
    console.log(`✅ Default admin created: ${username} / ${password}`);
  }
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────
let _nextId = null;
function nextId() {
  if (_nextId === null) {
    const db = readDB();
    _nextId = db.users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;
  }
  return _nextId++;
}

const Users = {
  findByUsername(username) {
    return readDB().users.find(u => u.username === username) || null;
  },

  findById(id) {
    const u = readDB().users.find(u => u.id === Number(id));
    if (!u) return null;
    const { password: _, ...safe } = u;
    return safe;
  },

  create(username, password, role = 'operator') {
    const db = readDB();
    if (db.users.find(u => u.username === username)) {
      const err = new Error('UNIQUE constraint failed: users.username');
      err.code = 'SQLITE_CONSTRAINT_UNIQUE';
      throw err;
    }
    const hash = bcrypt.hashSync(password, 10);
    const id = nextId();
    db.users.push({ id, username, password: hash, role, created_at: new Date().toISOString() });
    writeDB(db);
    return id;
  },

  list() {
    return readDB().users.map(({ password: _, ...u }) => u);
  },

  delete(id) {
    const db = readDB();
    db.users = db.users.filter(u => u.id !== Number(id));
    writeDB(db);
  },

  changePassword(id, newPassword) {
    const db = readDB();
    const u = db.users.find(u => u.id === Number(id));
    if (u) { u.password = bcrypt.hashSync(newPassword, 10); writeDB(db); }
  },
};

module.exports = { Users, seedAdmin };
