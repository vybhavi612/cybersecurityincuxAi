import streamlit as st
import sqlite3
import pandas as pd
from datetime import datetime
import plotly.express as px

st.set_page_config(
    page_title="Student Attendance Management System",
    page_icon="🎓",
    layout="wide"
)

# Database Connection

conn = sqlite3.connect(
    "attendance.db",
    check_same_thread=False
)

cursor = conn.cursor()

# Student Table

cursor.execute("""
CREATE TABLE IF NOT EXISTS students(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    usn TEXT,
    course TEXT,
    semester TEXT,
    email TEXT,
    phone TEXT,
    password TEXT
)
""")

conn.commit()

cursor.execute("""
CREATE TABLE IF NOT EXISTS students(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    usn TEXT,
    course TEXT,
    semester TEXT,
    email TEXT,
    phone TEXT,
    password TEXT
)
""")

conn.commit()

# Attendance Table

cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance(
    attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    login_time TEXT,
    date TEXT,
    status TEXT
)
""")

conn.commit()

# Progress Table

cursor.execute("""
CREATE TABLE IF NOT EXISTS progress(
    progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    assignments_submitted INTEGER,
    projects_uploaded INTEGER,
    login_count INTEGER
)
""")

conn.commit()

# Submission Table

cursor.execute("""
CREATE TABLE IF NOT EXISTS submissions(
    submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    assignment_name TEXT,
    project_name TEXT,
    submission_date TEXT
)
""")

conn.commit()

# Logo

st.image(
    "incuxai_logo.jpg",
    width=200
)

# Title

st.title(
    "🎓 Student Attendance Management System"
)

# Sidebar

menu = st.sidebar.radio(
    "Select Menu",
    [
        "🏠 Dashboard",
        "👨‍🎓 Register Student",
        "🔐 Student Login",
        "👥 View Students",
        "🔍 Search Student",
        "✏️ Edit Student",
        "🗑️ Delete Student",
        "📅 Attendance Report",
        "📝 Assignment Submission",
        "💻 Project Submission",
        "📂 Submission Report",
        "✅ Mark Attendance",
        "📊 Attendance Percentage",
        "📸 Student Photo Upload",
        "🖼️ View Student Photo",
        "⬇️ Download Reports",
        "QR Attendance"
    ]
)

# Dashboard
if menu == "🏠 Dashboard":

    cursor.execute(
        "SELECT COUNT(*) FROM students"
    )

    total_students = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM attendance"
    )

    attendance_count = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM progress"
    )

    progress_count = cursor.fetchone()[0]

    col1, col2, col3 = st.columns(3)

    col1.metric(
        "Total Students",
        total_students
    )

    col2.metric(
        "Attendance",
        attendance_count
    )

    col3.metric(
        "Progress Records",
        progress_count
    )

    st.success(
        "Welcome to Student Attendance Management System"
    )

    # Dashboard Chart

    st.subheader(
        "🏠 Dashboard Analytics"
    )

    chart_data = pd.DataFrame(
        {
            "Category": [
                "Students",
                "Attendance",
                "Progress"
            ],
            "Count": [
                total_students,
                attendance_count,
                progress_count
            ]
        }
    )

    fig = px.bar(
        chart_data,
        x="Category",
        y="Count",
        title="System Overview"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )

# ---------------- REGISTER STUDENT ---------------- #


elif menu == "👨‍🎓 Register Student":

    st.header(
        "👨‍🎓 Register Student"
    )

    name = st.text_input("Name")

    usn = st.text_input("USN")

    course = st.text_input("Course")

    semester = st.text_input("Semester")

    email = st.text_input("Email")

    phone = st.text_input("Phone")

    password = st.text_input(
        "Password",
        type="password"
    )

    if st.button("Register Student"):

        if (
            name.strip() == "" or
            usn.strip() == "" or
            course.strip() == "" or
            semester.strip() == "" or
            email.strip() == "" or
            phone.strip() == "" or
            password.strip() == ""
        ):

            st.error(
                "❌ Please fill all fields before registration"
            )

        elif len(phone) != 10:

            st.error(
                "❌ Phone number must contain 10 digits"
            )

        elif "@" not in email:

            st.error(
                "❌ Enter a valid email address"
            )

        else:

            cursor.execute(
                """
                INSERT INTO students
                (
                    name,
                    usn,
                    course,
                    semester,
                    email,
                    phone,
                    password
                )
                VALUES(?,?,?,?,?,?,?)
                """,
                (
                    name,
                    usn,
                    course,
                    semester,
                    email,
                    phone,
                    password
                )
            )

            conn.commit()

            st.success(
                "✅ Student Registered Successfully"
            )

# ---------------- STUDENT LOGIN ---------------- #

elif menu == "🔐 Student Login":

    st.header("🔐 Student Login")

    usn = st.text_input("USN")

    password = st.text_input(
        "Password",
        type="password"
    )

    cursor.execute(
        """
        SELECT * FROM students
        WHERE usn=? AND password=?
        """,
        (usn, password)
    )

    student = cursor.fetchone()

    if student:

        st.success(
            f"Welcome {student[1]}"
        )

        status = st.selectbox(
            "Attendance Status",
            ["Present", "Absent"]
        )

        if st.button("Submit Attendance"):

            login_time = datetime.now().strftime(
                "%H:%M:%S"
            )

            today = datetime.now().strftime(
                "%Y-%m-%d"
            )

            cursor.execute(
                """
                INSERT INTO attendance
                (
                    student_id,
                    login_time,
                    date,
                    status
                )
                VALUES(?,?,?,?)
                """,
                (
                    student[0],
                    login_time,
                    today,
                    status
                )
            )

            conn.commit()

            st.success(
                f"Attendance Marked as {status}"
            )

    elif usn != "" and password != "":

        st.error(
            "Invalid Login"
        )


# ---------------- VIEW STUDENTS ---------------- #

elif menu == "👥 View Students":

    st.header("👥 View Students")

    data = pd.read_sql_query(
        "SELECT * FROM students",
        conn
    )

    st.dataframe(
        data,
        use_container_width=True
    )

# ---------------- SEARCH STUDENT ---------------- #

elif menu == "🔍 Search Student":

    st.header("🔍 Search Student")

    search_usn = st.text_input(
        "Enter USN"
    )

    if st.button("Search"):

        cursor.execute(
            """
            SELECT * FROM students
            WHERE usn=?
            """,
            (search_usn,)
        )

        student = cursor.fetchone()

        if student:

            st.success(
                f"Student Found: {student[1]}"
            )

            st.write(
                f"Course: {student[3]}"
            )

            st.write(
                f"Semester: {student[4]}"
            )

            st.write(
                f"Email: {student[5]}"
            )

        else:

            st.error(
                "Student Not Found"
            )

# ---------------- EDIT STUDENT ---------------- #

elif menu == "✏️ Edit Student":

    st.header("✏️ Edit Student")

    edit_usn = st.text_input(
        "Enter USN"
    )

    cursor.execute(
        "SELECT * FROM students WHERE usn=?",
        (edit_usn,)
    )

    student = cursor.fetchone()

    if student:

        name = st.text_input(
            "Name",
            value=student[1]
        )

        course = st.text_input(
            "Course",
            value=student[3]
        )

        semester = st.text_input(
            "Semester",
            value=student[4]
        )

        email = st.text_input(
            "Email",
            value=student[5]
        )

        phone = st.text_input(
            "Phone",
            value=student[6]
        )

        if st.button("Update Student"):

            cursor.execute(
                """
                UPDATE students
                SET
                name=?,
                course=?,
                semester=?,
                email=?,
                phone=?
                WHERE usn=?
                """,
                (
                    name,
                    course,
                    semester,
                    email,
                    phone,
                    edit_usn
                )
            )

            conn.commit()

            st.success(
                "Student Updated Successfully"
            )



# ---------------- DELETE STUDENT ---------------- #

elif menu == "🗑️ Delete Student":

    st.header("🗑️ Delete Student")

    delete_usn = st.text_input(
        "Enter USN to Delete"
    )

    if st.button("Delete Student"):

        cursor.execute(
            """
            DELETE FROM students
            WHERE usn=?
            """,
            (delete_usn,)
        )

        conn.commit()

        st.success(
            "Student Deleted Successfully"
        )

# ---------------- ATTENDANCE REPORT ---------------- #

elif menu == "📅 Attendance Report":

    st.header("📅 Attendance Report")

    attendance_data = pd.read_sql_query(
        """
        SELECT *
        FROM attendance
        """,
        conn
    )

    st.dataframe(
        attendance_data,
        use_container_width=True
    )
# ---------------- ASSIGNMENT SUBMISSION ---------------- #

elif menu == "📝 Assignment Submission":

    st.header("📝 Assignment Submission")

    usn = st.text_input(
        "Enter Student USN"
    )

    assignment_name = st.text_input(
        "Assignment Name"
    )

    uploaded_file = st.file_uploader(
        "Upload Assignment File",
        type=["pdf", "docx", "pptx", "zip"]
    )

    if st.button("Submit Assignment"):

        cursor.execute(
            """
            SELECT id
            FROM students
            WHERE usn=?
            """,
            (usn,)
        )

        student = cursor.fetchone()

        if student:

            if uploaded_file is not None:

                with open(
                    uploaded_file.name,
                    "wb"
                ) as f:

                    f.write(
                        uploaded_file.getbuffer()
                    )

            cursor.execute(
                """
                INSERT INTO submissions
                (
                    student_id,
                    assignment_name,
                    project_name,
                    submission_date
                )
                VALUES(?,?,?,?)
                """,
                (
                    student[0],
                    assignment_name,
                    "",
                    datetime.now().strftime("%Y-%m-%d")
                )
            )

            conn.commit()

            st.success(
                "Assignment Submitted Successfully"
            )

        else:

            st.error(
                "Student Not Found"
            )
# ---------------- PROJECT SUBMISSION ---------------- #

elif menu == "💻 Project Submission":

    st.header("💻 Project Submission")

    usn = st.text_input(
        "Enter Student USN"
    )

    project_name = st.text_input(
        "Project Name"
    )

    uploaded_file = st.file_uploader(
        "Upload Project File",
        type=["pdf","docx","pptx","zip"]
    )

    if st.button("Submit Project"):

        cursor.execute(
            """
            SELECT id
            FROM students
            WHERE usn=?
            """,
            (usn,)
        )

        student = cursor.fetchone()

        if student:

            cursor.execute(
                """
                INSERT INTO submissions
                (
                    student_id,
                    assignment_name,
                    project_name,
                    submission_date
                )
                VALUES(?,?,?,?)
                """,
                (
                    student[0],
                    "",
                    project_name,
                    datetime.now().strftime("%Y-%m-%d")
                )
            )

            conn.commit()

            st.success(
                "Project Submitted Successfully"
            )

        else:

            st.error(
                "Student Not Found"
            )

# ---------------- SUBMISSION REPORT ---------------- #

elif menu == "📂 Submission Report":

    st.header("📂 Submission Report")

    data = pd.read_sql_query(
        "SELECT * FROM submissions",
        conn
    )

    st.dataframe(
        data,
        use_container_width=True
    )


# ---------------- MARK ATTENDANCE ---------------- #

elif menu == "✅ Mark Attendance":

    st.header("✅ Mark Attendance")

    usn = st.text_input(
        "Enter Student USN"
    )

    status = st.radio(
        "Attendance Status",
        ["Present", "Absent"]
    )

    if st.button("Save Attendance"):

        cursor.execute(
            """
            SELECT id
            FROM students
            WHERE usn=?
            """,
            (usn,)
        )

        student = cursor.fetchone()

        if student:

            cursor.execute(
                """
                INSERT INTO attendance
                (
                    student_id,
                    login_time,
                    date,
                    status
                )
                VALUES(?,?,?,?)
                """,
                (
                    student[0],
                    datetime.now().strftime("%H:%M:%S"),
                    datetime.now().strftime("%Y-%m-%d"),
                    status
                )
            )

            conn.commit()

            st.success(
                f"{status} marked successfully"
            )

        else:

            st.error(
                "Student Not Found"
            )
# ---------------- ATTENDANCE PERCENTAGE ---------------- #



elif menu == "📊 Attendance Percentage":

    st.header("📊 Attendance Percentage")

    cursor.execute(
        "SELECT COUNT(*) FROM attendance"
    )

    total_records = cursor.fetchone()[0]

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM attendance
        WHERE status='Present'
        """
    )

    present_records = cursor.fetchone()[0]

    absent_records = total_records - present_records

    if total_records > 0:

        percentage = (
            present_records /
            total_records
        ) * 100

    else:

        percentage = 0

    st.metric(
        "Attendance Percentage",
        f"{percentage:.2f}%"
    )

    chart_data = pd.DataFrame(
        {
            "Status": [
                "Present",
                "Absent"
            ],
            "Count": [
                present_records,
                absent_records
            ]
        }
    )

    fig = px.pie(
        chart_data,
        names="Status",
        values="Count",
        title="Attendance Distribution"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


# ---------------- STUDENT PHOTO UPLOAD ---------------- #

elif menu == "📸 Student Photo Upload":

    st.header("📸 Student Photo Upload")

    student_name = st.text_input(
        "Enter Student Name"
    )

    uploaded_file = st.file_uploader(
        "Choose Student Photo",
        type=["jpg", "jpeg", "png"]
    )

    if uploaded_file is not None:

        st.image(
            uploaded_file,
            caption="Preview",
            width=250
        )

        if st.button("Save Photo"):

            with open(
                "student_photo.jpg",
                "wb"
            ) as f:

                f.write(
                    uploaded_file.getbuffer()
                )

            st.success(
                f"Photo saved successfully for {student_name}"
            )

# ---------------- VIEW STUDENT PROFILE ---------------- #

elif menu == "🖼️ View Student Photo":

    st.header("🖼️ View Student Photo")

    usn = st.text_input(
        "Enter Student USN"
    )

    if st.button("Show Profile"):

        cursor.execute(
            """
            SELECT *
            FROM students
            WHERE usn=?
            """,
            (usn,)
        )

        student = cursor.fetchone()

        if student:

            col1, col2 = st.columns([1, 2])

            with col1:

                st.image(
                    "student_photo.jpg",
                    width=250
                )

            with col2:

                st.subheader(student[1])

                st.write(
                    f"USN : {student[2]}"
                )

                st.write(
                    f"Course : {student[3]}"
                )

                st.write(
                    f"Semester : {student[4]}"
                )

                st.write(
                    f"Email : {student[5]}"
                )

                st.write(
                    f"Phone : {student[6]}"
                )

        else:

            st.error(
                "Student Not Found"
            )

# ---------------- DOWNLOAD REPORTS ---------------- #

elif menu == "⬇️ Download Reports":

    st.header("⬇️ Download Reports")

    data = pd.read_sql_query(
        "SELECT * FROM students",
        conn
    )

    st.dataframe(
        data,
        use_container_width=True
    )

    csv = data.to_csv(
        index=False
    ).encode("utf-8")

    st.download_button(
        "Download CSV",
        csv,
        "students_report.csv",
        "text/csv"
    )
# ---------------- QR ATTENDANCE ---------------- #

elif menu == "QR Attendance":

    st.header("QR Attendance System")

    import qrcode

    attendance_type = st.radio(
        "Select QR Type",
        ["Present", "Absent"]
    )

    if st.button("Generate QR"):

        qr = qrcode.make(attendance_type)

        qr.save("attendance_qr.png")

        st.image(
            "attendance_qr.png",
            caption=f"{attendance_type} QR Code",
            width=300
        )

        st.success(
            f"{attendance_type} QR Code Generated"
        )

