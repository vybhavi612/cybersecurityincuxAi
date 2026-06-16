// Redirect users who are already logged in
(function checkExistingSession() {
  const token = API.getToken();
  const user = API.getCurrentUser();
  if (token && user) {
    if (user.role === 'admin') window.location.href = '/admin.html';
    else if (user.role === 'teacher') window.location.href = '/teacher.html';
    else if (user.role === 'student') window.location.href = '/student.html';
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const alertBox = document.getElementById('alert-box');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('submit-btn');

  // Check URL parameters for session expiration warnings
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === 'true') {
    showAlert('Your session has expired. Please log in again.', 'error');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;

    // Loading State
    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';
    hideAlert();

    try {
      const response = await API.login(email, password);
      showAlert('Login successful! Redirecting...', 'success');
      
      // Redirect based on role
      setTimeout(() => {
        const user = response.user;
        if (user.role === 'admin') {
          window.location.href = '/admin.html';
        } else if (user.role === 'teacher') {
          window.location.href = '/teacher.html';
        } else if (user.role === 'student') {
          window.location.href = '/student.html';
        }
      }, 800);

    } catch (err) {
      showAlert(err.message || 'Incorrect credentials, please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  // UI alert helpers
  function showAlert(message, type) {
    alertBox.style.display = 'block';
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }
});

// Global helper to prefill form
function fillCredentials(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}
