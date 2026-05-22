const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { fixes_verified: 31, screenshots_captured: 18, wcag_criteria: 12, client_ready: 9 },
    evidence: [
      { page: '/checkout', issue: 'missing form labels', wcag: '1.3.1', proof: 'before-after DOM diff', status: 'verified' },
      { page: '/pricing', issue: 'contrast failure', wcag: '1.4.3', proof: 'computed contrast report', status: 'verified' },
      { page: '/dashboard', issue: 'keyboard trap', wcag: '2.1.2', proof: 'tab-order recording', status: 'needs reviewer' },
    ],
  });
});

router.post('/package', (req, res) => {
  const { site = 'site', reviewer = 'accessibility lead' } = req.body || {};
  res.json({
    site,
    reviewer,
    package_id: `evidence-${Date.now()}`,
    contents: ['wcag mapping', 'remediation diff', 'screenshots', 'review attestation'],
  });
});

module.exports = router;
