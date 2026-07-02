import streamlit as st
import sqlite3

DATABASE = "database/student.db"


def settings(user):

    st.title("⚙️ Settings")

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    st.subheader("👤 Update Profile")

    name = st.text_input("Name", value=user[1])
    email = st.text_input("Email", value=user[2])
    course = st.text_input("Course", value=user[4])
    phone = st.text_input("Phone", value=user[5])

    gender = st.selectbox(
        "Gender",
        ["Male", "Female", "Other"],
        index=["Male", "Female", "Other"].index(user[6])
    )

    if st.button("💾 Update Profile"):

        cursor.execute("""
            UPDATE students
            SET
                name=?,
                email=?,
                course=?,
                phone=?,
                gender=?
            WHERE id=?
        """, (
            name,
            email,
            course,
            phone,
            gender,
            user[0]
        ))

        conn.commit()

        st.success("✅ Profile Updated Successfully")

    st.divider()

    st.subheader("🔑 Change Password")

    old_password = st.text_input(
        "Current Password",
        type="password"
    )

    new_password = st.text_input(
        "New Password",
        type="password"
    )

    confirm = st.text_input(
        "Confirm Password",
        type="password"
    )

    if st.button("🔒 Change Password"):

        if new_password != confirm:

            st.error("Passwords do not match")

        elif len(new_password) < 6:

            st.warning("Password must contain at least 6 characters")

        else:

            cursor.execute("""
                UPDATE students
                SET password=?
                WHERE id=?
            """, (
                new_password,
                user[0]
            ))

            conn.commit()

            st.success("✅ Password Updated Successfully")

    conn.close()