# API Endpoints Documentation

All requests should be sent to the base URL `http://localhost:5000/api`. 
Standard headers required for protected routes:
- `Content-Type: application/json`
- `Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Routes

### Login
- **URL**: `/auth/login`
- **Method**: `POST`
- **Body Parameters**:
  ```json
  {
    "email": "teacher@portal.com",
    "password": "teacher123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "email": "teacher@portal.com",
      "name": "Sarah Connor",
      "role": "teacher"
    }
  }
  ```

### Current User Profile
- **URL**: `/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "id": 2,
    "email": "teacher@portal.com",
    "name": "Sarah Connor",
    "role": "teacher"
  }
  ```

---

## 2. User Administration (Admin Only)

### List Users
- **URL**: `/users`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    { "id": 1, "email": "admin@portal.com", "name": "Admin Principal", "role": "admin" },
    { "id": 2, "email": "teacher@portal.com", "name": "Sarah Connor", "role": "teacher" },
    { "id": 3, "email": "student@portal.com", "name": "John Doe", "role": "student" }
  ]
  ```

### Create User
- **URL**: `/users`
- **Method**: `POST`
- **Body Parameters**:
  ```json
  {
    "email": "new_student@portal.com",
    "password": "student123",
    "name": "Alice Smith",
    "role": "student",
    "class_id": 1
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "User created successfully",
    "userId": 4
  }
  ```

### Delete User
- **URL**: `/users/:id`
- **Method**: `DELETE`
- **Response (200 OK)**:
  ```json
  { "message": "User deleted successfully" }
  ```

---

## 3. Attendance Management (Teacher/Admin)

### Get Class Roster with Attendance for Date
- **URL**: `/attendance/class/:classId?date=2026-06-15&subjectId=1`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "student_id": 3,
      "name": "John Doe",
      "email": "student@portal.com",
      "attendance_id": 12,
      "status": "Present"
    },
    {
      "student_id": 5,
      "name": "Bob Vance",
      "email": "bob@portal.com",
      "attendance_id": null,
      "status": null
    }
  ]
  ```

### Save/Update Daily Attendance
- **URL**: `/attendance/mark`
- **Method**: `POST`
- **Body Parameters**:
  ```json
  {
    "subjectId": 1,
    "date": "2026-06-15",
    "records": [
      { "studentId": 3, "status": "Present" },
      { "studentId": 5, "status": "Absent" }
    ]
  }
  ```
- **Response (200 OK)**:
  ```json
  { "message": "Attendance marked successfully" }
  ```

### Bulk CSV Upload
- **URL**: `/attendance/bulk-upload`
- **Method**: `POST`
- **Body (Multipart Form-Data)**: `file` (CSV file with header rows)
- **Response (200 OK)**:
  ```json
  {
    "message": "Bulk upload complete",
    "inserted": 25,
    "errors": []
  }
  ```

---

## 4. Reports & Dashboards

### Get Defaulters (Below 75%)
- **URL**: `/reports/defaulters`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "student_id": 3,
      "name": "John Doe",
      "email": "student@portal.com",
      "total_sessions": 20,
      "present_sessions": 14,
      "percentage": 70.0
    }
  ]
  ```

### Get Overall Dashboard Stats
- **URL**: `/reports/analytics`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "totalStudents": 150,
    "totalTeachers": 12,
    "totalClasses": 8,
    "averageDailyAttendance": 88.5,
    "attendanceTrend": [
      { "date": "2026-06-10", "rate": 91.2 },
      { "date": "2026-06-11", "rate": 89.5 },
      { "date": "2026-06-12", "rate": 88.0 },
      { "date": "2026-06-15", "rate": 92.4 }
    ]
  }
  ```

### Get Student Attendance Summary (Student view)
- **URL**: `/attendance/student/:studentId`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "overallPercentage": 82.5,
    "subjectSummaries": [
      {
        "subject_code": "CS-101",
        "subject_name": "Intro to Programming",
        "total": 10,
        "present": 9,
        "percentage": 90.0
      },
      {
        "subject_code": "MATH-202",
        "subject_name": "Calculus II",
        "total": 10,
        "present": 7,
        "percentage": 70.0
      }
    ],
    "history": [
      { "date": "2026-06-15", "subject_name": "Intro to Programming", "status": "Present" },
      { "date": "2026-06-15", "subject_name": "Calculus II", "status": "Absent" }
    ]
  }
  ```
