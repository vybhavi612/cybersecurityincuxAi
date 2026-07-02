import streamlit as st
from authentication.register import register_student


def register_page():

    st.title("📝 Student Registration")

    name = st.text_input("Full Name")
    email = st.text_input("Email")
    password = st.text_input("Password", type="password")
    course = st.text_input("Course")
    phone = st.text_input("Phone")

    gender = st.selectbox(
        "Gender",
        [
            "Male",
            "Female",
            "Other"
        ]
    )

    if st.button("Register"):

        success = register_student(
            name,
            email,
            password,
            course,
            phone,
            gender
        )

        if success:

            st.success("Registration Successful")

        else:

            st.error("Email already exists")