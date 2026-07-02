import streamlit as st
import google.generativeai as genai

# Gemini API Key
genai.configure(
    api_key="YOUR_API_KEY"
)

# Gemini Model
model = genai.GenerativeModel(
    "gemini-2.5-flash"
)

def show():

    st.header("🤖 AI Cyber Security Assistant")

    st.write("Ask Any Cyber Security Question")

    question = st.text_input(
        "Enter your question"
    )

    if st.button("Get Answer"):

        if question:

            try:

                with st.spinner("🤔 Thinking..."):

                    response = model.generate_content(
                        f"""
                        You are an expert Cyber Security Analyst.

                        Answer in a simple and student-friendly way.

                        Question:
                        {question}
                        """
                    )

                    st.success("Answer Generated Successfully")

                    st.write(response.text)

            except Exception as e:

                st.error(f"Error: {e}")

        else:

            st.warning("Please enter a question.")