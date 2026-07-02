/* ============================================================
   Student Hub — Login Page Script
   ============================================================ */

(function () {
  'use strict';

  /* ── DOM refs ─────────────────────────────────────────── */
  const form          = document.getElementById('loginForm');
  const emailInput    = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailGroup    = document.getElementById('emailGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const emailError    = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const toggleBtn     = document.getElementById('togglePassword');
  const eyeOpen       = toggleBtn.querySelector('.eye-open');
  const eyeClosed     = toggleBtn.querySelector('.eye-closed');
  const loginBtn      = document.getElementById('loginBtn');
  const forgotLink    = document.getElementById('forgotPassword');
  const roleBtns      = document.querySelectorAll('.role-btn');
  const roleSlider    = document.querySelector('.role-slider');
  const rememberMe    = document.getElementById('rememberMe');
  const toast         = document.getElementById('toast');

  let selectedRole    = 'student';
  let toastTimer      = null;

  /* ── Role Selector ────────────────────────────────────── */
  roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      if (role === selectedRole) return;

      selectedRole = role;

      roleBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      if (role === 'mentor') {
        roleSlider.classList.add('mentor-active');
      } else {
        roleSlider.classList.remove('mentor-active');
      }
    });
  });

  /* Keyboard support for role buttons */
  roleBtns.forEach(btn => {
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const current = Array.from(roleBtns).indexOf(btn);
        const next = (current + (e.key === 'ArrowRight' ? 1 : -1) + roleBtns.length) % roleBtns.length;
        roleBtns[next].click();
        roleBtns[next].focus();
      }
    });
  });

  /* ── Password Toggle ──────────────────────────────────── */
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    eyeOpen.style.display   = isPassword ? 'none'  : 'block';
    eyeClosed.style.display = isPassword ? 'block' : 'none';
    /* Keep focus in the input */
    passwordInput.focus();
  });

  /* ── Validation helpers ───────────────────────────────── */
  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  function setError(group, errorEl, msg) {
    group.classList.add('has-error');
    group.classList.remove('has-success');
    errorEl.textContent = msg;
  }

  function clearError(group, errorEl) {
    group.classList.remove('has-error');
    errorEl.textContent = '';
  }

  function validateEmail() {
    const val = emailInput.value.trim();
    if (!val) {
      setError(emailGroup, emailError, 'Email address is required.');
      return false;
    }
    if (!isValidEmail(val)) {
      setError(emailGroup, emailError, 'Please enter a valid email address.');
      return false;
    }
    clearError(emailGroup, emailError);
    return true;
  }

  function validatePassword() {
    const val = passwordInput.value;
    if (!val) {
      setError(passwordGroup, passwordError, 'Password is required.');
      return false;
    }
    if (val.length < 6) {
      setError(passwordGroup, passwordError, 'Password must be at least 6 characters.');
      return false;
    }
    clearError(passwordGroup, passwordError);
    return true;
  }

  /* ── Inline validation on blur ────────────────────────── */
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('blur', validatePassword);

  /* Clear errors on input */
  emailInput.addEventListener('input', () => {
    if (emailGroup.classList.contains('has-error')) {
      clearError(emailGroup, emailError);
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordGroup.classList.contains('has-error')) {
      clearError(passwordGroup, passwordError);
    }
  });

  /* ── Forgot Password ──────────────────────────────────── */
  forgotLink.addEventListener('click', e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      emailInput.focus();
      showToast('Enter your email first, then click "Forgot password".', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      emailInput.focus();
      showToast('Enter a valid email address first.', 'error');
      return;
    }
    showToast(`Password reset link sent to ${email}`, 'success');
  });

  /* ── Form Submit ──────────────────────────────────────── */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const emailOk    = validateEmail();
    const passwordOk = validatePassword();

    if (!emailOk) { emailInput.focus(); return; }
    if (!passwordOk) { passwordInput.focus(); return; }

    /* Set loading state */
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');

    try {
      await simulateLogin({
        email:      emailInput.value.trim(),
        password:   passwordInput.value,
        role:       selectedRole,
        rememberMe: rememberMe.checked,
      });

      showToast(`Welcome back! Signing you in as ${capitalize(selectedRole)}…`, 'success');

      /* In production you would redirect here */
      /* window.location.href = '/dashboard'; */
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
    }
  });

  /* ── Simulated async login ────────────────────────────── */
  function simulateLogin({ email, password }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        /* Demo: any email + password length ≥ 6 succeeds */
        if (password.length >= 6) {
          resolve({ token: 'demo-token', email });
        } else {
          reject(new Error('Invalid credentials. Please try again.'));
        }
      }, 1400);
    });
  }

  /* ── Toast ────────────────────────────────────────────── */
  function showToast(msg, type = '') {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent  = msg;
    toast.className    = 'toast show' + (type ? ` ${type}` : '');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  /* ── Utility ──────────────────────────────────────────── */
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ── Restore "Remember Me" ────────────────────────────── */
  (function restoreSession() {
    const savedEmail = localStorage.getItem('sh_email');
    const savedRemember = localStorage.getItem('sh_remember');
    if (savedRemember === 'true' && savedEmail) {
      emailInput.value    = savedEmail;
      rememberMe.checked  = true;
    }
  })();

  rememberMe.addEventListener('change', () => {
    if (rememberMe.checked) {
      localStorage.setItem('sh_remember', 'true');
      localStorage.setItem('sh_email', emailInput.value.trim());
    } else {
      localStorage.removeItem('sh_remember');
      localStorage.removeItem('sh_email');
    }
  });

  emailInput.addEventListener('change', () => {
    if (rememberMe.checked) {
      localStorage.setItem('sh_email', emailInput.value.trim());
    }
  });

})();