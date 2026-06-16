const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, run } = require('../config/db');
const { verifyToken, authorizeRole } = require('../middleware/auth');

// Apply admin guard to all routes in this file
router.use(verifyToken);
router.use(authorizeRole(['admin']));

// GET /api/users - List users (supports ?role=teacher or ?role=student filter)
router.get('/', async (req, res) => {
  const { role } = req.query;
  let sql = 'SELECT id, email, name, role, created_at FROM users';
  const params = [];

  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }

  sql += ' ORDER BY name ASC';

  try {
    const users = await query(sql, params);
    
    // For students, fetch their classes as well
    if (role === 'student' || !role) {
      const enrichUsers = [];
      for (const u of users) {
        if (u.role === 'student') {
          const classes = await query(
            `SELECT c.id, c.class_name FROM classes c 
             JOIN student_classes sc ON c.id = sc.class_id 
             WHERE sc.student_id = ?`, [u.id]
          );
          enrichUsers.push({ ...u, classes });
        } else {
          enrichUsers.push(u);
        }
      }
      return res.status(200).json(enrichUsers);
    }

    return res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/classes - List all classes
router.get('/classes', async (req, res) => {
  try {
    const classes = await query('SELECT * FROM classes ORDER BY grade_level ASC, class_name ASC');
    return res.status(200).json(classes);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/users - Add a new user
router.post('/', async (req, res) => {
  const { email, password, name, role, classId } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: 'All fields (email, password, name, role) are required.' });
  }

  if (!['admin', 'teacher', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role assignment.' });
  }

  try {
    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email address is already registered.' });
    }

    // Encrypt password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const insertRes = await run(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email.toLowerCase().trim(), passwordHash, name.trim(), role]
    );
    const newUserId = insertRes.id;

    // Enroll in class if it is a student and classId is provided
    if (role === 'student' && classId) {
      await run('INSERT INTO student_classes (student_id, class_id) VALUES (?, ?)', [newUserId, classId]);
    }

    // Log action
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'USER_CREATE', `Created user ${email} with role ${role}.`]);

    return res.status(201).json({
      message: 'User created successfully.',
      userId: newUserId
    });
  } catch (err) {
    console.error('Error creating user:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/users/:id - Remove a user
router.delete('/:id', async (req, res) => {
  const targetId = parseInt(req.params.id);

  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account.' });
  }

  try {
    const users = await query('SELECT email, role FROM users WHERE id = ?', [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    await run('DELETE FROM users WHERE id = ?', [targetId]);

    // Log action
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'USER_DELETE', `Deleted user ${user.email} (${user.role}).`]);

    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/audit-logs - View system logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await query(
      `SELECT al.*, u.name as operator_name, u.email as operator_email 
       FROM audit_logs al 
       LEFT JOIN users u ON al.user_id = u.id 
       ORDER BY al.timestamp DESC LIMIT 100`
    );
    return res.status(200).json(logs);
  } catch (err) {
    console.error('Error fetching audit logs:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
