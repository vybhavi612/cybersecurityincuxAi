import streamlit as st
from productivity.productivity import calculate_productivity
from attendance.attendance import attendance_percentage, total_present


def productivity_page(user):

    st.title("📈 Productivity Dashboard")

    attendance = attendance_percentage(user[0])
    productivity = calculate_productivity(user[0])
    present = total_present(user[0])

    col1, col2, col3 = st.columns(3)

    col1.metric("📅 Attendance", f"{attendance}%")
    col2.metric("📈 Productivity", f"{productivity}%")
    col3.metric("🏆 Present Days", present)

    st.divider()

    st.subheader("Productivity Progress")

    st.progress(productivity / 100)

    if productivity >= 90:
        st.success("🏆 Excellent Performance")
    elif productivity >= 75:
        st.info("👍 Good Performance")
    elif productivity >= 50:
        st.warning("⚠ Needs Improvement")
    else:
        st.error("🚨 Low Productivity")