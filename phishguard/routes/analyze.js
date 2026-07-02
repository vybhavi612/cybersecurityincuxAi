/**
 * PhishGuard AI - API Routes
 * Express router handling URL analysis and stats endpoints
 */

const express = require('express');
const router = express.Router();
const { analyzeUrl } = require('../utils/analyzer');

/**
 * POST /api/analyze
 * Accepts a URL and returns a full phishing risk analysis report
 */
router.post('/analyze', (req, res) => {
  const { url } = req.body;

  // ── Input Validation ──────────────────────────────────────────────────────
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'A "url" string field is required in the request body.',
    });
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({
      error: 'Empty URL',
      message: 'Please provide a non-empty URL to analyze.',
    });
  }

  if (trimmed.length > 2000) {
    return res.status(400).json({
      error: 'URL too long',
      message: 'URL exceeds the maximum allowed length of 2000 characters.',
    });
  }

  // ── Run Analysis ──────────────────────────────────────────────────────────
  try {
    console.log(`[PhishGuard] Analyzing: ${trimmed}`);
    const report = analyzeUrl(trimmed);
    console.log(`[PhishGuard] Result: ${report.classification} (score: ${report.score})`);
    res.json({ success: true, report });
  } catch (err) {
    console.error('[PhishGuard] Analysis error:', err.message);
    res.status(500).json({
      error: 'Analysis failed',
      message: 'An error occurred while analyzing the URL. Please try again.',
    });
  }
});

/**
 * GET /api/sample-urls
 * Returns a list of sample URLs for demonstration purposes
 */
router.get('/sample-urls', (req, res) => {
  res.json({
    samples: [
      {
        label: '✅ Safe — Google',
        url: 'https://www.google.com',
        expectedLevel: 'safe',
      },
      {
        label: '✅ Safe — GitHub',
        url: 'https://github.com/features',
        expectedLevel: 'safe',
      },
      {
        label: '⚠️ Suspicious — No HTTPS + keywords',
        url: 'http://secure-login.example.com/account/verify',
        expectedLevel: 'suspicious',
      },
      {
        label: '⚠️ Suspicious — URL Shortener',
        url: 'https://bit.ly/3xAmPl3',
        expectedLevel: 'suspicious',
      },
      {
        label: '🚨 High Risk — IP Address',
        url: 'http://192.168.1.1/login/banking/authenticate',
        expectedLevel: 'high-risk',
      },
      {
        label: '🚨 High Risk — Deep subdomains + no HTTPS',
        url: 'http://login.verify.secure.bank.paypal.attacker.com/update/password',
        expectedLevel: 'high-risk',
      },
      {
        label: '🚨 High Risk — @ redirect trick',
        url: 'http://legitbank.com@192.168.10.1/signin/account',
        expectedLevel: 'high-risk',
      },
      {
        label: '🚨 High Risk — Long obfuscated URL',
        url: 'http://www.update-your-account-information-secure-login-verify-paypal-banking.com/auth/verify/account/password/confirm',
        expectedLevel: 'high-risk',
      },
    ],
  });
});

module.exports = router;
