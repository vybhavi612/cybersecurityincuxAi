import streamlit as st
import sqlite3
import pandas as pd
import plotly.express as px

DATABASE = "database/student.db"


def home():

    st.title("🏠 Home Dashboard")

    st.success("Welcome to Student Productivity Analytics 🎓")

    conn = sqlite3.connect(DATABASE)

    students = pd.read_sql("SELECT * FROM students", conn)
    attendance = pd.read_sql("SELECT * FROM attendance", conn)

    conn.close()

    total_students = len(students)
    total_attendance = len(attendance)

    attendance_percent = 0

    if total_students > 0:
        attendance_percent = round(
            (total_attendance / total_students) * 100,
            2
        )

    productivity = 88
    achievements = 15

    c1, c2, c3, c4 = st.columns(4)

    c1.metric("👨‍🎓 Students", total_students)
    c2.metric("📅 Attendance", f"{attendance_percent}%")
    c3.metric("📈 Productivity", productivity)
    c4.metric("🏆 Achievements", achievements)

    st.divider()

    st.subheader("📈 Attendance Overview")

    if total_students > 0:

        fig = px.pie(

            values=[
                total_attendance,
                max(total_students-total_attendance, 0)
            ],

            names=[
                "Present",
                "Absent"
            ],

            title="Attendance Distribution"

        )

        st.plotly_chart(
            fig,
            use_container_width=True
        )

    st.divider()

    st.subheader("📋 Registered Students")

    if len(students) > 0:

        st.dataframe(
            students,
            use_container_width=True
        )

    else:

        st.info("No Students Registered")