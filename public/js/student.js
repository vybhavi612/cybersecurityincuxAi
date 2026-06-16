// Verify session as student
const studentUser = API.verifySession('student');
if (!studentUser) {
  // Session verify will handle redirecting if invalid
}

document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  loadStudentData();

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
  if (tabId === 'overview') {
    headerPageTitle.textContent = 'My Attendance Report';
    loadStudentData();
  } else if (tabId === 'settings') {
    headerPageTitle.textContent = 'Account Settings';
  }
}

// Fetch attendance details and populate layout elements
async function loadStudentData() {
  try {
    const data = await API.request(`/attendance/student/${studentUser.id}`);
    
    // 1. Overall Percentage Gauge
    animateGauge(data.overallPercentage);

    // 2. Attendance Status Sums
    let totalPresentCount = 0;
    let totalAbsentCount = 0;
    let totalLateCount = 0;
    let totalExcusedCount = 0;

    data.subjectSummaries.forEach(s => {
      totalPresentCount += s.present_count;
      totalAbsentCount += s.absent_count;
      totalLateCount += s.late_count;
      totalExcusedCount += s.excused_count;
    });

    document.getElementById('total-present').textContent = totalPresentCount;
    document.getElementById('total-absent').textContent = totalAbsentCount;
    document.getElementById('total-late').textContent = totalLateCount;
    document.getElementById('total-excused').textContent = totalExcusedCount;

    // 3. Low Attendance Banner Check (< 75%)
    const banner = document.getElementById('low-attendance-banner');
    if (data.overallPercentage < 75.0 && (totalPresentCount + totalAbsentCount + totalLateCount) > 0) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }

    // 4. Render Subject Wise Breakdown Lists
    renderSubjectBreakdown(data.subjectSummaries);

    // 5. Render History Logs
    renderHistoryLogs(data.history);

  } catch (err) {
    showStudentAlert(err.message, 'error');
  }
}

// Circular SVG gauge offset math and text updates
function animateGauge(percentage) {
  const circle = document.getElementById('gauge-circle');
  const valueText = document.getElementById('gauge-value');
  
  if (!circle || !valueText) return;

  // Circle circumference (r=70) = 2 * PI * r = ~439.8
  const circumference = 440;
  
  // Calculate offset matching percentage
  const offset = circumference - (circumference * percentage) / 100;
  
  // Apply inline styles to start animation
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = offset;
  
  // Transition text content smoothly
  let currentVal = 0;
  const speed = 15; // ms per count
  const increment = percentage / 50; // finish count in 50 iterations
  
  const timer = setInterval(() => {
    currentVal += increment;
    if (currentVal >= percentage) {
      clearInterval(timer);
      valueText.textContent = `${percentage}%`;
      
      // Color-code gauge ring
      if (percentage < 75.0) {
        circle.style.stroke = 'var(--absent)';
      } else if (percentage < 85.0) {
        circle.style.stroke = 'var(--late)';
      } else {
        circle.style.stroke = 'var(--present)';
      }
    } else {
      valueText.textContent = `${Math.floor(currentVal)}%`;
    }
  }, speed);
}

// Generate list items for subjects in UI
function renderSubjectBreakdown(summaries) {
  const container = document.getElementById('subject-list-container');
  container.innerHTML = '';

  if (summaries.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px 0;">No subjects registered.</div>';
    return;
  }

  summaries.forEach(s => {
    const item = document.createElement('div');
    
    // Color style progress color
    let barColor = 'var(--present)';
    if (s.percentage < 75.0) barColor = 'var(--absent)';
    else if (s.percentage < 85.0) barColor = 'var(--late)';

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
        <div>
          <span style="font-weight: 600; color: white;">${s.subject_code}</span>
          <span style="color: var(--text-muted); font-size: 13px; margin-left: 6px;">${s.subject_name}</span>
        </div>
        <span style="font-weight: 700; color: ${barColor}">${s.percentage}%</span>
      </div>
      <div style="width: 100%; height: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden; margin-bottom: 4px;">
        <div style="width: ${s.percentage}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.8s ease-out;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
        <span>Present: ${s.present_count}</span>
        <span>Late: ${s.late_count}</span>
        <span>Absent: ${s.absent_count}</span>
        <span>Excused: ${s.excused_count}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Populate History Logs list
function renderHistoryLogs(history) {
  const tbody = document.getElementById('history-table-body');
  tbody.innerHTML = '';

  if (history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No attendance records found.</td></tr>';
    return;
  }

  history.forEach(log => {
    const tr = document.createElement('tr');
    
    // Status style mapping
    let badgeClass = 'badge-present';
    if (log.status === 'Absent') badgeClass = 'badge-absent';
    else if (log.status === 'Late') badgeClass = 'badge-late';
    else if (log.status === 'Excused') badgeClass = 'badge-excused';

    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 14px;">${log.date}</td>
      <td style="font-weight: 500;">
        <div>${log.subject_name}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${log.subject_code}</div>
      </td>
      <td><span class="badge ${badgeClass}">${log.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
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
    showStudentAlert('Password updated successfully!', 'success');
    document.getElementById('reset-password-form').reset();
  } catch (err) {
    showStudentAlert(err.message, 'error');
  }
}

// Alert notifier utility
function showStudentAlert(message, type) {
  const alertBox = document.getElementById('student-alert');
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
