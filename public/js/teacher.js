// Verify session as teacher
const teacherUser = API.verifySession('teacher');
if (!teacherUser) {
  // Session verify will handle redirecting if invalid
}

document.addEventListener('DOMContentLoaded', () => {
  // Set default date input value to today
  const dateInput = document.getElementById('mark-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Load selection fields
  loadSelectionDropdowns();

  // Setup Password Reset submit event
  document.getElementById('reset-password-form').addEventListener('submit', handlePasswordReset);

  // Setup drag-and-drop event listeners
  setupDragAndDrop();
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
  if (tabId === 'mark') {
    headerPageTitle.textContent = 'Mark Attendance';
  } else if (tabId === 'upload') {
    headerPageTitle.textContent = 'Bulk Attendance Import';
  } else if (tabId === 'reports') {
    headerPageTitle.textContent = 'Subject Performance Reports';
  } else if (tabId === 'settings') {
    headerPageTitle.textContent = 'Account Settings';
  }
}

// Load classes and subjects for selection panels
async function loadSelectionDropdowns() {
  try {
    const classes = await API.request('/users/classes');
    const subjects = await API.request('/attendance/subjects');

    const selectClassMark = document.getElementById('mark-class');
    const selectClassReport = document.getElementById('report-class');
    const selectSubjectMark = document.getElementById('mark-subject');

    // Populate Classes Dropdowns
    const classOptionsHtml = classes.map(c => `<option value="${c.id}">${c.class_name}</option>`).join('');
    if (selectClassMark) selectClassMark.innerHTML = classOptionsHtml;
    if (selectClassReport) selectClassReport.innerHTML = classOptionsHtml;

    // Populate Subjects Dropdown (Only taught by this teacher)
    if (selectSubjectMark) {
      selectSubjectMark.innerHTML = subjects.map(s => `<option value="${s.id}">${s.subject_code} - ${s.subject_name}</option>`).join('');
    }

  } catch (err) {
    showTeacherAlert(err.message, 'error');
  }
}

// Load student list for selected class/subject/date
async function loadRoster() {
  const classId = document.getElementById('mark-class').value;
  const subjectId = document.getElementById('mark-subject').value;
  const date = document.getElementById('mark-date').value;

  if (!classId || !subjectId || !date) {
    showTeacherAlert('Please select all filters before loading roster.', 'error');
    return;
  }

  const rosterCard = document.getElementById('roster-card');
  const tbody = document.getElementById('roster-table-body');
  tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Fetching roster...</td></tr>';
  rosterCard.style.display = 'block';

  try {
    const roster = await roster = await API.request(`/attendance/class/${classId}?date=${date}&subjectId=${subjectId}`);
    
    tbody.innerHTML = '';
    if (roster.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No students enrolled in this class.</td></tr>';
      return;
    }

    roster.forEach(s => {
      const tr = document.createElement('tr');
      
      // Select status if already marked, else default to 'Present'
      const status = s.status || 'Present';

      tr.innerHTML = `
        <td style="font-weight: 500;">${s.name}</td>
        <td style="color: var(--text-muted); font-size: 14px;">${s.email}</td>
        <td>
          <div class="status-radio-group">
            <div class="status-btn">
              <input type="radio" name="status-${s.student_id}" id="present-${s.student_id}" value="Present" ${status === 'Present' ? 'checked' : ''}>
              <label class="status-label lbl-present" for="present-${s.student_id}">Present</label>
            </div>
            <div class="status-btn">
              <input type="radio" name="status-${s.student_id}" id="absent-${s.student_id}" value="Absent" ${status === 'Absent' ? 'checked' : ''}>
              <label class="status-label lbl-absent" for="absent-${s.student_id}">Absent</label>
            </div>
            <div class="status-btn">
              <input type="radio" name="status-${s.student_id}" id="late-${s.student_id}" value="Late" ${status === 'Late' ? 'checked' : ''}>
              <label class="status-label lbl-late" for="late-${s.student_id}">Late</label>
            </div>
            <div class="status-btn">
              <input type="radio" name="status-${s.student_id}" id="excused-${s.student_id}" value="Excused" ${status === 'Excused' ? 'checked' : ''}>
              <label class="status-label lbl-excused" for="excused-${s.student_id}">Excused</label>
            </div>
          </div>
        </td>
      `;
      
      tbody.appendChild(tr);
    });

    document.getElementById('roster-title').textContent = `Attendance Roster: ${document.getElementById('mark-class').options[document.getElementById('mark-class').selectedIndex].text}`;
    document.getElementById('auto-save-indicator').textContent = 'Ready to save';

  } catch (err) {
    showTeacherAlert(err.message, 'error');
    rosterCard.style.display = 'none';
  }
}

// Save marked attendance state to backend
async function saveAttendance() {
  const subjectId = document.getElementById('mark-subject').value;
  const date = document.getElementById('mark-date').value;
  const rows = document.querySelectorAll('#roster-table-body tr');

  const records = [];
  rows.forEach(row => {
    const radioChecked = row.querySelector('input[type="radio"]:checked');
    if (radioChecked) {
      const studentId = parseInt(radioChecked.name.split('-')[1]);
      const status = radioChecked.value;
      records.push({ studentId, status });
    }
  });

  if (records.length === 0) {
    showTeacherAlert('No students found to save.', 'error');
    return;
  }

  try {
    const data = await API.request('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({ subjectId, date, records })
    });
    
    showTeacherAlert(data.message, 'success');
    document.getElementById('auto-save-indicator').textContent = 'Changes saved successfully';
    
    // Refresh Roster to capture timestamps
    setTimeout(loadRoster, 1000);
  } catch (err) {
    showTeacherAlert(err.message, 'error');
  }
}

// Drag & Drop event bindings
function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--primary)';
      dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      dropZone.style.background = 'rgba(255, 255, 255, 0.01)';
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processCSVFile(files[0]);
    }
  }, false);
}

function triggerFileSelect() {
  document.getElementById('csv-file-input').click();
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processCSVFile(files[0]);
  }
}

// Read CSV file text and hit CSV import endpoint
function processCSVFile(file) {
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    showTeacherAlert('Invalid file format. Please upload a standard CSV file.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const csvText = e.target.result;
    
    try {
      const result = await API.request('/attendance/bulk-upload', {
        method: 'POST',
        body: JSON.stringify({ csvText })
      });

      showTeacherAlert(result.message, 'success');
      displayUploadResults(result);

    } catch (err) {
      showTeacherAlert(err.message, 'error');
    }
  };
  
  reader.readAsText(file);
}

// Render result list from bulk upload
function displayUploadResults(result) {
  const resultsDiv = document.getElementById('upload-results');
  const countTitle = document.getElementById('results-count-title');
  const logList = document.getElementById('results-log-list');

  resultsDiv.style.display = 'block';
  countTitle.textContent = `Bulk Ingestion Complete: ${result.inserted} rows saved successfully.`;
  logList.innerHTML = '';

  if (result.errors && result.errors.length > 0) {
    result.errors.forEach(err => {
      const p = document.createElement('p');
      p.style.fontSize = '12px';
      p.style.color = 'var(--absent)';
      p.style.marginBottom = '4px';
      p.textContent = err;
      logList.appendChild(p);
    });
  } else {
    logList.innerHTML = '<p style="color: var(--present); font-size: 13px;">🎉 CSV file processed with zero integrity errors.</p>';
  }
}

// Load Class evaluations report
async function generateReport() {
  const classId = document.getElementById('report-class').value;

  if (!classId) {
    showTeacherAlert('Please select a class.', 'error');
    return;
  }

  const reportCard = document.getElementById('report-card');
  const tbody = document.getElementById('report-table-body');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Generating report...</td></tr>';
  reportCard.style.display = 'block';

  try {
    const data = await API.request(`/reports/summary/class/${classId}`);
    
    tbody.innerHTML = '';
    if (data.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No student summaries available.</td></tr>';
      return;
    }

    data.students.forEach(s => {
      const tr = document.createElement('tr');
      
      // Style badge based on score
      let scoreClass = 'badge-present';
      if (s.percentage < 75.0) scoreClass = 'badge-absent';
      else if (s.percentage < 85.0) scoreClass = 'badge-late';

      tr.innerHTML = `
        <td style="font-weight: 500;">${s.name}</td>
        <td style="color: var(--text-muted); font-size: 14px;">${s.email}</td>
        <td>${s.present}</td>
        <td>${s.late}</td>
        <td>${s.absent}</td>
        <td>${s.excused}</td>
        <td>${s.total_sessions}</td>
        <td><span class="badge ${scoreClass}">${s.percentage}%</span></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('report-title').textContent = `Attendance Summary: ${data.className}`;

  } catch (err) {
    showTeacherAlert(err.message, 'error');
    reportCard.style.display = 'none';
  }
}

// Download whole database dump as CSV file stream
async function exportCSVReport() {
  try {
    const blob = await API.request('/reports/export');
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    
    // Clean memory
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showTeacherAlert('Database attendance report exported successfully.', 'success');
  } catch (err) {
    showTeacherAlert('Failed to download CSV: ' + err.message, 'error');
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
    showTeacherAlert('Password updated successfully!', 'success');
    document.getElementById('reset-password-form').reset();
  } catch (err) {
    showTeacherAlert(err.message, 'error');
  }
}

// Alert notifier utility
function showTeacherAlert(message, type) {
  const alertBox = document.getElementById('teacher-alert');
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
