const fmt = new Intl.NumberFormat();
const timeFmt = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const $ = (id) => document.getElementById(id);

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatTime(ts) {
  return timeFmt.format(new Date(ts * 1000));
}

function endpointText(row) {
  const port = row.dst_port || row.src_port;
  return port ? `${row.dst_ip}:${port}` : row.dst_ip;
}

function renderStats(stats) {
  $("totalPackets").textContent = fmt.format(stats.total_packets || 0);
  $("packetsPerMinute").textContent = fmt.format(stats.packets_per_minute || 0);
  $("alertsHour").textContent = fmt.format(stats.total_alerts_hour || 0);
  $("blockedCount").textContent = fmt.format(stats.active_blocks || 0);
  $("aiRisk").textContent = fmt.format(stats.max_ai_risk || 0);
  $("aiInsights").textContent = `${fmt.format(stats.ai_insights_hour || 0)} insights`;
  $("bytesPerMinute").textContent = `${formatBytes(stats.bytes_per_minute || 0)}/min`;
  $("uniqueSources").textContent = `${fmt.format(stats.unique_sources || 0)} sources`;
  $("criticalAlerts").textContent = `${fmt.format(stats.critical_alerts_hour || 0)} critical`;
  $("monitorStatus").textContent = stats.monitor_status || "unknown";
  $("captureMode").textContent = stats.capture_mode || "simulation";
  $("aiMode").textContent = `ai: ${stats.ai_mode || "learning"}`;
  $("firewallStatus").textContent = stats.firewall_blocking_enabled ? "firewall enabled" : "dry-run blocking";
  renderProtocolBars(stats.protocols || []);
  renderTimeline(stats.timeline || []);
}

function renderProtocolBars(protocols) {
  const max = Math.max(1, ...protocols.map((item) => item.count));
  $("protocolBars").innerHTML = protocols.length
    ? protocols
        .map(
          (item) => `
            <div class="bar-row">
              <strong>${item.protocol}</strong>
              <span class="bar-track"><span class="bar-fill" style="width:${(item.count / max) * 100}%"></span></span>
              <span>${fmt.format(item.count)}</span>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">No protocol data yet</div>`;
}

function renderTimeline(points) {
  const canvas = $("timeline");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, rect.width * ratio);
  canvas.height = 260 * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  ctx.clearRect(0, 0, width, height);

  const pad = 28;
  const max = Math.max(1, ...points.map((p) => p.packets));
  ctx.strokeStyle = "#d9e1dd";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = pad + ((height - pad * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }
  if (!points.length) return;

  ctx.strokeStyle = "#0f8b8d";
  ctx.fillStyle = "rgba(15, 139, 141, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = pad + ((width - pad * 2) / Math.max(1, points.length - 1)) * index;
    const y = height - pad - (point.packets / max) * (height - pad * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(pad, height - pad);
  ctx.closePath();
  ctx.fill();
}

function renderAlerts(alerts) {
  $("alertsTable").innerHTML = alerts.length
    ? alerts
        .map(
          (row) => `
            <tr>
              <td>${formatTime(row.timestamp)}</td>
              <td><span class="pill ${row.severity}">${row.severity}</span></td>
              <td>${row.alert_type}</td>
              <td>${row.src_ip}</td>
              <td>${row.evidence}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="5" class="empty">No alerts yet</td></tr>`;
}

function renderPackets(packets) {
  $("packetsTable").innerHTML = packets.length
    ? packets
        .map(
          (row) => `
            <tr>
              <td>${formatTime(row.timestamp)}</td>
              <td>${row.protocol}</td>
              <td>${row.src_port ? `${row.src_ip}:${row.src_port}` : row.src_ip}</td>
              <td>${endpointText(row)}</td>
              <td>${formatBytes(row.size)}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="5" class="empty">Waiting for packets</td></tr>`;
}

function renderBlocked(blocked) {
  $("blockedList").innerHTML = blocked.length
    ? blocked
        .map(
          (row) => `
            <div class="blocked-item">
              <div>
                <strong>${row.ip}</strong>
                <span>${row.firewall_status} · ${row.reason}</span>
              </div>
              <button title="Remove block" aria-label="Remove block" data-ip="${row.ip}">×</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">No blocked addresses</div>`;

  document.querySelectorAll("[data-ip]").forEach((button) => {
    button.addEventListener("click", async () => {
      await fetch(`/api/block/${button.dataset.ip}`, { method: "DELETE" });
      await refresh();
    });
  });
}

function renderAI(insights) {
  $("aiList").innerHTML = insights.length
    ? insights
        .map(
          (row) => `
            <div class="ai-item">
              <strong>
                <span>${row.src_ip}</span>
                <span>${row.risk_score}/100</span>
              </strong>
              <p>${row.label} · ${row.summary}</p>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">AI model is learning recent traffic</div>`;
}

function render(payload) {
  renderStats(payload.stats || {});
  renderPackets(payload.packets || []);
  renderAlerts(payload.alerts || []);
  renderAI(payload.ai || []);
  renderBlocked(payload.blocked || []);
}

async function refresh() {
  const [stats, packets, alerts, ai, blocked] = await Promise.all([
    fetch("/api/stats").then((r) => r.json()),
    fetch("/api/packets?limit=40").then((r) => r.json()),
    fetch("/api/alerts?limit=30").then((r) => r.json()),
    fetch("/api/ai?limit=20").then((r) => r.json()),
    fetch("/api/blocked").then((r) => r.json()),
  ]);
  render({ stats, packets, alerts, ai, blocked });
}

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);
  ws.onmessage = (event) => render(JSON.parse(event.data));
  ws.onclose = () => setTimeout(connect, 1500);
}

$("refreshBtn").addEventListener("click", refresh);
window.addEventListener("resize", refresh);
refresh();
connect();
