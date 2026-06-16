const express = require('express');
const router = express.Router();
const { query, run } = require('../config/db');
const { verifyToken, authorizeRole } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/attendance/subjects - List subjects (Teachers get their own, Admins get all)
router.get('/subjects', async (req, res) => {
  try {
    let sql = 'SELECT s.*, u.name as teacher_name FROM subjects s JOIN users u ON s.teacher_id = u.id';
    const params = [];

    if (req.user.role === 'teacher') {
      sql += ' WHERE s.teacher_id = ?';
      params.push(req.user.id);
    }

    const subjects = await query(sql, params);
    return res.status(200).json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/attendance/class/:classId - Get roster for class with attendance details for a subject and date
router.get('/class/:classId', authorizeRole(['admin', 'teacher']), async (req, res) => {
  const classId = parseInt(req.params.classId);
  const { date, subjectId } = req.query;

  if (!date || !subjectId) {
    return res.status(400).json({ message: 'Date and subjectId query parameters are required.' });
  }

  try {
    // Check if class exists
    const classCheck = await query('SELECT class_name FROM classes WHERE id = ?', [classId]);
    if (classCheck.length === 0) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    // Get all students enrolled in the class and outer join the attendance for that date & subject
    const roster = await query(
      `SELECT u.id as student_id, u.name, u.email, a.id as attendance_id, a.status 
       FROM users u
       JOIN student_classes sc ON u.id = sc.student_id
       LEFT JOIN attendance a ON u.id = a.student_id AND a.subject_id = ? AND a.date = ?
       WHERE sc.class_id = ? AND u.role = 'student'
       ORDER BY u.name ASC`,
      [subjectId, date, classId]
    );

    return res.status(200).json(roster);
  } catch (err) {
    console.error('Error fetching class roster:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/attendance/mark - Record or update attendance
router.post('/mark', authorizeRole(['admin', 'teacher']), async (req, res) => {
  const { subjectId, date, records } = req.body; // records: [{ studentId, status }]

  if (!subjectId || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Missing subjectId, date, or records array.' });
  }

  // Prevent marking future attendance
  const todayStr = new Date().toISOString().split('T')[0];
  if (date > todayStr) {
    return res.status(400).json({ message: 'Cannot mark attendance for future dates.' });
  }

  try {
    const statusValues = ['Present', 'Absent', 'Late', 'Excused'];
    let successCount = 0;

    for (const r of records) {
      if (!statusValues.includes(r.status)) {
        continue; // skip invalid status values
      }

      // SQLite INSERT OR REPLACE
      await run(
        `INSERT INTO attendance (student_id, subject_id, date, status, marked_by, updated_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(student_id, subject_id, date) 
         DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, updated_at = CURRENT_TIMESTAMP`,
        [r.studentId, subjectId, date, r.status, req.user.id]
      );
      successCount++;
    }

    // Log action
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'ATTENDANCE_MARK', `Marked attendance for Subject ID ${subjectId} on ${date}. Count: ${successCount}`]);

    return res.status(200).json({ message: `Successfully saved ${successCount} attendance records.` });
  } catch (err) {
    console.error('Error saving attendance:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/attendance/bulk-upload - Parse CSV content string and insert logs
router.post('/bulk-upload', authorizeRole(['admin', 'teacher']), async (req, res) => {
  const { csvText } = req.body;

  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ message: 'Payload must contain a csvText string.' });
  }

  try {
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV file must contain a header and at least one data row.' });
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIndex = headers.indexOf('student_email');
    const codeIndex = headers.indexOf('subject_code');
    const dateIndex = headers.indexOf('date');
    const statusIndex = headers.indexOf('status');

    if (emailIndex === -1 || codeIndex === -1 || dateIndex === -1 || statusIndex === -1) {
      return res.status(400).json({ 
        message: 'CSV headers must include: student_email, subject_code, date, status' 
      });
    }

    const errors = [];
    let inserted = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) {
        errors.push(`Row ${i + 1}: Incomplete row columns.`);
        continue;
      }

      const email = cols[emailIndex];
      const code = cols[codeIndex];
      const date = cols[dateIndex];
      let status = cols[statusIndex];

      // Capitalize status correctly (e.g. present -> Present)
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

      if (!['Present', 'Absent', 'Late', 'Excused'].includes(status)) {
        errors.push(`Row ${i + 1}: Invalid status '${status}'.`);
        continue;
      }

      if (date > todayStr) {
        errors.push(`Row ${i + 1}: Date cannot be in the future.`);
        continue;
      }

      // Check student
      const students = await query('SELECT id FROM users WHERE email = ? AND role = "student"', [email.toLowerCase()]);
      if (students.length === 0) {
        errors.push(`Row ${i + 1}: Student with email '${email}' not found.`);
        continue;
      }
      const studentId = students[0].id;

      // Check subject
      const subjects = await query('SELECT id FROM subjects WHERE subject_code = ?', [code.toUpperCase()]);
      if (subjects.length === 0) {
        errors.push(`Row ${i + 1}: Subject with code '${code}' not found.`);
        continue;
      }
      const subjectId = subjects[0].id;

      // Insert record
      await run(
        `INSERT INTO attendance (student_id, subject_id, date, status, marked_by, updated_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(student_id, subject_id, date) 
         DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, updated_at = CURRENT_TIMESTAMP`,
        [studentId, subjectId, date, status, req.user.id]
      );
      inserted++;
    }

    // Log action
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'BULK_UPLOAD', `Uploaded bulk CSV. Rows processed: ${inserted}. Errors: ${errors.length}`]);

    return res.status(200).json({
      message: `Processed bulk upload. ${inserted} rows saved successfully.`,
      inserted,
      errors
    });
  } catch (err) {
    console.error('Bulk upload error:', err.message);
    return res.status(500).json({ message: 'Internal server error during CSV processing.' });
  }
});

// GET /api/attendance/student/:studentId - Get attendance analysis for student (accessible by student themselves, teacher, admin)
router.get('/student/:studentId', async (req, res) => {
  const studentId = parseInt(req.params.studentId);

  // Authorization check: students can only see their own attendance logs
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ message: 'Access denied. You can only view your own records.' });
  }

  try {
    const studentInfo = await query('SELECT name, email FROM users WHERE id = ? AND role = "student"', [studentId]);
    if (studentInfo.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Get subject by subject stats
    // Sum attendance grouped by subject
    const subjectSummaries = await query(
      `SELECT s.subject_code, s.subject_name,
              COUNT(a.id) as total,
              SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present_count,
              SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
              SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_count,
              SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused_count
       FROM subjects s
       JOIN classes c ON c.id = (
          SELECT class_id FROM student_classes WHERE student_id = ? LIMIT 1
       )
       LEFT JOIN attendance a ON s.id = a.subject_id AND a.student_id = ?
       GROUP BY s.id`,
      [studentId, studentId]
    );

    // Calculate percentage per subject
    const enrichedSummaries = subjectSummaries.map(s => {
      // Exclude Excused from total denominator or treat it as half/present. Here, we exclude Excused from calculation to be fair, or treat it as present.
      // Standard: denominator = total - excused_count. If denominator <= 0, percentage = 100
      const denominator = s.total - s.excused_count;
      const pct = denominator > 0 ? (s.present_count / denominator) * 100 : 100.0;
      return {
        ...s,
        percentage: parseFloat(pct.toFixed(1))
      };
    });

    // Calculate overall attendance percentage
    let totalClasses = 0;
    let presentClasses = 0;
    enrichedSummaries.forEach(s => {
      totalClasses += (s.total - s.excused_count);
      presentClasses += s.present_count;
    });
    const overallPercentage = totalClasses > 0 ? parseFloat(((presentClasses / totalClasses) * 100).toFixed(1)) : 100.0;

    // Get history list
    const history = await query(
      `SELECT a.date, s.subject_code, s.subject_name, a.status, u.name as marked_by_name
       FROM attendance a
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN users u ON a.marked_by = u.id
       WHERE a.student_id = ?
       ORDER BY a.date DESC, s.subject_code ASC LIMIT 100`,
      [studentId]
    );

    return res.status(200).json({
      student: studentInfo[0],
      overallPercentage,
      subjectSummaries: enrichedSummaries,
      history
    });
  } catch (err) {
    console.error('Error fetching student report:', err.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
