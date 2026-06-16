// Verify session as administrator
const adminUser = API.verifySession('admin');
if (!adminUser) {
  // Session verify will handle redirecting if invalid
}

let trendChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  loadDashboardData();
  loadClassesList();

  // Setup Create User submit event
  document.getElementById('create-user-form').addEventListener('submit', handleCreateUser);

  // Setup Password Reset submit event
  document.getElementById('reset-password-form').addEventListener('submit', handlePasswordReset);
});

// Tab Switcher logic
function switchTab(tabId) {
  // Hide all sections
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(m => m.classList.remove('active'));
  
  // Show active
  document.getElementById(`tab-panel-${tabId}`).classList.add('active');
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');

  // Page Header Update
  const headerPageTitle = document.getElementById('header-page-title');
  if (tabId === 'dashboard') {
    headerPageTitle.textContent = 'Analytics Dashboard';
    loadDashboardData();
  } else if (tabId === 'users') {
    headerPageTitle.textContent = 'User Accounts Management';
    loadUsers('all');
  } else if (tabId === 'logs') {
    headerPageTitle.textContent = 'System Audit Logs';
    loadAuditLogs();
  } else if (tabId === 'settings') {
    headerPageTitle.textContent = 'Account Settings';
  }
}

// Fetch dashboard values and render trend graphs
async function loadDashboardData() {
  try {
    const analytics = await API.request('/reports/analytics');
    const defaulters = await API.request('/reports/defaulters');

    // Populate Counters
    document.getElementById('stat-students').textContent = analytics.totalStudents;
    document.getElementById('stat-teachers').textContent = analytics.totalTeachers;
    document.getElementById('stat-classes').textContent = analytics.totalClasses;
    document.getElementById('stat-average').textContent = `${analytics.averageDailyAttendance}%`;

    // Render Defaulters List
    const defaulterList = document.getElementById('defaulter-list');
    defaulterList.innerHTML = '';
    
    if (defaulters.length === 0) {
      defaulterList.innerHTML = `
        <div style="text-align: center; color: var(--present); font-weight: 500; padding: 40px 0;">
          🎉 No student is currently below the 75% attendance criteria.
        </div>`;
    } else {
      defaulters.forEach(s => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '12px 16px';
        item.style.borderRadius = '10px';
        item.style.background = 'rgba(239, 68, 68, 0.05)';
        item.style.border = '1px solid rgba(239, 68, 68, 0.15)';
        item.style.marginBottom = '10px';

        item.innerHTML = `
          <div>
            <div style="font-size: 14px; font-weight: 600;">${s.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${s.email}</div>
          </div>
          <div style="text-align: right;">
            <div class="badge badge-absent">${s.percentage}%</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${s.present_sessions}/${s.total_sessions} classes</div>
          </div>
        `;
        defaulterList.appendChild(item);
      });
    }

    // Render Chart.js
    renderTrendChart(analytics.attendanceTrend);

  } catch (err) {
    showAdminAlert(err.message, 'error');
  }
}

function renderTrendChart(trendData) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  const labels = trendData.map(t => {
    // Format date string beautifully (e.g. CS-101 -> CS-101 or 2026-06-15 -> 06/15)
    const parts = t.date.split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : t.date;
  });
  const dataValues = trendData.map(t => t.rate);

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Attendance Rate (%)',
        data: dataValues,
        borderColor: '#6366f1',
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', font: { family: 'Outfit' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { family: 'Outfit' } }
        }
      }
    }
  });
}

// User Administration: Load accounts
async function loadUsers(roleFilter) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Fetching registry...</td></tr>';
  
  try {
    const url = roleFilter === 'all' ? '/' : `/?role=${roleFilter}`;
    const users = await API.request(`/users${url}`);

    tbody.innerHTML = '';
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No members registered.</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      
      // Compute Class label
      let classLabel = '-';
      if (u.role === 'student') {
        classLabel = u.classes && u.classes.length > 0 
          ? u.classes.map(c => c.class_name).join(', ') 
          : '<span style="color: var(--late);">Not Assigned</span>';
      }

      tr.innerHTML = `
        <td style="font-weight: 500;">${u.name}</td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-excused' : (u.role === 'teacher' ? 'badge-late' : 'badge-present')}">${u.role}</span></td>
        <td>${classLabel}</td>
        <td>
          <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px; width: auto;" onclick="deleteUser(${u.id})">
            Delete
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    showAdminAlert(err.message, 'error');
  }
}

// Fetch class selector options for the add user dropdown
async function loadClassesList() {
  const select = document.getElementById('user-class');
  try {
    const classes = await API.request('/users/classes');
    select.innerHTML = '';
    classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.class_name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load classes dropdown options:', err.message);
  }
}

function toggleFormClassSelect() {
  const role = document.getElementById('user-role').value;
  const group = document.getElementById('class-select-group');
  if (role === 'student') {
    group.style.display = 'block';
  } else {
    group.style.display = 'none';
  }
}

// Handle Add User form submissions
async function handleCreateUser(e) {
  e.preventDefault();
  
  const name = document.getElementById('user-name').value;
  const email = document.getElementById('user-email').value;
  const password = document.getElementById('user-password').value;
  const role = document.getElementById('user-role').value;
  const classId = role === 'student' ? document.getElementById('user-class').value : null;

  try {
    await API.request('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, classId })
    });

    showAdminAlert(`Account for ${name} created successfully!`, 'success');
    document.getElementById('create-user-form').reset();
    toggleFormClassSelect();
    loadUsers(role);
  } catch (err) {
    showAdminAlert(err.message, 'error');
  }
}

// Handle user deletion requests
async function deleteUser(id) {
  if (!confirm('Are you absolutely sure you want to delete this user? All enrollment and attendance history logs will be removed.')) {
    return;
  }

  try {
    const data = await API.request(`/users/${id}`, {
      method: 'DELETE'
    });
    showAdminAlert(data.message, 'success');
    loadUsers('all');
  } catch (err) {
    showAdminAlert(err.message, 'error');
  }
}

// Load Audit events
async function loadAuditLogs() {
  const tbody = document.getElementById('logs-table-body');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Fetching logs...</td></tr>';
  
  try {
    const logs = await API.request('/users/audit-logs');
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No logs found.</td></tr>';
      return;
    }

    logs.forEach(l => {
      const tr = document.createElement('tr');
      const timeStr = new Date(l.timestamp).toLocaleString();
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 13px;">${timeStr}</td>
        <td>
          <div style="font-weight: 500;">${l.operator_name || 'System'}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${l.operator_email || '-'}</div>
        </td>
        <td><span style="font-family: monospace; color: var(--accent); font-weight: 600;">${l.action}</span></td>
        <td style="font-size: 14px;">${l.details}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showAdminAlert(err.message, 'error');
  }
}

// Handle Password resets
async function handlePasswordReset(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('pw-current').value;
  const newPassword = document.getElementById('pw-new').value;

  try {
    await API.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    showAdminAlert('Password updated successfully!', 'success');
    document.getElementById('reset-password-form').reset();
  } catch (err) {
    showAdminAlert(err.message, 'error');
  }
}

// Alert notifier utils
function showAdminAlert(message, type) {
  const alertBox = document.getElementById('admin-alert');
  alertBox.style.display = 'block';
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Auto hide after 4 seconds
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 4000);
}
