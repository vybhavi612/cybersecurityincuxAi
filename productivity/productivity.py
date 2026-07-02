import sqlite3

DATABASE = "database/student.db"


def calculate_productivity(student_id):

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM attendance
        WHERE student_id=?
        AND status='Present'
    """, (student_id,))

    present = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM attendance
        WHERE student_id=?
    """, (student_id,))

    total = cursor.fetchone()[0]

    conn.close()

    if total == 0:
        attendance_score = 0
    else:
        attendance_percentage = (present / total) * 100
        attendance_score = attendance_percentage * 0.4

    task_score = 25
    assignment_score = 20
    consistency_score = 10

    productivity = round(
        attendance_score +
        task_score +
        assignment_score +
        consistency_score,
        2
    )

    if productivity > 100:
        productivity = 100

    return productivity