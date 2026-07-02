/**
 * PhishGuard AI — Frontend Application
 * Handles UI interactions, API calls, local storage, and rendering
 */

'use strict';

/* ── Constants ──────────────────────────────────────────────── */
const API_BASE = '/api';
const STORAGE_KEY = 'phishguard_history';
const MAX_HISTORY = 50;

const LOADING_MESSAGES = [
  'Initializing scan engine...',
  'Parsing URL structure...',
  'Running keyword analysis...',
  'Checking subdomain depth...',
  'Validating protocol...',
  'Scanning for obfuscation...',
  'Querying reputation module...',
  'Calculating risk score...',
  'Generating report...',
];

/* ── DOM References ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const DOM = {
  urlInput:        $('url-input'),
  analyzeBtn:      $('analyze-btn'),
  loadingOverlay:  $('loading-overlay'),
  loadingText:     $('loading-text'),
  loadingBar:      $('loading-bar'),
  resultsSection:  $('results-section'),
  riskCard:        $('risk-card'),
  meterFill:       $('meter-fill'),
  meterNeedle:     $('meter-needle'),
  meterScore:      $('meter-score'),
  riskBadge:       $('risk-badge'),
  resultUrl:       $('result-url'),
  resultDomain:    $('result-domain'),
  resultTime:      $('result-time'),
  summaryPass:     $('summary-pass'),
  summaryFail:     $('summary-fail'),
  summaryPending:  $('summary-pending'),
  checksGrid:      $('checks-grid'),
  recList:         $('recommendations-list'),
  downloadBtn:     $('download-btn'),
  newScanBtn:      $('new-scan-btn'),
  copyResultBtn:   $('copy-result-btn'),
  sampleToggle:    $('sample-toggle'),
  samplesPanel:    $('samples-panel'),
  samplesGrid:     $('samples-grid'),
  historyList:     $('history-list'),
  historyEmpty:    $('history-empty'),
  clearHistoryBtn: $('clear-history-btn'),
  statTotal:       $('stat-total'),
  statSafe:        $('stat-safe'),
  statSuspicious:  $('stat-suspicious'),
  statHighRisk:    $('stat-high-risk'),
  distSafe:        $('dist-safe'),
  distSuspicious:  $('dist-suspicious'),
  distHighRisk:    $('dist-high-risk'),
  statsEmpty:      $('stats-empty'),
  toast:           $('toast'),
};

/* ── State ───────────────────────────────────────────────────── */
let currentReport = null;
let toastTimer = null;
let loadingInterval = null;
let loadingProgress = 0;

/* ────────────────────────────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────────────────────────────── */

/**
 * Switch between scanner / history / stats / tips views
 * @param {string} viewId - e.g. 'scanner', 'history'
 */
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.hidden = true;
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewId}`);
  const targetBtn  = document.querySelector(`[data-view="${viewId}"]`);

  if (targetView) { targetView.classList.add('active'); targetView.hidden = false; }
  if (targetBtn)  { targetBtn.classList.add('active'); targetBtn.setAttribute('aria-current', 'page'); }

  // Refresh dynamic views when navigated to
  if (viewId === 'history') renderHistory();
  if (viewId === 'stats')   renderStats();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

/* ────────────────────────────────────────────────────────────────
   URL ANALYSIS — API CALL
──────────────────────────────────────────────────────────────── */

/**
 * Send URL to /api/analyze and handle the response
 */
async function analyzeUrl() {
  const url = DOM.urlInput.value.trim();
  if (!url) { showToast('Please enter a URL to analyze.'); DOM.urlInput.focus(); return; }

  setLoadingState(true);

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Analysis failed. Please try again.');
    }

    currentReport = data.report;
    saveToHistory(data.report);
    setLoadingState(false);
    renderResults(data.report);

  } catch (err) {
    setLoadingState(false);
    showToast(`⚠ ${err.message}`);
    console.error('[PhishGuard] Error:', err);
  }
}

/* ────────────────────────────────────────────────────────────────
   LOADING STATE
──────────────────────────────────────────────────────────────── */

/**
 * Toggle loading overlay and animate progress bar with rotating messages
 * @param {boolean} isLoading
 */
function setLoadingState(isLoading) {
  DOM.analyzeBtn.disabled = isLoading;
  DOM.urlInput.disabled   = isLoading;

  if (isLoading) {
    DOM.loadingOverlay.hidden  = false;
    DOM.resultsSection.hidden  = true;
    loadingProgress = 0;
    DOM.loadingBar.style.width = '0%';
    let msgIndex = 0;

    DOM.loadingText.textContent = LOADING_MESSAGES[0];

    loadingInterval = setInterval(() => {
      loadingProgress = Math.min(loadingProgress + (100 / LOADING_MESSAGES.length), 92);
      DOM.loadingBar.style.width = loadingProgress + '%';
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      DOM.loadingText.textContent = LOADING_MESSAGES[msgIndex];
    }, 320);

  } else {
    clearInterval(loadingInterval);
    DOM.loadingBar.style.width = '100%';
    setTimeout(() => {
      DOM.loadingOverlay.hidden = true;
      DOM.loadingBar.style.width = '0%';
    }, 300);
    DOM.analyzeBtn.disabled = false;
    DOM.urlInput.disabled   = false;
  }
}

/* ────────────────────────────────────────────────────────────────
   RESULTS RENDERING
──────────────────────────────────────────────────────────────── */

/**
 * Populate the full results dashboard from an analysis report
 * @param {object} report - Analysis report from the API
 */
function renderResults(report) {
  DOM.resultsSection.hidden = false;
  DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── Risk Meter ──────────────────────────────────────────────
  animateMeter(report.score, report.level);

  // ── Meta Card ───────────────────────────────────────────────
  DOM.resultUrl.textContent    = report.url;
  DOM.resultDomain.textContent = report.domain;
  DOM.resultTime.textContent   = formatTimestamp(report.timestamp);

  DOM.summaryPass.textContent    = `${report.summary.passed} Passed`;
  DOM.summaryFail.textContent    = `${report.summary.failed} Failed`;
  DOM.summaryPending.textContent = `${report.summary.pending} Pending`;

  // ── Checks Grid ─────────────────────────────────────────────
  DOM.checksGrid.innerHTML = '';
  report.checks.forEach((check, i) => {
    const el = buildCheckItem(check, i);
    DOM.checksGrid.appendChild(el);
  });

  // ── Recommendations ─────────────────────────────────────────
  DOM.recList.innerHTML = '';
  report.recommendations.forEach((rec, i) => {
    const li = document.createElement('li');
    li.textContent = rec;
    li.style.animationDelay = `${i * 60}ms`;
    DOM.recList.appendChild(li);
  });
}

/**
 * Animate the risk meter SVG arc and needle to the given score
 * @param {number} score - 0-100
 * @param {string} level - 'safe' | 'suspicious' | 'high-risk'
 */
function animateMeter(score, level) {
  // Color map
  const colorMap = {
    'safe':       'var(--safe)',
    'suspicious': 'var(--suspicious)',
    'high-risk':  'var(--high-risk)',
  };
  const color = colorMap[level] || 'var(--cyan)';

  // Arc: the meter covers 180 degrees (π radians), circumference=251.2 for r=80
  const circumference = 251.2;
  const offset = circumference - (score / 100) * circumference;
  DOM.meterFill.style.strokeDashoffset = offset;
  DOM.meterFill.style.stroke = color;

  // Needle: rotates from -90deg (0) to +90deg (100)
  const angle = -90 + (score / 100) * 180;
  DOM.meterNeedle.style.transform = `rotate(${angle}deg)`;

  // Score counter animation
  animateCounter(DOM.meterScore, 0, score, 900);
  DOM.meterScore.style.color = color;

  // Risk badge
  DOM.riskBadge.textContent = level === 'high-risk' ? 'High Risk' : level.charAt(0).toUpperCase() + level.slice(1);
  DOM.riskBadge.className = `risk-badge level-${level}`;

  // Card border
  DOM.riskCard.className = `risk-card level-${level}`;
}

/**
 * Animate a numeric counter from start to end over duration ms
 * @param {HTMLElement} el
 * @param {number} start
 * @param {number} end
 * @param {number} duration
 */
function animateCounter(el, start, end, duration) {
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/**
 * Build a single check result card element
 * @param {object} check - Check result object from API
 * @param {number} index - Used for staggered animation
 * @returns {HTMLElement}
 */
function buildCheckItem(check, index) {
  const item = document.createElement('div');

  let statusClass, iconText;
  if (check.placeholder) {
    statusClass = 'status-pending';
    iconText    = '?';
  } else if (check.passed) {
    statusClass = 'status-pass';
    iconText    = '✓';
  } else {
    statusClass = 'status-fail';
    iconText    = '✕';
  }

  const iconClass = check.placeholder ? 'pending' : (check.passed ? 'pass' : 'fail');

  item.className = `check-item ${statusClass}`;
  item.style.animationDelay = `${index * 50}ms`;

  const scoreText = check.score > 0
    ? `+${check.score} risk points`
    : (check.placeholder ? 'API integration pending' : '0 risk points');

  item.innerHTML = `
    <div class="check-status-icon ${iconClass}">${iconText}</div>
    <div class="check-body">
      <div class="check-name">${escapeHtml(check.name)}</div>
      <div class="check-detail">${escapeHtml(check.detail)}</div>
      <div class="check-score ${check.score === 0 ? 'zero' : ''}">${scoreText}</div>
    </div>
  `;

  return item;
}

/* ────────────────────────────────────────────────────────────────
   LOCAL STORAGE — HISTORY
──────────────────────────────────────────────────────────────── */

/**
 * Load scan history from localStorage
 * @returns {Array} History array (newest first)
 */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save an analysis report to history
 * @param {object} report
 */
function saveToHistory(report) {
  const history = loadHistory();
  // Avoid duplicate entries for the same URL (keep newest)
  const filtered = history.filter(h => h.url !== report.url);
  filtered.unshift({
    url:            report.url,
    domain:         report.domain,
    score:          report.score,
    classification: report.classification,
    level:          report.level,
    timestamp:      report.timestamp,
  });
  const trimmed = filtered.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Render the history list view
 */
function renderHistory() {
  const history = loadHistory();

  if (history.length === 0) {
    DOM.historyEmpty.hidden = false;
    DOM.historyList.innerHTML = '';
    return;
  }

  DOM.historyEmpty.hidden = true;
  DOM.historyList.innerHTML = '';

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `Re-analyze ${item.url}`);

    el.innerHTML = `
      <span class="history-badge level-${item.level}">${item.classification}</span>
      <span class="history-url">${escapeHtml(item.url)}</span>
      <span class="history-score">${item.score}/100</span>
      <span class="history-time">${formatTimestamp(item.timestamp, true)}</span>
    `;

    // Click → re-run analysis for that URL
    el.addEventListener('click', () => {
      DOM.urlInput.value = item.url;
      switchView('scanner');
      analyzeUrl();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });

    DOM.historyList.appendChild(el);
  });
}

/* ────────────────────────────────────────────────────────────────
   STATS VIEW
──────────────────────────────────────────────────────────────── */

/**
 * Render the statistics view from stored history
 */
function renderStats() {
  const history = loadHistory();
  const total      = history.length;
  const safe       = history.filter(h => h.level === 'safe').length;
  const suspicious = history.filter(h => h.level === 'suspicious').length;
  const highRisk   = history.filter(h => h.level === 'high-risk').length;

  DOM.statTotal.textContent      = total;
  DOM.statSafe.textContent       = safe;
  DOM.statSuspicious.textContent = suspicious;
  DOM.statHighRisk.textContent   = highRisk;

  if (total === 0) {
    DOM.statsEmpty.hidden = false;
    DOM.distSafe.style.width       = '0%';
    DOM.distSuspicious.style.width = '0%';
    DOM.distHighRisk.style.width   = '0%';
    return;
  }

  DOM.statsEmpty.hidden = true;

  // Distribution bar percentages
  const safePct       = ((safe / total) * 100).toFixed(1);
  const suspPct       = ((suspicious / total) * 100).toFixed(1);
  const highPct       = ((highRisk / total) * 100).toFixed(1);

  DOM.distSafe.style.width       = safePct + '%';
  DOM.distSuspicious.style.width = suspPct + '%';
  DOM.distHighRisk.style.width   = highPct + '%';

  DOM.distSafe.querySelector('.dist-label').textContent       = safePct > 8 ? `Safe ${safePct}%` : '';
  DOM.distSuspicious.querySelector('.dist-label').textContent = suspPct > 8 ? `Suspicious ${suspPct}%` : '';
  DOM.distHighRisk.querySelector('.dist-label').textContent   = highPct > 8 ? `High Risk ${highPct}%` : '';
}

/* ────────────────────────────────────────────────────────────────
   SAMPLE URLS
──────────────────────────────────────────────────────────────── */

/**
 * Load and render sample URLs from the API
 */
async function loadSampleUrls() {
  try {
    const res  = await fetch(`${API_BASE}/sample-urls`);
    const data = await res.json();
    DOM.samplesGrid.innerHTML = '';

    data.samples.forEach(sample => {
      const btn = document.createElement('button');
      btn.className = 'sample-item';

      btn.innerHTML = `
        <span class="sample-item-label">${escapeHtml(sample.label)}</span>
        <span class="sample-item-url">${escapeHtml(sample.url)}</span>
      `;

      btn.addEventListener('click', () => {
        DOM.urlInput.value = sample.url;
        closeSamplesPanel();
        analyzeUrl();
      });

      DOM.samplesGrid.appendChild(btn);
    });
  } catch {
    DOM.samplesGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:8px">Could not load samples.</p>';
  }
}

function openSamplesPanel() {
  DOM.samplesPanel.classList.add('open');
  DOM.samplesPanel.hidden = false;
  DOM.sampleToggle.textContent = 'Hide samples ↑';
  DOM.sampleToggle.setAttribute('aria-expanded', 'true');
}

function closeSamplesPanel() {
  DOM.samplesPanel.classList.remove('open');
  DOM.samplesPanel.hidden = true;
  DOM.sampleToggle.textContent = 'Try a sample ↓';
  DOM.sampleToggle.setAttribute('aria-expanded', 'false');
}

DOM.sampleToggle.addEventListener('click', () => {
  const isOpen = DOM.samplesPanel.classList.contains('open');
  if (isOpen) { closeSamplesPanel(); } else { openSamplesPanel(); }
});

/* ────────────────────────────────────────────────────────────────
   DOWNLOAD PDF REPORT
──────────────────────────────────────────────────────────────── */

/**
 * Generate a PDF report using jsPDF and trigger download
 */
function downloadReport() {
  if (!currentReport) { showToast('No report to download yet.'); return; }

  const { jsPDF } = window.jspdf;
  if (!jsPDF) { showToast('PDF library not loaded. Please refresh.'); return; }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 18;
  let y = margin;
  const pageW = 210;
  const contentW = pageW - margin * 2;

  // ── Helper ────────────────────────────────────────────────────
  const addLine = (text, size = 10, style = 'normal', color = [30, 30, 50]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text), contentW);
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += size * 0.5 + 1;
    });
    y += 1;
  };

  const addRule = (color = [220, 230, 255]) => {
    doc.setDrawColor(...color);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  // ── Header ────────────────────────────────────────────────────
  doc.setFillColor(8, 13, 20);
  doc.rect(0, 0, pageW, 40, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 200, 255);
  doc.text('PhishGuard AI', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 155, 196);
  doc.text('Phishing URL Analysis Report', margin, 26);
  doc.text(`Generated: ${formatTimestamp(currentReport.timestamp)}`, margin, 33);

  y = 50;

  // ── Risk Summary ─────────────────────────────────────────────
  const levelColors = {
    safe:        [0, 230, 118],
    suspicious:  [255, 171, 0],
    'high-risk': [255, 61, 61],
  };
  const lc = levelColors[currentReport.level] || [100, 150, 200];

  doc.setFillColor(...lc);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 20);
  doc.text(`${currentReport.classification.toUpperCase()}  —  Risk Score: ${currentReport.score}/100`, margin + 6, y + 14);
  y += 30;

  // ── URL Info ─────────────────────────────────────────────────
  addLine('URL ANALYZED', 8, 'bold', [100, 120, 160]);
  addLine(currentReport.url, 10, 'normal', [0, 180, 230]);
  addLine(`Domain: ${currentReport.domain}`, 9, 'normal', [80, 110, 150]);
  y += 4;
  addRule();

  // ── Checks ───────────────────────────────────────────────────
  addLine('SECURITY CHECKS', 11, 'bold', [30, 30, 50]);
  y += 2;

  currentReport.checks.forEach(check => {
    const icon     = check.placeholder ? '?' : (check.passed ? '✓' : '✕');
    const iconColor = check.placeholder ? [200, 150, 0] : (check.passed ? [0, 200, 100] : [230, 50, 50]);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...iconColor);
    doc.text(icon, margin, y);

    doc.setTextColor(30, 30, 50);
    doc.text(check.name, margin + 7, y);

    if (check.score > 0) {
      doc.setTextColor(200, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`+${check.score} pts`, pageW - margin - 20, y);
    }

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 90, 110);
    const detailLines = doc.splitTextToSize(check.detail, contentW - 10);
    detailLines.forEach(l => {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(l, margin + 7, y);
      y += 4.2;
    });
    y += 2;
  });

  addRule();

  // ── Recommendations ──────────────────────────────────────────
  addLine('RECOMMENDATIONS', 11, 'bold', [30, 30, 50]);
  y += 2;
  currentReport.recommendations.forEach((rec, i) => {
    addLine(`${i + 1}. ${rec}`, 9, 'normal', [60, 80, 110]);
  });

  // ── Footer ───────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 180);
    doc.text('PhishGuard AI — For educational purposes only. Not a substitute for professional security assessment.', margin, 290);
    doc.text(`Page ${i} / ${totalPages}`, pageW - margin - 20, 290);
  }

  const safeName = currentReport.domain.replace(/[^a-z0-9]/gi, '_');
  doc.save(`phishguard_report_${safeName}.pdf`);
  showToast('PDF report downloaded!');
}

/* ────────────────────────────────────────────────────────────────
   COPY RESULT
──────────────────────────────────────────────────────────────── */

/**
 * Copy a text summary of the current report to the clipboard
 */
async function copyResult() {
  if (!currentReport) { showToast('No report to copy.'); return; }

  const lines = [
    `PhishGuard AI — Analysis Report`,
    `URL: ${currentReport.url}`,
    `Domain: ${currentReport.domain}`,
    `Score: ${currentReport.score}/100`,
    `Classification: ${currentReport.classification}`,
    `Scanned: ${formatTimestamp(currentReport.timestamp)}`,
    '',
    'SECURITY CHECKS:',
    ...currentReport.checks.map(c => {
      const icon = c.placeholder ? '[?]' : (c.passed ? '[✓]' : '[✕]');
      return `${icon} ${c.name}: ${c.detail}`;
    }),
    '',
    'RECOMMENDATIONS:',
    ...currentReport.recommendations.map((r, i) => `${i + 1}. ${r}`),
  ];

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Report copied to clipboard!');
  } catch {
    showToast('Could not copy — please select the text manually.');
  }
}

/* ────────────────────────────────────────────────────────────────
   TOAST NOTIFICATION
──────────────────────────────────────────────────────────────── */

/**
 * Display a temporary toast message
 * @param {string} message
 * @param {number} duration - milliseconds (default 3000)
 */
function showToast(message, duration = 3000) {
  clearTimeout(toastTimer);
  DOM.toast.textContent = message;
  DOM.toast.hidden = false;
  // Force reflow for transition
  DOM.toast.offsetHeight;
  DOM.toast.classList.add('show');
  toastTimer = setTimeout(() => {
    DOM.toast.classList.remove('show');
    setTimeout(() => { DOM.toast.hidden = true; }, 300);
  }, duration);
}

/* ────────────────────────────────────────────────────────────────
   UTILITIES
──────────────────────────────────────────────────────────────── */

/**
 * Format an ISO timestamp for display
 * @param {string} iso - ISO 8601 timestamp
 * @param {boolean} short - If true, use short date format
 * @returns {string}
 */
function formatTimestamp(iso, short = false) {
  try {
    const d = new Date(iso);
    if (short) return d.toLocaleDateString();
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ────────────────────────────────────────────────────────────────
   EVENT LISTENERS
──────────────────────────────────────────────────────────────── */

// Analyze button click
DOM.analyzeBtn.addEventListener('click', analyzeUrl);

// Enter key in input
DOM.urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') analyzeUrl();
});

// New scan — clear results and focus input
DOM.newScanBtn.addEventListener('click', () => {
  DOM.resultsSection.hidden = true;
  DOM.urlInput.value = '';
  DOM.urlInput.focus();
  currentReport = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Download report
DOM.downloadBtn.addEventListener('click', downloadReport);

// Copy result
DOM.copyResultBtn.addEventListener('click', copyResult);

// Clear history
DOM.clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
  showToast('History cleared.');
});

// Input validation feedback — auto-add http if needed on blur
DOM.urlInput.addEventListener('blur', () => {
  const val = DOM.urlInput.value.trim();
  if (val && !/^https?:\/\//i.test(val)) {
    // Don't auto-correct — the backend handles it — just show hint
  }
});

/* ────────────────────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────────────────────── */

/**
 * Application initialization
 */
async function init() {
  // Load sample URLs in the background
  await loadSampleUrls();

  // Initialize the first view
  switchView('scanner');

  // Focus input on load
  setTimeout(() => DOM.urlInput.focus(), 100);

  console.log('%c⬡ PhishGuard AI loaded', 'color:#00c8ff;font-weight:bold;font-size:14px');
}

// Start the app
init();
