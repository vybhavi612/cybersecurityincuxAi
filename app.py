import streamlit as st

# ==========================================
# Dashboard Pages
# ==========================================
from dashboard.sidebar import sidebar
from dashboard.home import show_home
from dashboard.live_traffic import show_live_traffic
from dashboard.threat_detection import show_threat_detection
from dashboard.blocked_ips import show_blocked_ips
from dashboard.alerts import show_alerts
from dashboard.analytics import show_analytics
from dashboard.reports import show_reports
from dashboard.settings import show_settings
from dashboard.about import show_about
from dashboard.system_status import show_system_status
# ==========================================
# Authentication
# ==========================================
from authentication.login import login
from authentication.register import register

# ==========================================
# Packet Capture
# ==========================================
from packet_capture.live_capture import start_live_capture

# ==========================================
# Background Detector
# ==========================================
from detection.background_detector import detector

from dashboard.dashboard_style import load_dashboard_style

# ==========================================
# Streamlit Config
# ==========================================
st.set_page_config(
    page_title="Traffic Detection & Automatic Blocking System",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load Custom Dashboard Theme
load_dashboard_style()

# ==========================================
# CSS
# ==========================================
st.markdown("""
<style>

.stApp{
    background:#FFF5F8;
}

section[data-testid="stSidebar"]{
    background:#FFEAF4;
}

</style>
""", unsafe_allow_html=True)

# ==========================================
# Session Variables
# ==========================================
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if "username" not in st.session_state:
    st.session_state.username = ""

# ==========================================
# Login Screen
# ==========================================
if not st.session_state.logged_in:

    tab1, tab2 = st.tabs(
        [
            "🔐 Login",
            "📝 Register"
        ]
    )

    with tab1:
        login()

    with tab2:
        register()

    st.stop()

# ==========================================
# Sidebar
# ==========================================
page = sidebar()

# ==========================================
# Start Detector
# ==========================================
if "detector_started" not in st.session_state:

    detector.start()

    st.session_state.detector_started = True

# ==========================================
# Dashboard Pages
# ==========================================
if page == "Dashboard":

    show_home()

elif page == "Live Traffic":

    start_live_capture()

    show_live_traffic()

elif page == "Threat Detection":

    show_threat_detection()

elif page == "Blocked IPs":

    show_blocked_ips()

elif page == "Alerts":

    show_alerts()

elif page == "Analytics":

    show_analytics()

elif page == "Reports":

    show_reports()

elif page == "Settings":

    show_settings()
    
elif page == "System Status":

    show_system_status()

elif page == "About":

    show_about()

elif page == "Logout":

    detector.stop()

    st.session_state.clear()

    st.rerun()