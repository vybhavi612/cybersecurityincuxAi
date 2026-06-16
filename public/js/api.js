const API_BASE_URL = '/api';

const API = {
  // Token & Session helpers
  getToken() {
    return localStorage.getItem('portal_token');
  },

  setToken(token) {
    localStorage.setItem('portal_token', token);
  },

  clearSession() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('portal_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    localStorage.setItem('portal_user', JSON.stringify(user));
  },

  // Base HTTP Request handler
  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // Handle file download exports
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('text/csv')) {
        return response.blob();
      }

      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration/unauthorized redirect
        if (response.status === 401 || response.status === 403) {
          const user = this.getCurrentUser();
          // Avoid loop on login page
          if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            this.clearSession();
            window.location.href = '/index.html?expired=true';
            return;
          }
        }
        throw new Error(data.message || 'An error occurred.');
      }

      return data;
    } catch (err) {
      console.error(`API Request failed on ${endpoint}:`, err.message);
      throw err;
    }
  },

  // Auth Operations
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token && data.user) {
      this.setToken(data.token);
      this.setCurrentUser(data.user);
    }
    return data;
  },

  logout() {
    this.clearSession();
    window.location.href = '/index.html';
  },

  // Common Dashboard Profile Verification Helper
  verifySession(requiredRole = null) {
    const token = this.getToken();
    const user = this.getCurrentUser();

    if (!token || !user) {
      this.clearSession();
      window.location.href = '/index.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      // Redirect role mismatch to correct page
      if (user.role === 'admin') window.location.href = '/admin.html';
      else if (user.role === 'teacher') window.location.href = '/teacher.html';
      else if (user.role === 'student') window.location.href = '/student.html';
      return null;
    }

    // Initialize Global UI displays for logged user
    document.addEventListener('DOMContentLoaded', () => {
      const userNameEl = document.getElementById('ui-user-name');
      const userRoleEl = document.getElementById('ui-user-role');
      const userAvatarEl = document.getElementById('ui-user-avatar');
      const currentDateEl = document.getElementById('ui-current-date');

      if (userNameEl) userNameEl.textContent = user.name;
      if (userRoleEl) userRoleEl.textContent = user.role;
      if (userAvatarEl) {
        // Initials
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatarEl.textContent = initials;
      }
      if (currentDateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateEl.textContent = new Date().toLocaleDateString(undefined, options);
      }
    });

    return user;
  }
};
