const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { load, save } = require('./db');

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const SALT_ROUNDS = 12;

function createToken(payload, expiresInSeconds = 604800) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

async function register(email, password) {
  if (!email || !password) throw new Error('Email and password required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format');

  const db = load();
  const normalizedEmail = email.toLowerCase();

  if (db.users.find(u => u.email === normalizedEmail)) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = { id: db.nextUserId++, email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() };
  db.users.push(user);
  save(db);

  const token = createToken({ userId: user.id, email: user.email });
  return { token, userId: user.id };
}

async function login(email, password) {
  if (!email || !password) throw new Error('Email and password required');

  const db = load();
  const user = db.users.find(u => u.email === email.toLowerCase());
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const token = createToken({ userId: user.id, email: user.email });
  return { token, userId: user.id };
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = payload.userId;
  req.userEmail = payload.email;
  next();
}

module.exports = { register, login, authenticate };
