/**
 * PhishGuard AI - URL Analysis Engine
 * Core module containing all phishing detection checks and scoring logic
 */

// ─── Risk Scoring Constants ────────────────────────────────────────────────────
const SCORES = {
  LONG_URL: 15,
  IP_ADDRESS: 25,
  SUSPICIOUS_KEYWORD: 10,
  EXCESSIVE_SUBDOMAINS: 15,
  NO_HTTPS: 20,
  URL_SHORTENER: 20,
  SPECIAL_CHARS: 15,
};

// ─── Classification Thresholds ────────────────────────────────────────────────
const CLASSIFICATION = {
  SAFE: { max: 29, label: 'Safe', level: 'safe' },
  SUSPICIOUS: { max: 59, label: 'Suspicious', level: 'suspicious' },
  HIGH_RISK: { max: 100, label: 'High Risk', level: 'high-risk' },
};

// ─── Known URL Shortener Domains ──────────────────────────────────────────────
const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'shorturl.at', 'goo.gl',
  'ow.ly', 'is.gd', 'buff.ly', 'adf.ly', 'tiny.cc',
  'lnkd.in', 'db.tt', 'qr.ae', 'cutt.ly', 'rebrand.ly',
];

// ─── Suspicious Keywords ──────────────────────────────────────────────────────
const SUSPICIOUS_KEYWORDS = [
  'login', 'verify', 'update', 'secure', 'account',
  'banking', 'password', 'signin', 'authenticate',
  'confirm', 'wallet', 'paypal', 'ebay', 'amazon',
];

/**
 * CHECK 1: URL Length Detection
 * Unusually long URLs are often used to hide malicious domains
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkUrlLength(url) {
  const length = url.length;
  const THRESHOLD = 75;
  const passed = length <= THRESHOLD;

  return {
    id: 'url_length',
    name: 'URL Length',
    passed,
    score: passed ? 0 : SCORES.LONG_URL,
    detail: passed
      ? `URL length (${length} chars) is within normal range.`
      : `URL is unusually long (${length} chars). Phishing URLs often use long strings to obscure the real destination.`,
    value: length,
    threshold: THRESHOLD,
  };
}

/**
 * CHECK 2: IP Address Detection
 * Legitimate sites use domain names, not raw IP addresses
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkIpAddress(url) {
  // Match IPv4 in the host portion of the URL
  const ipPattern = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/|$)/i;
  const hasIp = ipPattern.test(url);

  return {
    id: 'ip_address',
    name: 'IP Address Usage',
    passed: !hasIp,
    score: hasIp ? SCORES.IP_ADDRESS : 0,
    detail: hasIp
      ? 'URL uses a raw IP address instead of a domain name. Legitimate websites rarely use raw IPs — this is a strong phishing indicator.'
      : 'URL uses a proper domain name (not a raw IP address).',
    value: hasIp ? 'IP detected' : 'Domain used',
  };
}

/**
 * CHECK 3: Suspicious Keyword Detection
 * Phishing sites often mimic legitimate services using keywords in the URL
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkSuspiciousKeywords(url) {
  const lowerUrl = url.toLowerCase();
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter(kw => lowerUrl.includes(kw));
  const passed = foundKeywords.length === 0;

  return {
    id: 'suspicious_keywords',
    name: 'Suspicious Keywords',
    passed,
    score: passed ? 0 : SCORES.SUSPICIOUS_KEYWORD,
    detail: passed
      ? 'No suspicious phishing-related keywords found in the URL.'
      : `Suspicious keyword(s) detected: [${foundKeywords.join(', ')}]. These terms are commonly used in phishing attacks to appear legitimate.`,
    value: foundKeywords,
  };
}

/**
 * CHECK 4: Excessive Subdomain Detection
 * Phishing URLs often chain multiple subdomains to bury the real malicious domain
 * e.g., login.verify.secure.bank.attacker.com
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkExcessiveSubdomains(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Remove 'www.' prefix before counting
    const cleanHost = hostname.replace(/^www\./, '');
    const parts = cleanHost.split('.');
    // Subdomains = parts - 2 (domain + TLD)
    const subdomainCount = Math.max(0, parts.length - 2);
    const THRESHOLD = 3;
    const passed = subdomainCount <= THRESHOLD;

    return {
      id: 'excessive_subdomains',
      name: 'Subdomain Count',
      passed,
      score: passed ? 0 : SCORES.EXCESSIVE_SUBDOMAINS,
      detail: passed
        ? `Subdomain depth (${subdomainCount}) is normal.`
        : `Excessive subdomains detected (${subdomainCount} levels: ${hostname}). Attackers use deep subdomain chains to disguise the real domain.`,
      value: subdomainCount,
      threshold: THRESHOLD,
      hostname,
    };
  } catch {
    return {
      id: 'excessive_subdomains',
      name: 'Subdomain Count',
      passed: false,
      score: SCORES.EXCESSIVE_SUBDOMAINS,
      detail: 'Could not parse URL structure for subdomain analysis.',
      value: 'parse error',
    };
  }
}

/**
 * CHECK 5: HTTPS Validation
 * Legitimate sites use HTTPS; HTTP is insecure and often used in phishing
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkHttps(url) {
  const hasHttps = url.toLowerCase().startsWith('https://');

  return {
    id: 'https',
    name: 'HTTPS Protocol',
    passed: hasHttps,
    score: hasHttps ? 0 : SCORES.NO_HTTPS,
    detail: hasHttps
      ? 'URL uses HTTPS (encrypted connection).'
      : 'URL does not use HTTPS. Unencrypted connections are dangerous and commonly used in phishing sites.',
    value: hasHttps ? 'HTTPS' : 'HTTP',
  };
}

/**
 * CHECK 6: URL Shortener Detection
 * Shorteners hide the real destination URL, a common phishing tactic
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkUrlShortener(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const detectedShortener = URL_SHORTENERS.find(s => hostname === s || hostname.endsWith('.' + s));
    const isShortener = Boolean(detectedShortener);

    return {
      id: 'url_shortener',
      name: 'URL Shortener',
      passed: !isShortener,
      score: isShortener ? SCORES.URL_SHORTENER : 0,
      detail: isShortener
        ? `URL uses a shortening service (${detectedShortener}). Shortened URLs hide the real destination and are frequently abused in phishing campaigns.`
        : 'URL does not use a known URL shortening service.',
      value: detectedShortener || 'none',
    };
  } catch {
    return {
      id: 'url_shortener',
      name: 'URL Shortener',
      passed: true,
      score: 0,
      detail: 'Could not determine URL shortener status.',
      value: 'unknown',
    };
  }
}

/**
 * CHECK 7: Special Character Analysis
 * Excessive special characters are used to obfuscate URLs
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkSpecialChars(url) {
  const counts = {
    '@': (url.match(/@/g) || []).length,
    '-': (url.match(/-/g) || []).length,
    '_': (url.match(/_/g) || []).length,
    '%': (url.match(/%/g) || []).length,
    '~': (url.match(/~/g) || []).length,
    'dots': (url.match(/\./g) || []).length,
  };

  const suspicious = [];

  // @ sign in URL (before the host) is a classic redirect trick
  if (counts['@'] >= 1) suspicious.push(`@ symbol (${counts['@']}x)`);
  // Too many hyphens in domain
  if (counts['-'] > 4) suspicious.push(`excessive hyphens (${counts['-']}x)`);
  // URL encoding abuse
  if (counts['%'] > 5) suspicious.push(`excessive % encoding (${counts['%']}x)`);
  // Multiple dots beyond normal domain structure
  if (counts['dots'] > 5) suspicious.push(`excessive dots (${counts['dots']}x)`);

  const passed = suspicious.length === 0;

  return {
    id: 'special_chars',
    name: 'Special Character Analysis',
    passed,
    score: passed ? 0 : SCORES.SPECIAL_CHARS,
    detail: passed
      ? 'No suspicious special character patterns detected.'
      : `Suspicious character patterns found: ${suspicious.join(', ')}. These are used to obfuscate the real URL or redirect users through malicious hosts.`,
    value: counts,
    suspicious,
  };
}

/**
 * CHECK 8: Domain Reputation (Placeholder Module)
 * Placeholder for future integration with Google Safe Browsing, PhishTank, VirusTotal
 * @param {string} url - The full URL string
 * @returns {object} check result
 */
function checkDomainReputation(url) {
  // ── INTEGRATION POINT ──────────────────────────────────────────────────────
  // Replace this placeholder with a real API call:
  //
  // Google Safe Browsing:
  //   POST https://safebrowsing.googleapis.com/v4/threatMatches:find
  //   Requires: API key, threat types (MALWARE, SOCIAL_ENGINEERING, etc.)
  //
  // PhishTank:
  //   POST https://checkurl.phishtank.com/checkurl/
  //   Requires: app_key, url (Base64 encoded)
  //
  // VirusTotal:
  //   GET https://www.virustotal.com/api/v3/urls/{id}
  //   Requires: x-apikey header
  //
  // Example integration:
  //   const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`, {
  //     method: 'POST',
  //     body: JSON.stringify({ client: { clientId: 'phishguard', clientVersion: '1.0' },
  //       threatInfo: { threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'], ... }
  //     })
  //   });
  // ─────────────────────────────────────────────────────────────────────────

  return {
    id: 'domain_reputation',
    name: 'Domain Reputation',
    passed: null, // null = not checked
    score: 0,
    detail: 'Domain reputation check is currently in placeholder mode. Connect Google Safe Browsing, PhishTank, or VirusTotal API keys in /utils/analyzer.js to enable live threat intelligence.',
    value: 'API integration pending',
    placeholder: true,
  };
}

/**
 * Classify a numeric risk score into a threat level
 * @param {number} score - Total risk score (0-100)
 * @returns {object} classification object
 */
function classifyScore(score) {
  const capped = Math.min(100, score);
  if (capped <= CLASSIFICATION.SAFE.max) return { ...CLASSIFICATION.SAFE, score: capped };
  if (capped <= CLASSIFICATION.SUSPICIOUS.max) return { ...CLASSIFICATION.SUSPICIOUS, score: capped };
  return { ...CLASSIFICATION.HIGH_RISK, score: capped };
}

/**
 * Generate security recommendations based on check results
 * @param {Array} checks - Array of check result objects
 * @param {object} classification - Classification result
 * @returns {Array} Array of recommendation strings
 */
function generateRecommendations(checks, classification) {
  const recommendations = [];

  const failed = checks.filter(c => c.passed === false);

  if (failed.find(c => c.id === 'ip_address')) {
    recommendations.push('Never enter credentials on sites using raw IP addresses instead of domain names.');
  }
  if (failed.find(c => c.id === 'https')) {
    recommendations.push('Avoid submitting sensitive information on HTTP (non-encrypted) pages.');
  }
  if (failed.find(c => c.id === 'url_shortener')) {
    recommendations.push('Expand shortened URLs using a service like checkshorturl.com before clicking.');
  }
  if (failed.find(c => c.id === 'suspicious_keywords')) {
    recommendations.push('Be cautious of URLs that mimic banking, login, or account services — verify the domain independently.');
  }
  if (failed.find(c => c.id === 'excessive_subdomains')) {
    recommendations.push('Check the root domain carefully. Attackers use deep subdomain chains to make malicious URLs look legitimate.');
  }
  if (failed.find(c => c.id === 'url_length')) {
    recommendations.push('Be suspicious of unusually long URLs — they may hide the real destination through obfuscation.');
  }
  if (failed.find(c => c.id === 'special_chars')) {
    recommendations.push('URLs with @ symbols can redirect to a different host than they appear to use. Verify carefully.');
  }

  if (classification.level === 'safe' && failed.length === 0) {
    recommendations.push('URL appears safe based on automated checks. Always exercise caution with unknown sites.');
    recommendations.push('Verify the site\'s SSL certificate by clicking the padlock icon in your browser.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Always verify the legitimacy of a site before entering personal or financial information.');
  }

  return recommendations;
}

/**
 * Main analysis function — runs all checks and returns a complete report
 * @param {string} rawUrl - The URL submitted by the user
 * @returns {object} Full analysis report
 */
function analyzeUrl(rawUrl) {
  // Normalize: add https:// if no protocol given
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }

  // Run all checks
  const checks = [
    checkUrlLength(url),
    checkIpAddress(url),
    checkSuspiciousKeywords(url),
    checkExcessiveSubdomains(url),
    checkHttps(url),
    checkUrlShortener(url),
    checkSpecialChars(url),
    checkDomainReputation(url),
  ];

  // Sum scores from all non-placeholder checks
  const totalScore = checks
    .filter(c => !c.placeholder)
    .reduce((sum, c) => sum + (c.score || 0), 0);

  const classification = classifyScore(totalScore);
  const recommendations = generateRecommendations(checks, classification);

  // Extract domain for display
  let domain = url;
  try {
    domain = new URL(url).hostname;
  } catch {}

  return {
    url: rawUrl,
    normalizedUrl: url,
    domain,
    timestamp: new Date().toISOString(),
    score: classification.score,
    classification: classification.label,
    level: classification.level,
    checks,
    recommendations,
    summary: {
      total: checks.filter(c => !c.placeholder).length,
      passed: checks.filter(c => c.passed === true).length,
      failed: checks.filter(c => c.passed === false).length,
      pending: checks.filter(c => c.placeholder).length,
    },
  };
}

module.exports = { analyzeUrl };
