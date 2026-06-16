const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.resolve(process.env.DATABASE_URL || './server/config/attendance.db');

// Ensure database directory exists
const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to SQLite Database at:', dbPath);
    initializeTables();
  }
});

// Helper for database queries
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

function initializeTables() {
  db.serialize(async () => {
    // 1. Users Table
    await run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'teacher', 'student')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Classes Table
    await run(`CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      grade_level INTEGER NOT NULL
    )`);

    // 3. Subjects Table
    await run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_code TEXT UNIQUE NOT NULL,
      subject_name TEXT NOT NULL,
      teacher_id INTEGER,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

    // 4. Student Classes (Enrollment) Table
    await run(`CREATE TABLE IF NOT EXISTS student_classes (
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      PRIMARY KEY (student_id, class_id),
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )`);

    // 5. Attendance Table
    await run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT CHECK(status IN ('Present', 'Absent', 'Late', 'Excused')) NOT NULL,
      marked_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(student_id, subject_id, date)
    )`);

    // 6. Audit Logs Table
    await run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

    console.log('Database tables verified/created successfully.');
    
    // Seed initial data if table users is empty
    const usersCount = await query('SELECT count(*) as count FROM users');
    if (usersCount[0].count === 0) {
      console.log('Seeding initial mock data into Database...');
      await seedMockData();
    }
  });
}

async function seedMockData() {
  try {
    const saltRounds = 10;
    const adminHash = bcrypt.hashSync('admin123', saltRounds);
    const teacherHash = bcrypt.hashSync('teacher123', saltRounds);
    const studentHash = bcrypt.hashSync('student123', saltRounds);

    // Seed Users
    // Admin
    const admin = await run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', 
      ['admin@portal.com', adminHash, 'Principal Skinner', 'admin']);
    
    // Teachers
    const teacher1 = await run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', 
      ['teacher@portal.com', teacherHash, 'Sarah Connor', 'teacher']);
    const teacher2 = await run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', 
      ['teacher2@portal.com', teacherHash, 'Walter White', 'teacher']);

    // Students
    const studentsData = [
      { name: 'John Doe', email: 'student@portal.com' },
      { name: 'Jane Smith', email: 'student2@portal.com' },
      { name: 'Bob Vance', email: 'student3@portal.com' },
      { name: 'Alice Green', email: 'student4@portal.com' },
      { name: 'Charlie Brown', email: 'student5@portal.com' },
      { name: 'David Miller', email: 'student6@portal.com' },
      { name: 'Emma Wilson', email: 'student7@portal.com' },
      { name: 'Frank Thomas', email: 'student8@portal.com' },
      { name: 'Grace Taylor', email: 'student9@portal.com' },
      { name: 'Henry Davis', email: 'student10@portal.com' }
    ];

    const studentIds = [];
    for (const student of studentsData) {
      const res = await run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', 
        [student.email, studentHash, student.name, 'student']);
      studentIds.push(res.id);
    }

    // Seed Classes
    const classA = await run('INSERT INTO classes (class_name, grade_level) VALUES (?, ?)', ['Grade 10-A', 10]);
    const classB = await run('INSERT INTO classes (class_name, grade_level) VALUES (?, ?)', ['Grade 11-A', 11]);

    // Enroll students in classes
    // Students 1-5 in class A, 6-10 in class B
    for (let i = 0; i < 5; i++) {
      await run('INSERT INTO student_classes (student_id, class_id) VALUES (?, ?)', [studentIds[i], classA.id]);
    }
    for (let i = 5; i < 10; i++) {
      await run('INSERT INTO student_classes (student_id, class_id) VALUES (?, ?)', [studentIds[i], classB.id]);
    }

    // Seed Subjects
    const subject1 = await run('INSERT INTO subjects (subject_code, subject_name, teacher_id) VALUES (?, ?, ?)', 
      ['CS-101', 'Intro to Programming', teacher1.id]);
    const subject2 = await run('INSERT INTO subjects (subject_code, subject_name, teacher_id) VALUES (?, ?, ?)', 
      ['MATH-202', 'Calculus II', teacher2.id]);
    const subject3 = await run('INSERT INTO subjects (subject_code, subject_name, teacher_id) VALUES (?, ?, ?)', 
      ['ENG-301', 'English Literature', teacher1.id]);

    // Seed Attendance History for the last 12 days (excluding weekends)
    // To make analytics look beautiful, let's create a realistic distribution:
    // John Doe (studentIds[0]) has a low attendance (<75% to trigger defaulter warning).
    // Others have a mix of Present, Late, Absent, Excused.
    const dates = [];
    const dateObj = new Date();
    let count = 0;
    while (count < 12) {
      dateObj.setDate(dateObj.getDate() - 1);
      const day = dateObj.getDay();
      if (day !== 0 && day !== 6) { // Exclude Sunday (0) and Saturday (6)
        const dateStr = dateObj.toISOString().split('T')[0];
        dates.push(dateStr);
        count++;
      }
    }
    // Sort dates in ascending order
    dates.reverse();

    // Loop through all subjects
    const subjects = [subject1.id, subject2.id, subject3.id];
    
    for (const d of dates) {
      for (const studentId of studentIds) {
        // Find which subjects this student takes (by class enrollment)
        // Students 1-5 are in classA, which is registered for CS-101 and ENG-301
        // Students 6-10 are in classB, registered for MATH-202
        const isClassA = studentId <= studentIds[4];
        const studentSubjects = isClassA ? [subject1.id, subject3.id] : [subject2.id];

        for (const subId of studentSubjects) {
          let status = 'Present';
          const rand = Math.random();

          if (studentId === studentIds[0]) {
            // Seed low attendance for John Doe: ~60% Present, ~40% Absent
            status = rand < 0.6 ? 'Present' : (rand < 0.7 ? 'Late' : 'Absent');
          } else if (studentId === studentIds[2]) {
            // Seed low attendance for Bob Vance (student 3): ~50%
            status = rand < 0.5 ? 'Present' : (rand < 0.9 ? 'Absent' : 'Excused');
          } else {
            // Seed normal attendance for others: ~90% Present
            status = rand < 0.85 ? 'Present' : (rand < 0.92 ? 'Late' : (rand < 0.97 ? 'Absent' : 'Excused'));
          }

          await run('INSERT OR IGNORE INTO attendance (student_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?)',
            [studentId, subId, d, status, teacher1.id]);
        }
      }
    }

    // Seed Audit Log
    await run('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)', 
      [admin.id, 'SEVER_INITIALIZATION', 'Seeded initial database tables and mock records.']);

    console.log('Database successfully seeded with users, classes, subjects, and attendance records.');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
}

module.exports = {
  db,
  query,
  run
};
