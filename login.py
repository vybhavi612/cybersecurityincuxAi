import streamlit as st
from authentication.auth import login_user


def login():

    st.title("🛡 Cyber Shield Login")

    username = st.text_input(
        "👤 Username",
        key="login_username"
    )

    password = st.text_input(
        "🔒 Password",
        type="password",
        key="login_password"
    )

    remember = st.checkbox(
        "Remember Me",
        key="login_remember"
    )

    if st.button(
        "🔓 Login",
        use_container_width=True,
        key="login_button"
    ):

        user = login_user(username, password)

        if user:

            st.session_state.logged_in = True
            st.session_state.username = username

            st.success("Login Successful")

            st.rerun()

        else:

            st.error("Invalid Username or Password")