import streamlit as st
import re
from authentication.auth import register_user, user_exists


def password_strength(password):

    if len(password) < 8:
        return False

    if not re.search(r"[A-Z]", password):
        return False

    if not re.search(r"[a-z]", password):
        return False

    if not re.search(r"[0-9]", password):
        return False

    if not re.search(r"[!@#$%^&*()_+=<>?/]", password):
        return False

    return True


def register():

    st.title("📝 Create New Account")

    username = st.text_input(
        "👤 Username",
        key="register_username"
    )

    password = st.text_input(
        "🔒 Password",
        type="password",
        key="register_password"
    )

    confirm = st.text_input(
        "🔐 Confirm Password",
        type="password",
        key="register_confirm"
    )

    if st.button(
        "📝 Register",
        use_container_width=True,
        key="register_button"
    ):

        if user_exists(username):

            st.error("Username already exists")

            return

        if password != confirm:

            st.error("Passwords do not match")

            return

        if not password_strength(password):

            st.error("Weak Password")

            return

        register_user(
            username,
            password
        )

        st.success("Registration Successful 🎉")