const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'events.json');

const CAMPAIGNS = ['ms-login', 'qr-otp', 'exe'];
const TYPES = ['page_view', 'credential_submit', 'otp_submit', 'exe_run'];

if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function readEvents() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function appendEvent(event) {
  const events = readEvents();
  events.push(event);
  fs.writeFileSync(DATA_FILE, JSON.stringify(events));
}

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/event', (req, res) => {
  const { campaign, type } = req.body || {};
  if (!CAMPAIGNS.includes(campaign) || !TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: 'invalid campaign or type' });
  }
  appendEvent({
    campaign,
    type,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent') || ''
  });
  res.json({ ok: true });
});

app.post('/api/reset', (req, res) => {
  const key = req.get('x-reset-key') || req.query.key;
  if (key !== (process.env.RESET_KEY || 'reset-me')) {
    return res.status(403).json({ ok: false, error: 'invalid key' });
  }
  fs.writeFileSync(DATA_FILE, '[]');
  res.json({ ok: true });
});

app.get('/api/stats', (req, res) => {
  const events = readEvents();
  const stats = {};
  CAMPAIGNS.forEach(c => {
    stats[c] = {};
    TYPES.forEach(t => { stats[c][t] = 0; });
  });
  events.forEach(e => {
    if (stats[e.campaign] && e.type in stats[e.campaign]) stats[e.campaign][e.type]++;
  });
  const recent = events.slice(-25).reverse();
  res.json({ totalEvents: events.length, stats, recent });
});

app.listen(PORT, () => console.log(`Phishing awareness dashboard running on port ${PORT}`));
