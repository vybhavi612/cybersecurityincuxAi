const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, run } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_attendance_key_12345';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/auth/reset-password (For self password reset)
router.post('/reset-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  try {
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    // Update password
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    // Log action
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'PASSWORD_RESET', 'User updated their password successfully.']);

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const users = await query('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json(users[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
