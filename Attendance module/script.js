/* ============================================================
   Student Hub — Dashboard Script  (with Productivity Analytics)
   File: script.js  (dashboard folder)
   ============================================================ */

(function () {
  'use strict';

  /* ── Live Date ─────────────────────────────────────────── */
  const heroDate = document.getElementById('heroDate');
  if (heroDate) {
    heroDate.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  /* ── Sidebar toggle ────────────────────────────────────── */
  const sidebarToggle  = document.getElementById('sidebarToggle');
  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
    sidebarOverlay.removeAttribute('aria-hidden');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
    sidebarOverlay.setAttribute('aria-hidden', 'true');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  sidebarToggle  && sidebarToggle.addEventListener('click',  () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  sidebarOverlay && sidebarOverlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });
  document.querySelectorAll('.nav-item').forEach(l => l.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); }));

  /* ── Active nav ────────────────────────────────────────── */
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      if (!link.getAttribute('href') || link.getAttribute('href') === '#') e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(l => { l.classList.remove('active'); l.removeAttribute('aria-current'); });
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    });
  });

  /* ── Notification dropdown ─────────────────────────────── */
  const notifBtn      = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const clearNotif    = document.getElementById('clearNotif');
  const notifBadge    = document.querySelector('.notif-badge');

  function closeProfileDropdown() {
    if (profileDropdown) { profileDropdown.hidden = true; profileBtn && profileBtn.setAttribute('aria-expanded', 'false'); }
  }

  notifBtn && notifBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !notifDropdown.hidden;
    notifDropdown.hidden = isOpen;
    notifBtn.setAttribute('aria-expanded', String(!isOpen));
    closeProfileDropdown();
  });
  clearNotif && clearNotif.addEventListener('click', () => {
    document.querySelectorAll('.notif-item').forEach(i => i.classList.remove('unread'));
    document.querySelectorAll('.notif-dot').forEach(d => d.style.background = 'transparent');
    if (notifBadge) notifBadge.style.display = 'none';
  });

  /* ── Profile dropdown ──────────────────────────────────── */
  const profileBtn      = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');

  profileBtn && profileBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !profileDropdown.hidden;
    profileDropdown.hidden = isOpen;
    profileBtn.setAttribute('aria-expanded', String(!isOpen));
    if (notifDropdown) { notifDropdown.hidden = true; notifBtn && notifBtn.setAttribute('aria-expanded', 'false'); }
  });

  document.addEventListener('click', () => {
    if (notifDropdown)   notifDropdown.hidden   = true;
    if (profileDropdown) profileDropdown.hidden = true;
    if (notifBtn)    notifBtn.setAttribute('aria-expanded', 'false');
    if (profileBtn)  profileBtn.setAttribute('aria-expanded', 'false');
  });
  [notifDropdown, profileDropdown].forEach(el => el && el.addEventListener('click', e => e.stopPropagation()));

  /* ── KPI counter animation ─────────────────────────────── */
  function animateCounter(el, target, duration = 1400) {
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function animateBars() {
    document.querySelectorAll('.kpi-bar__fill[data-width]').forEach(bar => setTimeout(() => bar.style.width = bar.dataset.width + '%', 200));
    document.querySelectorAll('.kpi-value[data-target]').forEach(el => animateCounter(el, parseInt(el.dataset.target, 10)));
  }
  function animateProjectBars() {
    document.querySelectorAll('.project-progress-fill[data-width]').forEach(bar => setTimeout(() => bar.style.width = bar.dataset.width + '%', 400));
  }

  const kpiSection = document.querySelector('.kpi-grid');
  if (kpiSection && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { animateBars(); animateProjectBars(); obs.unobserve(entry.target); } });
    }, { threshold: 0.15 });
    obs.observe(kpiSection);
  } else { animateBars(); animateProjectBars(); }

  /* ── Daily Activity bar chart (custom, no lib) ─────────── */
  const weekData  = [
    { day: 'Mon', val: 75 }, { day: 'Tue', val: 88 }, { day: 'Wed', val: 62 },
    { day: 'Thu', val: 95 }, { day: 'Fri', val: 80 }, { day: 'Sat', val: 55 }, { day: 'Sun', val: 72 },
  ];
  const monthData = [{ day: 'W1', val: 82 }, { day: 'W2', val: 71 }, { day: 'W3', val: 90 }, { day: 'W4', val: 85 }];
  const todayIdx  = new Date().getDay();
  const weekdayMap = [6, 0, 1, 2, 3, 4, 5];

  function renderActivityChart(data, todayIndex) {
    const barsEl   = document.getElementById('barChart');
    const labelsEl = document.getElementById('barLabels');
    if (!barsEl || !labelsEl) return;
    const maxVal = Math.max(...data.map(d => d.val));
    barsEl.innerHTML = data.map((d, i) => `
      <div class="bar-wrap">
        <span class="bar-val">${d.val}%</span>
        <div class="bar ${i === todayIndex ? 'today' : ''}" style="height:0%" data-h="${(d.val/maxVal)*100}" aria-label="${d.day}: ${d.val}%"></div>
      </div>`).join('');
    labelsEl.innerHTML = data.map((d, i) => `<span class="bar-label ${i === todayIndex ? 'today' : ''}">${d.day}</span>`).join('');
    setTimeout(() => {
      barsEl.querySelectorAll('.bar').forEach(bar => { bar.style.transition = 'height 0.9s cubic-bezier(0.4,0,0.2,1), background 0.2s'; bar.style.height = bar.dataset.h + '%'; });
    }, 100);
  }
  renderActivityChart(weekData, weekdayMap[todayIdx] ?? 0);
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.dataset.period === 'week' ? renderActivityChart(weekData, weekdayMap[todayIdx] ?? 0) : renderActivityChart(monthData, 3);
    });
  });

  /* ── Task check ────────────────────────────────────────── */
  document.querySelectorAll('.task-check:not(.task-check--done)').forEach(btn => {
    btn.addEventListener('click', function () {
      const item   = this.closest('.task-item');
      const nameEl = item.querySelector('.task-name');
      const tagEl  = item.querySelector('.task-tag');
      this.classList.add('task-check--done');
      this.style.cssText = 'background:var(--emerald);border-color:var(--emerald);color:#fff;';
      nameEl && nameEl.classList.add('task-name--done');
      if (tagEl) { tagEl.textContent = 'Done'; tagEl.className = 'task-tag task-tag--green'; }
      this.setAttribute('aria-label', `Completed: ${nameEl ? nameEl.textContent : 'task'}`);
      const kpiVal = document.querySelector('.kpi-card--emerald .kpi-value');
      if (kpiVal) kpiVal.textContent = parseInt(kpiVal.textContent, 10) + 1;
    });
  });

  /* ── ⌘K search ─────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('globalSearch')?.focus();
    }
  });

  /* ── Upgrade button ─────────────────────────────────────── */
  document.querySelector('.upgrade-btn')?.addEventListener('click', () => showToast('🚀 Pro plan coming soon! Stay tuned.', 2800));

  /* ── Toast ──────────────────────────────────────────────── */
  let toastEl = null, toastTimer = null;
  function showToast(msg, duration = 3000) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(16px);background:#0F172A;color:#fff;font-size:0.85rem;font-weight:500;font-family:Inter,sans-serif;padding:11px 20px;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.18);opacity:0;pointer-events:none;z-index:9999;transition:opacity 0.25s ease,transform 0.25s ease;text-align:center;white-space:nowrap;';
      document.body.appendChild(toastEl);
    }
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateX(-50%) translateY(0)';
    toastEl.style.pointerEvents = 'auto';
    toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; toastEl.style.transform = 'translateX(-50%) translateY(16px)'; toastEl.style.pointerEvents = 'none'; }, duration);
  }

  /* ════════════════════════════════════════════════════════
     PRODUCTIVITY ANALYTICS — Chart.js
  ════════════════════════════════════════════════════════ */

  /* ── Data ──────────────────────────────────────────────── */
  const productivityData = {
    weekly: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
      scores: [65, 72, 78, 84, 89],
      target:  85,
    },
    monthly: {
      labels: ['January', 'February', 'March', 'April', 'May'],
      scores: [61, 68, 74, 81, 89],
      target:  80,
    }
  };

  /* ── Shared Chart.js defaults ──────────────────────────── */
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color       = '#94A3B8';

  /* ── Colour palette ─────────────────────────────────────── */
  const C = {
    primary:    '#6366F1',
    secondary:  '#8B5CF6',
    emerald:    '#10B981',
    amber:      '#F59E0B',
    primaryRgb: '99,102,241',
    secondaryRgb: '139,92,246',
    emeraldRgb: '16,185,129',
    amberRgb:   '245,158,11',
    gridLine:   'rgba(226,232,240,0.8)',
    text3:      '#64748B',
  };

  /* helper: create vertical gradient */
  function vGrad(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0,   top);
    g.addColorStop(1,   bottom);
    return g;
  }

  /* ── LINE CHART ────────────────────────────────────────── */
  let lineChart = null;

  function buildLineChart(dataset) {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    const grad = ctx.getContext('2d');

    const areaGrad = grad.createLinearGradient(0, 0, 0, 220);
    areaGrad.addColorStop(0,   `rgba(${C.primaryRgb}, 0.22)`);
    areaGrad.addColorStop(0.6, `rgba(${C.primaryRgb}, 0.05)`);
    areaGrad.addColorStop(1,   `rgba(${C.primaryRgb}, 0)`);

    if (lineChart) lineChart.destroy();

    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataset.labels,
        datasets: [
          {
            label: 'Productivity Score',
            data: dataset.scores,
            borderColor: C.primary,
            backgroundColor: areaGrad,
            borderWidth: 2.5,
            pointBackgroundColor: C.primary,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: C.primary,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.42,
          },
          {
            label: `Target (${dataset.target})`,
            data: Array(dataset.labels.length).fill(dataset.target),
            borderColor: `rgba(${C.primaryRgb}, 0.35)`,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: false,  /* we use custom HTML legend */
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            callbacks: {
              label: ctx => {
                if (ctx.datasetIndex === 1) return ` Target: ${ctx.parsed.y}`;
                return ` Score: ${ctx.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: C.gridLine, drawBorder: false },
            ticks: { font: { size: 11, weight: '500' }, color: C.text3, padding: 6 },
            border: { display: false }
          },
          y: {
            min: 50,
            max: 100,
            grid: { color: C.gridLine, drawBorder: false },
            ticks: {
              font: { size: 11 },
              color: C.text3,
              padding: 8,
              stepSize: 10,
              callback: v => v
            },
            border: { display: false }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });
  }

  /* ── BAR CHART ─────────────────────────────────────────── */
  let barChartPro = null;

  function buildBarChart(dataset) {
    const ctx = document.getElementById('barChartPro');
    if (!ctx) return;

    const rawCtx = ctx.getContext('2d');
    const avg    = Math.round(dataset.scores.reduce((a, b) => a + b, 0) / dataset.scores.length * 10) / 10;

    /* Per-bar gradient colours */
    const barGrads = dataset.scores.map((_, i) => {
      const t = i / (dataset.scores.length - 1);
      return vGrad(rawCtx,
        `rgba(${C.primaryRgb}, ${0.85 + t * 0.15})`,
        `rgba(${C.secondaryRgb}, ${0.7 + t * 0.2})`
      );
    });

    if (barChartPro) barChartPro.destroy();

    barChartPro = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dataset.labels,
        datasets: [
          {
            label: 'Weekly Score',
            data: dataset.scores,
            backgroundColor: barGrads,
            borderColor: 'transparent',
            borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 3, bottomRight: 3 },
            borderSkipped: false,
            hoverBackgroundColor: barGrads.map(() => `rgba(${C.primaryRgb}, 0.95)`),
            barPercentage: 0.55,
            categoryPercentage: 0.75,
          },
          {
            label: 'Average',
            data: Array(dataset.labels.length).fill(avg),
            type: 'line',
            borderColor: C.amber,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
            fill: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: 'rgba(99,102,241,0.3)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: ctx => {
                if (ctx.dataset.type === 'line') return ` Avg: ${ctx.parsed.y}`;
                return ` Score: ${ctx.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: '500' }, color: C.text3, padding: 6 },
            border: { display: false }
          },
          y: {
            min: 40,
            max: 100,
            grid: { color: C.gridLine, drawBorder: false },
            ticks: { font: { size: 11 }, color: C.text3, padding: 8, stepSize: 10 },
            border: { display: false }
          }
        },
        animation: {
          duration: 1000,
          delay: ctx => ctx.dataIndex * 80,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  /* ── Update trend summary cards ──────────────────────────── */
  function updateTrendCards(dataset) {
    const scores   = dataset.scores;
    const latest   = scores[scores.length - 1];
    const avg      = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const growth   = (((latest - scores[0]) / scores[0]) * 100).toFixed(1);
    const allUp    = scores.every((v, i) => i === 0 || v >= scores[i - 1]);
    const consistency = allUp ? 'High' : scores.filter((v, i) => i > 0 && v < scores[i-1]).length <= 1 ? 'Good' : 'Fair';

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal('trendLatest',      latest);
    setVal('trendAvg',         avg);
    setVal('trendGrowth',      `+${growth}`);
    setVal('trendConsistency', consistency);
  }

  /* ── Period tab switching ────────────────────────────────── */
  document.querySelectorAll('.period-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const period  = btn.dataset.period;
      const dataset = period === 'monthly' ? productivityData.monthly : productivityData.weekly;

      buildLineChart(dataset);
      buildBarChart(dataset);
      updateTrendCards(dataset);

      /* Update bar chart sub-label */
      const barSub = document.querySelector('#barChartSection .chart-card-pro__sub');
      if (barSub) barSub.textContent = period === 'monthly' ? 'Month-by-month breakdown' : 'Week-by-week breakdown for May';
      const lineSub = document.querySelector('#lineChartSection .chart-card-pro__sub');
      if (lineSub) lineSub.textContent = period === 'monthly' ? 'Score progression across 5 months' : 'Score progression across 5 weeks';
    });
  });

  /* ── Init charts via IntersectionObserver ────────────────── */
  const analyticsSection = document.getElementById('productivity-section');

  function initCharts() {
    const dataset = productivityData.weekly;
    buildLineChart(dataset);
    buildBarChart(dataset);
    updateTrendCards(dataset);
  }

  if (analyticsSection && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          initCharts();
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    obs.observe(analyticsSection);
  } else {
    /* Fallback: small delay so Chart.js canvas is ready */
    setTimeout(initCharts, 200);
  }

  /* ── Resize: redraw charts ───────────────────────────────── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const activePeriod = document.querySelector('.period-tab.active')?.dataset.period || 'weekly';
      const dataset = activePeriod === 'monthly' ? productivityData.monthly : productivityData.weekly;
      if (lineChart)    { lineChart.resize();    }
      if (barChartPro)  { barChartPro.resize();  }
      // Rebuild grads after resize (canvas size changed)
      buildBarChart(dataset);
    }, 250);
  });


  /* ════════════════════════════════════════════════════════
     ATTENDANCE MODULE
  ════════════════════════════════════════════════════════ */

  /* ── Dataset ────────────────────────────────────────────── */
  const attendanceRecords = [
    { date: '10 Jun 2025', day: 'Tuesday',   subject: 'UI/UX Design',    time: '09:00 AM', status: 'present', remarks: 'On time'          },
    { date: '11 Jun 2025', day: 'Wednesday', subject: 'React.js',        time: '10:30 AM', status: 'present', remarks: 'On time'          },
    { date: '12 Jun 2025', day: 'Thursday',  subject: 'DSA',             time: '—',        status: 'absent',  remarks: 'Medical leave'    },
    { date: '13 Jun 2025', day: 'Friday',    subject: 'UI/UX Design',    time: '09:05 AM', status: 'present', remarks: 'On time'          },
    { date: '14 Jun 2025', day: 'Saturday',  subject: 'React.js',        time: '10:45 AM', status: 'late',    remarks: 'Traffic delay'    },
    { date: '16 Jun 2025', day: 'Monday',    subject: 'DSA',             time: '09:00 AM', status: 'present', remarks: 'On time'          },
    { date: '17 Jun 2025', day: 'Tuesday',   subject: 'Machine Learning', time: '11:00 AM', status: 'present', remarks: 'On time'         },
    { date: '18 Jun 2025', day: 'Wednesday', subject: 'React.js',        time: '—',        status: 'absent',  remarks: 'No reason given'  },
    { date: '19 Jun 2025', day: 'Thursday',  subject: 'Machine Learning', time: '11:10 AM', status: 'late',    remarks: 'Woke up late'   },
    { date: '20 Jun 2025', day: 'Friday',    subject: 'UI/UX Design',    time: '09:00 AM', status: 'present', remarks: 'On time'          },
    { date: '23 Jun 2025', day: 'Monday',    subject: 'DSA',             time: '09:00 AM', status: 'present', remarks: 'On time'          },
    { date: '24 Jun 2025', day: 'Tuesday',   subject: 'React.js',        time: '10:30 AM', status: 'present', remarks: 'On time'          },
    { date: '25 Jun 2025', day: 'Wednesday', subject: 'Machine Learning', time: '11:00 AM', status: 'present', remarks: 'On time'         },
    { date: '26 Jun 2025', day: 'Thursday',  subject: 'UI/UX Design',    time: '09:00 AM', status: 'present', remarks: 'On time'          },
    { date: '27 Jun 2025', day: 'Friday',    subject: 'DSA',             time: '—',        status: 'absent',  remarks: 'Personal reason'  },
  ];

  /* ── State ──────────────────────────────────────────────── */
  let attnFilter    = 'all';
  let attnQuery     = '';
  let attnSortCol   = 'date';
  let attnSortDir   = 'asc';
  let attnPage      = 1;
  const ROWS_PER_PAGE = 8;

  /* ── Derived stats ──────────────────────────────────────── */
  function computeStats(records) {
    const total   = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent  = records.filter(r => r.status === 'absent').length;
    const late    = records.filter(r => r.status === 'late').length;
    const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    // current streak (consecutive present/late from end)
    let streak = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].status === 'present' || records[i].status === 'late') streak++;
      else break;
    }
    return { total, present, absent, late, pct, streak };
  }

  /* ── Animate counter ────────────────────────────────────── */
  function animateAttnCounter(el, target, suffix = '', isFloat = false, duration = 900) {
    if (!el) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const val      = isFloat
        ? (target * eased).toFixed(1)
        : Math.round(target * eased);
      el.textContent = val + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ── Render circular ring ───────────────────────────────── */
  function renderRing(pct, absentPct) {
    const CIRCUMFERENCE = 314.16; // 2π × 50
    const primaryEl = document.getElementById('ringFillPrimary');
    const absentEl  = document.getElementById('ringFillAbsent');
    const pctEl     = document.getElementById('ringPct');
    const badgeEl   = document.getElementById('attnStatusBadge');
    const badgeText = document.getElementById('attnStatusText');

    if (!primaryEl || !absentEl || !pctEl) return;

    // After a short delay so transition fires
    setTimeout(() => {
      primaryEl.style.strokeDashoffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
      absentEl.style.strokeDashoffset  = CIRCUMFERENCE - (absentPct / 100) * CIRCUMFERENCE;
    }, 200);

    animateAttnCounter(pctEl, pct, '%');

    // Status badge
    if (badgeEl && badgeText) {
      if (pct >= 90) {
        badgeEl.className  = 'attn-status-badge';
        badgeText.textContent = 'Excellent standing';
      } else if (pct >= 75) {
        badgeEl.className  = 'attn-status-badge warn';
        badgeText.textContent = 'Satisfactory standing';
      } else {
        badgeEl.className  = 'attn-status-badge danger';
        badgeText.textContent = 'Below requirement';
      }
    }
  }

  /* ── Render stat cards ──────────────────────────────────── */
  function renderStats(stats) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    animateAttnCounter(document.getElementById('statTotal'),   stats.total);
    animateAttnCounter(document.getElementById('statPresent'), stats.present);
    animateAttnCounter(document.getElementById('statAbsent'),  stats.absent);
    set('statPct',    stats.pct + '%');
    animateAttnCounter(document.getElementById('statLate'),    stats.late);
    set('statStreak', stats.streak + (stats.streak === 1 ? ' day' : ' days'));
  }

  /* ── Build filtered + sorted data ──────────────────────── */
  function getFilteredData() {
    let data = [...attendanceRecords];

    // filter by status tab
    if (attnFilter !== 'all') data = data.filter(r => r.status === attnFilter);

    // search
    if (attnQuery.trim()) {
      const q = attnQuery.toLowerCase();
      data = data.filter(r =>
        r.date.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q)
      );
    }

    // sort
    data.sort((a, b) => {
      let va = a[attnSortCol] ?? '';
      let vb = b[attnSortCol] ?? '';
      if (attnSortCol === 'sno') { va = attendanceRecords.indexOf(a); vb = attendanceRecords.indexOf(b); }
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return attnSortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }

  /* ── Status badge HTML ──────────────────────────────────── */
  function statusBadgeHTML(status) {
    const map = {
      present: { label: 'Present', cls: 'attn-status--present' },
      absent:  { label: 'Absent',  cls: 'attn-status--absent'  },
      late:    { label: 'Late',    cls: 'attn-status--late'    },
    };
    const s = map[status] || map.absent;
    return `<span class="attn-status ${s.cls}">
      <span class="attn-status__dot" aria-hidden="true"></span>${s.label}
    </span>`;
  }

  /* ── Render table rows ──────────────────────────────────── */
  function renderTable() {
    const tbody    = document.getElementById('attnTableBody');
    const emptyEl  = document.getElementById('attnEmpty');
    if (!tbody) return;

    const filtered = getFilteredData();
    const total    = filtered.length;
    const pages    = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
    if (attnPage > pages) attnPage = pages;
    const start    = (attnPage - 1) * ROWS_PER_PAGE;
    const slice    = filtered.slice(start, start + ROWS_PER_PAGE);

    if (total === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      tbody.innerHTML = slice.map((r, i) => {
        const globalIdx = attendanceRecords.indexOf(r) + 1;
        return `<tr class="attn-tr attn-tr--${r.status}" style="animation-delay:${i * 35}ms">
          <td class="attn-td attn-td--sno">${globalIdx}</td>
          <td class="attn-td attn-td--date">
            ${r.date}
            <span class="attn-td--date-day">${r.day}</span>
          </td>
          <td class="attn-td">
            <span class="attn-subject-pill">${r.subject}</span>
          </td>
          <td class="attn-td">${r.time}</td>
          <td class="attn-td">${statusBadgeHTML(r.status)}</td>
          <td class="attn-td attn-td--remarks">${r.remarks}</td>
        </tr>`;
      }).join('');
    }

    renderPagination(total, pages);
    renderPageInfo(start, Math.min(start + ROWS_PER_PAGE, total), total);
  }

  /* ── Render pagination ──────────────────────────────────── */
  function renderPagination(total, pages) {
    const container = document.getElementById('attnPageNumbers');
    const prevBtn   = document.getElementById('attnPrevBtn');
    const nextBtn   = document.getElementById('attnNextBtn');
    if (!container) return;

    prevBtn && (prevBtn.disabled = attnPage === 1);
    nextBtn && (nextBtn.disabled = attnPage === pages);

    // Show max 5 page buttons
    const range = [];
    let from = Math.max(1, attnPage - 2);
    let to   = Math.min(pages, from + 4);
    from = Math.max(1, to - 4);
    for (let i = from; i <= to; i++) range.push(i);

    container.innerHTML = range.map(p =>
      `<button class="attn-page-number ${p === attnPage ? 'active' : ''}" data-pg="${p}" type="button">${p}</button>`
    ).join('');

    container.querySelectorAll('.attn-page-number').forEach(btn => {
      btn.addEventListener('click', () => { attnPage = parseInt(btn.dataset.pg, 10); renderTable(); });
    });
  }

  function renderPageInfo(from, to, total) {
    const el = document.getElementById('attnPageInfo');
    if (el) el.textContent = total > 0 ? `Showing ${from + 1}–${to} of ${total} records` : 'No records';
  }

  /* ── Sort columns ───────────────────────────────────────── */
  document.querySelectorAll('.attn-th--sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (attnSortCol === col) {
        attnSortDir = attnSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        attnSortCol = col;
        attnSortDir = 'asc';
      }
      // Update aria + classes
      document.querySelectorAll('.attn-th--sortable').forEach(h => {
        h.classList.remove('attn-th--sort-asc', 'attn-th--sort-desc');
        h.setAttribute('aria-sort', 'none');
      });
      th.classList.add(attnSortDir === 'asc' ? 'attn-th--sort-asc' : 'attn-th--sort-desc');
      th.setAttribute('aria-sort', attnSortDir === 'asc' ? 'ascending' : 'descending');
      attnPage = 1;
      renderTable();
    });
  });

  /* ── Filter tabs ─────────────────────────────────────────── */
  document.querySelectorAll('.attn-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.attn-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      attnFilter = btn.dataset.filter;
      attnPage   = 1;
      renderTable();
    });
  });

  /* ── Search ─────────────────────────────────────────────── */
  const attnSearchInput = document.getElementById('attnSearch');
  let attnSearchDebounce;
  attnSearchInput && attnSearchInput.addEventListener('input', () => {
    clearTimeout(attnSearchDebounce);
    attnSearchDebounce = setTimeout(() => {
      attnQuery = attnSearchInput.value;
      attnPage  = 1;
      renderTable();
    }, 250);
  });

  /* ── Prev / Next buttons ─────────────────────────────────── */
  document.getElementById('attnPrevBtn')?.addEventListener('click', () => { if (attnPage > 1) { attnPage--; renderTable(); } });
  document.getElementById('attnNextBtn')?.addEventListener('click', () => {
    const pages = Math.ceil(getFilteredData().length / ROWS_PER_PAGE);
    if (attnPage < pages) { attnPage++; renderTable(); }
  });

  /* ── Export CSV ──────────────────────────────────────────── */
  document.getElementById('attnExportBtn')?.addEventListener('click', () => {
    const data = getFilteredData();
    const header = ['#', 'Date', 'Day', 'Subject', 'Time', 'Status', 'Remarks'];
    const rows = data.map((r, i) => [i + 1, r.date, r.day, r.subject, r.time, r.status, r.remarks]);
    const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'attendance_report.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Attendance data exported as CSV!', 2600);
  });

  /* ── Init attendance module via IntersectionObserver ──────── */
  const attnSection = document.getElementById('attendance-section');
  let attnInited    = false;

  function initAttendance() {
    if (attnInited) return;
    attnInited = true;
    const stats = computeStats(attendanceRecords);
    renderStats(stats);
    renderRing(stats.pct, Math.round((stats.absent / stats.total) * 100));
    renderTable();
  }

  if (attnSection && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { initAttendance(); obs.unobserve(entry.target); } });
    }, { threshold: 0.05 });
    obs.observe(attnSection);
  } else {
    setTimeout(initAttendance, 300);
  }

})();