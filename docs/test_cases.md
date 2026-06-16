# Test Cases

This document describes the unit and integration test scenarios designed to verify security, data validation, calculation correctness, and role permissions.

---

## 1. Authentication & Security Test Cases

| Test Case ID | Component | Description | Inputs | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Login | Valid credential submission | `email: "admin@portal.com"`, `password: "admin123"` | `200 OK`, response contains valid JWT token and role user metadata. | Ready |
| **TC-AUTH-02** | Login | Invalid credentials submission | `email: "admin@portal.com"`, `password: "wrongpass"` | `401 Unauthorized`, descriptive error message, token is null. | Ready |
| **TC-AUTH-03** | Auth Middleware | Access route with no token | Request `GET /api/reports/analytics` | `401 Unauthorized`, response states 'Access denied. No token provided.' | Ready |
| **TC-AUTH-04** | Role Guard | Access teacher route as student | JWT for `role: "student"` on `POST /api/attendance/mark` | `403 Forbidden`, response states 'Access denied. Required role not found.' | Ready |

---

## 2. Attendance Management Test Cases

| Test Case ID | Component | Description | Inputs | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ATT-01** | Attendance Mark | Save valid class attendance record | Class: 1, Subject: 1, Date: today, students list with `Present`/`Absent` status | `200 OK`, database updated. Re-querying the endpoint returns marked records. | Ready |
| **TC-ATT-02** | Attendance Mark | Invalid status payload validation | Class: 1, Subject: 1, Status: `"Skipped"` (invalid status value) | `400 Bad Request`, validation error lists allowed values (`Present`, `Absent`, `Late`, `Excused`). | Ready |
| **TC-ATT-03** | Attendance Mark | Save future date attendance check | Date: `2099-01-01` (future date) | `400 Bad Request`, validation message stating attendance cannot be marked for future dates. | Ready |
| **TC-ATT-04** | Bulk Upload | Upload valid formatted CSV file | CSV string with columns: `student_email`, `subject_code`, `date`, `status` | `200 OK`, parses details and returns `inserted: X` matching the row count. | Ready |
| **TC-ATT-05** | Bulk Upload | Upload missing headers CSV | CSV with columns: `name`, `status` (missing `student_email` & `date`) | `400 Bad Request`, parser error message detailizing missing columns. | Ready |

---

## 3. Reporting & Analytics Test Cases

| Test Case ID | Component | Description | Inputs | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-REP-01** | Defaulters List | Retrieve students under 75% attendance threshold | DB query trigger | Returns only students with calculated percentage strictly less than 75.0%. | Ready |
| **TC-REP-02** | Percentage | Rounding and calculations check | Student has 3 present, 1 absent logs | Calculated percentage must equal `75.0` (3/4). | Ready |
| **TC-REP-03** | Empty History | Student with zero total classes check | Student with no assigned class or logs | Calculated percentage equals `100.0` or `0.0` safely handled without dividing by zero. | Ready |
