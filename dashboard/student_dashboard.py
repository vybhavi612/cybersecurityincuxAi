import streamlit as st
import pandas as pd
import plotly.express as px

from productivity.productivity import calculate_productivity
from achievements.achievement import get_achievements

from attendance.attendance import (
    mark_attendance,
    attendance_history,
    attendance_percentage,
    total_present
)


def student_dashboard():

    user = st.session_state.user

    attendance = attendance_percentage(user[0])

    present = total_present(user[0])

    productivity = calculate_productivity(user[0])

    streak = 12

    badges = get_achievements(
        user[0],
        attendance,
        productivity
    )

    st.title("🎓 Student Dashboard")

    st.success(f"Welcome {user[1]} 👋")

    st.sidebar.title("👨‍🎓 Student Menu")

    menu = st.sidebar.radio(

        "Select Page",

        [

            "🏠 Dashboard",

            "📅 Attendance",

            "📊 Analytics",

            "🏆 Achievements",

            "👤 Profile",

            "🚪 Logout"

        ]

    )

    if menu == "🚪 Logout":

        st.session_state.logged_in = False

        st.session_state.user = None

        st.rerun()

    # =====================================================
    # Dashboard
    # =====================================================

    elif menu == "🏠 Dashboard":

        c1, c2, c3, c4 = st.columns(4)

        c1.metric(

            "📅 Attendance",

            f"{attendance}%"

        )

        c2.metric(

            "📈 Productivity",

            f"{productivity}%"

        )

        c3.metric(

            "🔥 Current Streak",

            streak

        )

        c4.metric(

            "🏆 Badges",

            len(badges)

        )

        st.divider()

        st.subheader("📈 Weekly Attendance")

        days = [

            "Mon",

            "Tue",

            "Wed",

            "Thu",

            "Fri",

            "Sat"

        ]

        values = [

            82,

            90,

            95,

            88,

            100,

            attendance

        ]

        fig = px.line(

            x=days,

            y=values,

            markers=True,

            title="Weekly Attendance"

        )

        st.plotly_chart(

            fig,

            use_container_width=True

        )

        st.divider()

        st.subheader("📋 Recent Attendance")

        history = attendance_history(user[0])

        if history:

            df = pd.DataFrame(

                history,

                columns=[

                    "Date",

                    "Login",

                    "Logout",

                    "Duration",

                    "Status",

                    "IP",

                    "Device",

                    "Operating System",

                    "Host"

                ]

            )

            st.dataframe(

                df,

                use_container_width=True

            )

        else:

            st.info("No Attendance History Found")

    # =====================================================
    # Attendance
    # =====================================================

    elif menu == "📅 Attendance":

        st.subheader("📅 Attendance Management")

        col1, col2 = st.columns(2)

        with col1:

            if st.button("✅ Mark Attendance"):

                status = mark_attendance(user[0])

                if status:

                    st.success("Attendance Marked Successfully")

                    st.balloons()

                    st.rerun()

                else:

                    st.warning("Attendance Already Marked Today")

        st.divider()

        history = attendance_history(user[0])

        if history:

            df = pd.DataFrame(

                history,

                columns=[

                    "Date",

                    "Login",

                    "Logout",

                    "Duration",

                    "Status",

                    "IP",

                    "Device",

                    "Operating System",

                    "Host"

                ]

            )

            st.dataframe(

                df,

                use_container_width=True

            )

        else:

            st.info("No Attendance Found")
    # =====================================================
    # Analytics
    # =====================================================

    elif menu == "📊 Analytics":

        st.subheader("📊 Student Analytics")

        col1, col2 = st.columns(2)

        with col1:

            fig1 = px.pie(
                values=[attendance, 100 - attendance],
                names=["Present", "Absent"],
                title="Attendance Percentage"
            )

            st.plotly_chart(fig1, use_container_width=True)

        with col2:

            fig2 = px.bar(
                x=["Attendance", "Productivity"],
                y=[attendance, productivity],
                color=["Attendance", "Productivity"],
                title="Performance Comparison"
            )

            st.plotly_chart(fig2, use_container_width=True)

        st.divider()

        st.subheader("📈 Productivity Score")

        st.progress(productivity / 100)

        st.metric(
            "Current Productivity",
            f"{productivity}%"
        )

        if productivity >= 90:
            st.success("🏆 Outstanding Performance")

        elif productivity >= 80:
            st.success("⭐ Excellent Performer")

        elif productivity >= 70:
            st.info("👍 Good Performance")

        elif productivity >= 50:
            st.warning("⚠ Needs Improvement")

        else:
            st.error("🚨 At Risk Student")

    # =====================================================
    # Achievements
    # =====================================================

    elif menu == "🏆 Achievements":

        st.subheader("🏆 Achievement Badges")

        if badges:

            cols = st.columns(2)

            for i, badge in enumerate(badges):

                with cols[i % 2]:
                    st.success(badge)

        else:

            st.info("No achievements yet.")

        st.divider()

        st.subheader("🎯 Progress")

        st.progress(min(productivity / 100, 1.0))

        st.metric(
            "Total Badges",
            len(badges)
        )

    # =====================================================
    # Profile
    # =====================================================

    elif menu == "👤 Profile":

        st.subheader("👤 Student Profile")

        left, right = st.columns([1, 2])

        with left:

            st.image(
                "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
                width=180
            )

        with right:

            st.write(f"### 👋 Welcome {user[1]}")

            st.write(f"**📧 Email:** {user[2]}")
            st.write(f"**📚 Course:** {user[4]}")
            st.write(f"**📱 Phone:** {user[5]}")
            st.write(f"**👥 Gender:** {user[6]}")

            st.write("---")

            c1, c2 = st.columns(2)

            with c1:
                st.metric(
                    "Attendance",
                    f"{attendance}%"
                )

                st.metric(
                    "Present Days",
                    present
                )

            with c2:
                st.metric(
                    "Productivity",
                    f"{productivity}%"
                )

                st.metric(
                    "Current Streak",
                    streak
                )

        st.divider()

        st.info(
            "🎓 Keep learning consistently to improve your productivity score and unlock more achievement badges."
        )