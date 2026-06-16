import streamlit as st
import pandas as pd
from dashboard.ai_assistant import show as ai_assistant


# ==========================
# PAGE CONFIG
# ==========================
st.set_page_config(
    page_title="Cyber Threat Intelligence Platform",
    page_icon="🛡️",
    layout="wide"
)

# ==========================
# TITLE
# ==========================
st.title("🛡️ Cyber Threat Intelligence Platform")
st.markdown("---")

# ==========================
# SIDEBAR
# ==========================
module = st.sidebar.radio(
    "Select Module",
    [
        "Home",
        "Phishing Detection",
        "Malware Detection",
        "Network Detection",
        "Threat Analytics",
        "AI Security Assistant",
        "About Project"
    ]
)

# ==========================
# HOME PAGE
# ==========================
if module == "Home":

    st.header("Cyber Security Dashboard")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Phishing Model", "Ready")

    with col2:
        st.metric("Malware Model", "Ready")

    with col3:
        st.metric("Network Model", "Ready")

    st.success(
        "Unified Cyber Threat Intelligence Platform Running Successfully"
    )

    st.markdown("---")

    st.subheader("Project Modules")

    st.write("✅ Phishing Detection")
    st.write("✅ Malware Detection")
    st.write("✅ Network Intrusion Detection")
    st.write("✅ Threat Analytics")
    st.write("🔄 AI Security Assistant")

# ==========================
# PHISHING PAGE
# ==========================
elif module == "Phishing Detection":

    import joblib

    st.header("🔍 AI Phishing Detection System")

    model = joblib.load("models/phishing_model.pkl")

    url_length = st.number_input("URL Length", value=50)
    valid_url = st.number_input("Valid URL (1=Yes,0=No)", value=1)
    at_symbol = st.number_input("@ Symbol Present (1=Yes,0=No)", value=0)
    sensitive_words_count = st.number_input("Sensitive Words Count", value=0)
    path_length = st.number_input("Path Length", value=20)
    isHttps = st.number_input("HTTPS Enabled (1=Yes,0=No)", value=1)
    nb_dots = st.number_input("Number of Dots", value=2)
    nb_hyphens = st.number_input("Number of Hyphens", value=0)
    nb_and = st.number_input("Number of AND Symbols", value=0)
    nb_or = st.number_input("Number of OR Symbols", value=0)
    nb_www = st.number_input("WWW Present (1=Yes,0=No)", value=1)
    nb_com = st.number_input("COM Present (1=Yes,0=No)", value=1)
    nb_underscore = st.number_input("Number of Underscores", value=0)

    if st.button("🚀 Analyze Website"):

        sample = pd.DataFrame([{
            "url_length": url_length,
            "valid_url": valid_url,
            "at_symbol": at_symbol,
            "sensitive_words_count": sensitive_words_count,
            "path_length": path_length,
            "isHttps": isHttps,
            "nb_dots": nb_dots,
            "nb_hyphens": nb_hyphens,
            "nb_and": nb_and,
            "nb_or": nb_or,
            "nb_www": nb_www,
            "nb_com": nb_com,
            "nb_underscore": nb_underscore
        }])

        prediction = model.predict(sample)[0]

        probability = model.predict_proba(sample)[0]

        confidence = max(probability) * 100

        st.metric(
            "Confidence Score",
            f"{confidence:.2f}%"
        )

        if prediction == 1:
            st.error(
                f"⚠️ Phishing Website Detected ({confidence:.2f}%)"
            )
        else:
            st.success(
                f"✅ Safe Website ({confidence:.2f}%)"
            )

# ==========================
# MALWARE PAGE
# ==========================
elif module == "Malware Detection":

    st.header("🦠 Malware Detection Module")

    st.info(
        "AI Model detects whether a file is Malware or Benign."
    )

    st.write("""
    Features Used:
    - Memory Usage
    - Process Statistics
    - System Behaviour
    - CPU Metrics
    """)

# ==========================
# NETWORK PAGE
# ==========================
elif module == "Network Detection":

    st.header("🌐 Network Intrusion Detection")

    st.info(
        "AI Model detects malicious network traffic."
    )

    st.write("""
    Detects:
    - DDoS Attacks
    - DoS Attacks
    - Bot Attacks
    - Port Scanning
    - Normal Traffic
    """)

# ==========================
# ANALYTICS PAGE
# ==========================
elif module == "Threat Analytics":

    st.header("📊 Threat Analytics Dashboard")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Phishing Threats", "25")

    with col2:
        st.metric("Malware Threats", "40")

    with col3:
        st.metric("Network Attacks", "15")

    st.markdown("---")

    chart_data = pd.DataFrame({
        "Threat Count": [25, 40, 15]
    },
    index=[
        "Phishing",
        "Malware",
        "Network"
    ])

    st.bar_chart(chart_data)

    st.success(
        "Threat Analytics Loaded Successfully"
    )

# ==========================
# AI ASSISTANT PAGE
# ==========================
elif module == "AI Security Assistant":

    ai_assistant()

# ==========================
# ABOUT PAGE
# ==========================
elif module == "About Project":

    st.header("📖 About Project")

    st.write("""
    ## AI-Powered Cyber Threat Intelligence Platform

    This project uses Machine Learning techniques to detect cyber threats.

    ### Modules

    - Phishing Detection
    - Malware Detection
    - Network Intrusion Detection

    ### Algorithms

    - Random Forest
    - Machine Learning
    - Data Analytics

    ### Technologies

    - Python
    - Streamlit
    - Pandas
    - Scikit-Learn

    ### Objective

    To identify and analyze cyber threats using AI and Machine Learning.
    """)

    st.success("Project Documentation Loaded Successfully")