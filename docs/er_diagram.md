# Entity Relationship Diagram (ERD)

This document shows the database schema layout and entity relationships for the Student Attendance Portal.

## Mermaid Relational Schema Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string email UNIQUE
        string password_hash
        string name
        string role "admin / teacher / student"
        datetime created_at
    }

    CLASSES {
        int id PK
        string class_name "e.g., Grade 10-A, BSCS-4B"
        int grade_level
    }

    SUBJECTS {
        int id PK
        string subject_code UNIQUE "e.g., CS-101"
        string subject_name
        int teacher_id FK
    }

    STUDENT_CLASSES {
        int student_id FK
        int class_id FK
    }

    ATTENDANCE {
        int id PK
        int student_id FK
        int subject_id FK
        date date
        string status "Present / Absent / Late / Excused"
        int marked_by FK
        datetime created_at
        datetime updated_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        datetime timestamp
        string details
    }

    %% Relationships
    USERS ||--o{ SUBJECTS : "teaches (as Teacher)"
    USERS ||--o{ STUDENT_CLASSES : "enrolled_in (as Student)"
    CLASSES ||--o{ STUDENT_CLASSES : "has_students"
    
    USERS ||--o{ ATTENDANCE : "has_attendance_records"
    SUBJECTS ||--o{ ATTENDANCE : "logged_for"
    USERS ||--o{ ATTENDANCE : "marked_by (as Teacher)"
    
    USERS ||--o{ AUDIT_LOGS : "performed_action"
```

## Schema Explanations

1. **USERS**: Holds account details for all users (Administrators, Teachers, and Students). The `role` column determines the access level and which dashboard is displayed.
2. **CLASSES**: Represents a grade or group of students (e.g., "Grade 12-B").
3. **SUBJECTS**: Course modules (e.g., "Intro to Programming"). Each subject is linked to a single Teacher.
4. **STUDENT_CLASSES**: Junction table resolving the many-to-many relationship between Students and Classes. A student can take multiple classes/subjects, and a class has multiple students.
5. **ATTENDANCE**: The core transaction ledger. Tracks daily status (`Present`, `Absent`, `Late`, `Excused`) for a given `student_id` in a specific `subject_id` on a specific `date`.
6. **AUDIT_LOGS**: Tracks administrative events (e.g., user creation, attendance alteration) for compliance and integrity checks.
