import streamlit as st
from authentication.login import login

def login_page():

    st.markdown("""
    <style>

    .login-box{

        background:white;
        padding:35px;
        border-radius:20px;
        box-shadow:0px 5px 20px rgba(0,0,0,.2);

    }

    .title{

        text-align:center;
        color:#E91E63;
        font-size:35px;
        font-weight:bold;

    }

    </style>
    """, unsafe_allow_html=True)

    st.markdown("<div class='title'>🎓 Student Productivity Analytics</div>",
                unsafe_allow_html=True)

    st.write("")
    st.write("")

    col1, col2, col3 = st.columns([1,2,1])

    with col2:

        st.image(
            "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            width=150
        )

        st.subheader("🔐 Login")

        email = st.text_input(
            "📧 Email"
        )

        show = st.checkbox("👁 Show Password")

        if show:

            password = st.text_input(
                "🔑 Password"
            )

        else:

            password = st.text_input(
                "🔑 Password",
                type="password"
            )

        role = st.radio(

            "Login As",

            [

                "Student",

                "Admin"

            ],

            horizontal=True

        )

        st.write("")

        if st.button("🌸 Login"):

            user = login(email,password)

            if user:

                st.session_state.logged_in=True

                st.session_state.user=user

                st.session_state.role=role

                st.success("Login Successful")

                st.balloons()

                st.rerun()

            else:

                st.error("Invalid Email or Password")

        st.write("")

        st.info("New User? Please Register from the Sidebar.")