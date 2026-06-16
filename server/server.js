const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize DB and Seed if necessary
require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// Start Express Application
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Student Attendance Portal backend server online!`);
  console.log(` Running on port: ${PORT}`);
  console.log(` Local UI dashboard: http://localhost:${PORT}`);
  console.log(`===================================================`);
});

module.exports = app; // for testing
