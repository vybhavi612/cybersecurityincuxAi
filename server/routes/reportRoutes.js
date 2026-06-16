const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken, authorizeRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(authorizeRole(['admin', 'teacher']));

// GET /api/reports/defaulters - List students with attendance < 75%
router.get('/defaulters', async (req, res) => {
  try {
    // Get all students and compile attendance
    const students = await query(
      `SELECT u.id as student_id, u.name, u.email,
              COUNT(a.id) as total_sessions,
              SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_sessions,
              SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused_sessions
       FROM users u
       LEFT JOIN attendance a ON u.id = a.student_id
       WHERE u.role = 'student'
       GROUP BY u.id`
    );

    const defaulters = [];
    for (const s of students) {
      const activeSessions = s.total_sessions - s.excused_sessions;
      const pct = activeSessions > 0 ? (s.present_sessions / activeSessions) * 100 : 100.0;
      
      // If student has records and is below 75%, add to list
      if (activeSessions > 0 && pct < 75.0) {
        defaulters.push({
          student_id: s.student_id,
          name: s.name,
          email: s.email,
          total_sessions: activeSessions,
          present_sessions: s.present_sessions,
          percentage: parseFloat(pct.toFixed(1))
        });
      }
    }

    // Sort by percentage ascending
    defaulters.sort((a, b) => a.percentage - b.percentage);
    return res.status(200).json(defaulters);
  } catch (err) {
    console.error('Error compiled defaulters:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/reports/summary/class/:classId - Get class average summary per student
router.get('/summary/class/:classId', async (req, res) => {
  const classId = parseInt(req.params.classId);

  try {
    const classCheck = await query('SELECT class_name FROM classes WHERE id = ?', [classId]);
    if (classCheck.length === 0) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const roster = await query(
      `SELECT u.id as student_id, u.name, u.email,
              COUNT(a.id) as total_sessions,
              SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent,
              SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused
       FROM users u
       JOIN student_classes sc ON u.id = sc.student_id
       LEFT JOIN attendance a ON u.id = a.student_id
       WHERE sc.class_id = ? AND u.role = 'student'
       GROUP BY u.id
       ORDER BY u.name ASC`,
      [classId]
    );

    const summary = roster.map(s => {
      const active = s.total_sessions - s.excused;
      const presentAndLate = s.present + s.late;
      const pct = active > 0 ? (presentAndLate / active) * 100 : 100.0;
      return {
        ...s,
        total_sessions: active,
        present_sessions: presentAndLate,
        percentage: parseFloat(pct.toFixed(1))
      };
    });

    return res.status(200).json({
      className: classCheck[0].class_name,
      students: summary
    });
  } catch (err) {
    console.error('Error generating class report:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/reports/analytics - Dashboard overall stats (Admin)
router.get('/analytics', authorizeRole(['admin']), async (req, res) => {
  try {
    const totalStudents = await query('SELECT count(*) as count FROM users WHERE role = "student"');
    const totalTeachers = await query('SELECT count(*) as count FROM users WHERE role = "teacher"');
    const totalClasses = await query('SELECT count(*) as count FROM classes');
    
    // Average Daily Attendance rate: percentage of (Present + Late) out of (total marked - Excused)
    const stats = await query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused
       FROM attendance`
    );

    let averageDailyAttendance = 100.0;
    if (stats[0] && stats[0].total - stats[0].excused > 0) {
      averageDailyAttendance = parseFloat(
        ((stats[0].present / (stats[0].total - stats[0].excused)) * 100).toFixed(1)
      );
    }

    // Daily trends (grouped by date) - last 10 records
    const trend = await query(
      `SELECT date, 
              COUNT(*) as total,
              SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused
       FROM attendance 
       GROUP BY date 
       ORDER BY date DESC LIMIT 10`
    );

    const attendanceTrend = trend.map(t => {
      const active = t.total - t.excused;
      const rate = active > 0 ? (t.present / active) * 100 : 100.0;
      return {
        date: t.date,
        rate: parseFloat(rate.toFixed(1))
      };
    }).reverse(); // chronological order

    return res.status(200).json({
      totalStudents: totalStudents[0].count,
      totalTeachers: totalTeachers[0].count,
      totalClasses: totalClasses[0].count,
      averageDailyAttendance,
      attendanceTrend
    });
  } catch (err) {
    console.error('Error compiling analytics:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/reports/export - Download full CSV dump of attendance database
router.get('/export', async (req, res) => {
  try {
    const records = await query(
      `SELECT a.date, u.name as student_name, u.email as student_email,
              c.class_name, s.subject_code, s.subject_name, a.status,
              m.name as marked_by_name
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN student_classes sc ON u.id = sc.student_id
       LEFT JOIN classes c ON sc.class_id = c.id
       LEFT JOIN users m ON a.marked_by = m.id
       ORDER BY a.date DESC, c.class_name ASC, u.name ASC`
    );

    let csvContent = 'Date,Student Name,Student Email,Class Name,Subject Code,Subject Name,Status,Marked By\n';
    
    records.forEach(r => {
      // Escape commas in strings if any
      const studentName = `"${r.student_name.replace(/"/g, '""')}"`;
      const className = r.class_name ? `"${r.class_name.replace(/"/g, '""')}"` : '""';
      const subjectName = `"${r.subject_name.replace(/"/g, '""')}"`;
      const markedBy = r.marked_by_name ? `"${r.marked_by_name.replace(/"/g, '""')}"` : '""';
      
      csvContent += `${r.date},${studentName},${r.student_email},${className},${r.subject_code},${subjectName},${r.status},${markedBy}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error exporting CSV:', err.message);
    return res.status(500).json({ message: 'Internal server error during export.' });
  }
});

module.exports = router;
