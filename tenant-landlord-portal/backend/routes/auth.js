const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

function signToken(user) {
  const raw = (process.env.JWT_EXPIRES_IN || '').trim();
  const isValid = /^[1-9]\d*[smhdwy]$/.test(raw);
  const expiresIn = isValid ? raw : '7d';
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn
  });
}

const VALID_ROLES = ['tenant', 'landlord', 'mediator', 'admin'];

// POST /api/auth/register
router.post('/register', upload.single('kyc_document'), (req, res) => {
  try {
    const { name, email, password, role, contact, address } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (User.findByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const kycDocumentPath = req.file ? `/uploads/${req.file.filename}` : null;

    const user = User.create({ name, email, password, role, contact, address, kycDocumentPath });
    const token = signToken(user);

    res.status(201).json({ token, user: User.toSafeObject(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = User.findByEmail(email);
    if (!user || !User.verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ token, user: User.toSafeObject(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
