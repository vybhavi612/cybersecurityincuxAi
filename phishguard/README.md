# ⬡ PhishGuard AI

**Phishing URL Detection Web Application**  
A cybersecurity tool that analyzes URLs for phishing indicators and generates detailed risk reports.

---

## 📁 Project Structure

```
phishguard/
├── server.js                  # Express.js entry point
├── package.json
├── README.md
├── routes/
│   └── analyze.js             # /api/analyze and /api/sample-urls
├── utils/
│   └── analyzer.js            # Core analysis engine (8 checks)
└── public/
    ├── index.html             # Single-page application
    ├── css/
    │   └── style.css          # Dark cybersecurity theme
    └── js/
        └── app.js             # Frontend logic
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16 or higher
- npm v8 or higher

### Installation

```bash
# 1. Navigate to project directory
cd phishguard

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Open your browser and visit: **http://localhost:3000**

### Development mode (auto-restart on changes)
```bash
npm run dev
```

---

## 🔍 How It Works

PhishGuard AI runs 8 automated security checks on any submitted URL:

| Check | Description | Risk Points |
|-------|-------------|-------------|
| URL Length | Flags URLs longer than 75 characters | +15 |
| IP Address | Detects raw IP addresses instead of domains | +25 |
| Suspicious Keywords | login, verify, update, secure, account, banking, etc. | +10 |
| Excessive Subdomains | Flags subdomain depth > 3 levels | +15 |
| HTTPS Validation | Flags non-HTTPS URLs | +20 |
| URL Shortener | Detects bit.ly, tinyurl, t.co, etc. | +20 |
| Special Characters | Detects @ symbols, excessive dots, % encoding abuse | +15 |
| Domain Reputation | Placeholder for Google Safe Browsing / PhishTank API | — |

### Risk Classification
| Score | Classification |
|-------|---------------|
| 0 – 29 | ✅ Safe |
| 30 – 59 | ⚠️ Suspicious |
| 60 – 100 | 🚨 High Risk |

---

## 🧪 Sample Test URLs

These are included in the app under "Try a sample":

```
# Safe
https://www.google.com
https://github.com/features

# Suspicious  
http://secure-login.example.com/account/verify
https://bit.ly/3xAmPl3

# High Risk
http://192.168.1.1/login/banking/authenticate
http://login.verify.secure.bank.paypal.attacker.com/update/password
http://legitbank.com@192.168.10.1/signin/account
http://www.update-your-account-information-secure-login-verify-paypal-banking.com/auth/verify
```

---

## 🔌 API Endpoints

### `POST /api/analyze`
Submit a URL for analysis.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "url": "https://example.com",
    "domain": "example.com",
    "score": 0,
    "classification": "Safe",
    "level": "safe",
    "checks": [...],
    "recommendations": [...],
    "summary": { "total": 7, "passed": 7, "failed": 0, "pending": 1 }
  }
}
```

### `GET /api/sample-urls`
Returns the list of demonstration URLs.

### `GET /api/health`
Returns server health status.

---

## 🔗 Integrating Real Threat Intelligence APIs

The **Domain Reputation** check is a placeholder ready for live API integration.

Open `utils/analyzer.js` and replace the body of `checkDomainReputation()`:

### Google Safe Browsing
```javascript
const API_KEY = 'YOUR_GOOGLE_SAFE_BROWSING_API_KEY';
const response = await fetch(
  `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: { clientId: 'phishguard', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    }),
  }
);
const data = await response.json();
const isThreat = data.matches && data.matches.length > 0;
```

### PhishTank
```javascript
const APP_KEY = 'YOUR_PHISHTANK_APP_KEY';
const encoded = Buffer.from(url).toString('base64');
const response = await fetch('https://checkurl.phishtank.com/checkurl/', {
  method: 'POST',
  body: new URLSearchParams({ url: encoded, format: 'json', app_key: APP_KEY }),
});
```

---

## ✨ Features

- **Dark cybersecurity UI** with animated grid background and scan effects
- **8 automated security checks** with individual scores and explanations
- **Animated risk meter** (0–100) with color-coded classification
- **Scan history** stored in browser localStorage (up to 50 entries)
- **PDF report download** with jsPDF (full report with all check details)
- **Copy result** to clipboard as formatted text
- **Statistics page** with Safe / Suspicious / High Risk distribution bar
- **9 cybersecurity tips** section
- **Sample URLs** for quick demonstration
- **Responsive** for desktop and mobile
- **Accessible** (ARIA labels, keyboard navigation, reduced motion support)

---

## 🛡️ Disclaimer

PhishGuard AI is an **educational tool**. Automated URL analysis cannot guarantee 100% accuracy. Always:
- Verify suspicious URLs through multiple security tools
- Use browser built-in phishing protection
- Report phishing sites to Google Safe Browsing and PhishTank

---

## 📄 License

MIT License — Free for educational and personal use.
