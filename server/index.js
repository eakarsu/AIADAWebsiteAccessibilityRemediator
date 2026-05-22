const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { initDb, pool } = require('./db');

const authRoutes = require('./routes/auth');
const featureRoutes = require('./routes/features');
const aiRoutes = require('./routes/ai');
const advancedRoutes = require('./routes/advanced');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Validate API key at startup
if (!process.env.OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY not set - AI features disabled');
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default_jwt_secret_change_me') {
  console.warn('WARNING: JWT_SECRET is not set or is using the default value. Set a strong secret in .env for production.');
}

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  `http://localhost:${process.env.FRONTEND_PORT || 3000}`,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// General rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Limit is 100 per 15 minutes. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-specific rate limiter: 10 attempts per 15 minutes per IP (brute-force protection)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI rate limiter: 20 AI requests per user per hour (keyed by user ID from JWT)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    // Use user ID from JWT (set by auth middleware) — avoids IPv6 issues since it's a number string
    return req.user ? `user_${req.user.id}` : `ip_${ipKeyGenerator(req.ip)}`;
  },
  message: { error: 'Too many AI requests. Limit is 20 per hour per user. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Health check (no rate limit)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply general limiter to all API routes
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api', featureRoutes);

// Apply auth then rate limiter before AI routes
app.use('/api/ai', auth, aiRateLimiter, aiRoutes);

// Public advanced routes (e.g., third-party invitation token access)
app.use('/api/advanced', advancedRoutes.publicRouter);
// Authenticated advanced routes
app.use('/api/advanced', advancedRoutes.router);

// Legal risk dashboard endpoint
app.get('/api/analytics/legal-risk', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all website scans for the user
    const scansResult = await pool.query(
      `SELECT id, title, url, ai_result FROM website_scans WHERE user_id = $1`,
      [userId]
    );

    const scans = scansResult.rows;
    const totalPages = scans.length;

    if (totalPages === 0) {
      return res.json({
        litigation_risk_score: 0,
        total_pages_audited: 0,
        total_critical_issues: 0,
        top_risk_sites: [],
      });
    }

    // Calculate per-site risk
    const siteRisks = scans.map(scan => {
      const aiResult = scan.ai_result || {};
      const issues = Array.isArray(aiResult.issues) ? aiResult.issues : [];
      const criticalCount = issues.filter(
        i => i.severity === 'critical' || i.severity === 'high'
      ).length;

      // Use legal_risk risk_score if available (from legal-assessments ai_result)
      const riskScore = typeof aiResult.risk_score === 'number'
        ? aiResult.risk_score
        : criticalCount * 10; // rough heuristic: 10 points per critical issue

      return {
        id: scan.id,
        title: scan.title,
        url: scan.url,
        critical_issues: criticalCount,
        total_issues: issues.length,
        risk_score: Math.min(100, riskScore),
      };
    });

    // Total critical issues across all scans
    const totalCriticalIssues = siteRisks.reduce((sum, s) => sum + s.critical_issues, 0);

    // Litigation risk score: critical issues / total pages audited * 100 (capped at 100)
    const litigationRiskScore = Math.min(
      100,
      Math.round((totalCriticalIssues / totalPages) * 100)
    );

    // Top 5 highest-risk sites
    const top5 = [...siteRisks]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5);

    res.json({
      litigation_risk_score: litigationRiskScore,
      total_pages_audited: totalPages,
      total_critical_issues: totalCriticalIssues,
      top_risk_sites: top5,
    });
  } catch (err) {
    console.error('Legal risk analytics error:', err.message);
    res.status(500).json({ error: 'Failed to compute legal risk analytics.' });
  }
});

// Global search across all feature tables
app.get('/api/search', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required.' });
    }

    const featureTables = [
      { table: 'website_scans', feature: 'website-accessibility-scanner' },
      { table: 'wcag_checks', feature: 'wcag-compliance-checker' },
      { table: 'alt_texts', feature: 'alt-text-generator' },
      { table: 'color_contrasts', feature: 'color-contrast-analyzer' },
      { table: 'screen_reader_optimizations', feature: 'screen-reader-optimizer' },
      { table: 'keyboard_audits', feature: 'keyboard-navigation-auditor' },
      { table: 'aria_labels', feature: 'aria-label-generator' },
      { table: 'accessibility_reports', feature: 'accessibility-report-generator' },
      { table: 'remediation_plans', feature: 'remediation-plan-creator' },
      { table: 'legal_assessments', feature: 'legal-compliance-assessor' },
      { table: 'pdf_checks', feature: 'pdf-accessibility-checker' },
      { table: 'form_analyses', feature: 'form-accessibility-analyzer' },
      { table: 'video_captions', feature: 'video-caption-generator' },
      { table: 'readability_analyses', feature: 'readability-analyzer' },
      { table: 'accessibility_policies', feature: 'accessibility-policy-generator' },
    ];

    const unionParts = featureTables.map(
      ({ table, feature }) =>
        `SELECT id, title, description, url, status, created_at, '${feature}' as feature_type FROM ${table} WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR url ILIKE $2)`
    );

    const unionQuery = unionParts.join(' UNION ALL ');
    const countQuery = `SELECT COUNT(*) as count FROM (${unionQuery}) combined`;
    const dataQuery = `${unionQuery} ORDER BY created_at DESC LIMIT $3 OFFSET $4`;

    const searchTerm = `%${q}%`;
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, [userId, searchTerm]),
      pool.query(dataQuery, [userId, searchTerm, limit, offset]),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: dataResult.rows,
      query: q,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// Quick-scan endpoint: paste HTML, get instant AI analysis without creating a record
app.post('/api/ai/quick-scan', auth, aiRateLimiter, async (req, res) => {
  try {
    const { html, feature = 'website-scans' } = req.body;
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'html string is required.' });
    }
    if (html.length > 50000) {
      return res.status(400).json({ error: 'HTML too large. Max 50,000 characters.' });
    }

    const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

    if (!openrouterApiKey) {
      return res.status(500).json({ error: 'OpenRouter API key is not configured.' });
    }

    const systemPrompt = `You are an expert ADA and WCAG 2.1 accessibility auditor. Analyze the provided HTML snippet and return a structured JSON accessibility report. Return ONLY valid JSON with no markdown fences. The JSON must include: "summary" (string), "overall_score" (0-100), "wcag_level" ("A", "AA", or "AAA"), "issues" (array of objects with "description", "severity" ("critical"|"major"|"minor"), "wcag_criteria", "element", "recommendation"), "quick_wins" (array of strings), "estimated_fix_time" (string).`;

    const response = await fetch(openrouterBaseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this HTML for accessibility issues:\n\n${html.slice(0, 50000)}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error (quick-scan):', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to get response from AI service.' });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      return res.status(502).json({ error: 'Empty response from AI service.' });
    }

    const parsed = parseAIJson(aiContent);
    res.json({ ai_result: parsed || { raw_response: aiContent } });
  } catch (err) {
    console.error('Quick-scan error:', err.message);
    res.status(500).json({ error: 'Server error during quick scan.' });
  }
});

// Export endpoint: CSV export of ai_result for a feature item
app.get('/api/export/:feature/:id', auth, async (req, res) => {
  const { feature, id } = req.params;
  const format = req.query.format || 'csv';
  const userId = req.user.id;

  const tableMap = {
    'website-scans': 'website_scans',
    'wcag-checks': 'wcag_checks',
    'alt-texts': 'alt_texts',
    'color-contrasts': 'color_contrasts',
    'screen-reader': 'screen_reader_optimizations',
    'keyboard-audits': 'keyboard_audits',
    'aria-labels': 'aria_labels',
    'accessibility-reports': 'accessibility_reports',
    'remediation-plans': 'remediation_plans',
    'legal-assessments': 'legal_assessments',
    'pdf-checks': 'pdf_checks',
    'form-analyses': 'form_analyses',
    'video-captions': 'video_captions',
    'readability': 'readability_analyses',
    'accessibility-policies': 'accessibility_policies',
  };

  const table = tableMap[feature];
  if (!table) {
    return res.status(400).json({ error: 'Unknown feature.' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const item = result.rows[0];
    const aiResult = item.ai_result || {};

    if (format === 'csv') {
      const issues = Array.isArray(aiResult.issues) ? aiResult.issues : [];
      const rows = [
        ['Title', 'URL', 'Status', 'Overall Score', 'Summary', 'Issue Description', 'Severity', 'WCAG Criteria', 'Recommendation'],
        ...issues.map(issue => [
          item.title,
          item.url || '',
          item.status,
          aiResult.overall_score || '',
          aiResult.summary || '',
          issue.description || '',
          issue.severity || '',
          issue.wcag_criteria || '',
          issue.recommendation || '',
        ]),
      ];

      if (issues.length === 0) {
        rows.push([item.title, item.url || '', item.status, aiResult.overall_score || '', aiResult.summary || '', 'No issues found', '', '', '']);
      }

      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${feature}-${id}-report.csv"`);
      return res.send(csv);
    }

    // JSON export fallback
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${feature}-${id}-report.json"`);
    return res.json({ item, ai_result: aiResult });
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: 'Export failed.' });
  }
});

// Score history endpoint
app.get('/api/score-history/:feature/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const r = await pool.query(
      `SELECT score, recorded_at, feature_type FROM score_history WHERE item_id = $1 AND user_id = $2 ORDER BY recorded_at ASC`,
      [id, userId]
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch score history.' });
  }
});

app.use('/api/remediation-evidence-pack', require('./routes/remediationEvidencePack'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

function parseAIJson(text) {
  try { return JSON.parse(text); } catch(e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch(e) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch(e) {} }
  return null;
}

// Initialize database and start server
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

// BATCH_00_AUDIT_MOUNTS
app.use('/api/html-rewriter', require('./routes/htmlRewriter'));
app.use('/api/browser-extension', require('./routes/browserExtension'));
app.use('/api/design-plugin', require('./routes/designPlugin'));
app.use('/api/vpat-generator', require('./routes/vpatGenerator'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-fix-validation-step-before', require('./routes/gap_ai_fix_validation_step_before'));
app.use('/api/gap-ai-rollback-suggestion-when-fix', require('./routes/gap_ai_rollback_suggestion_when_fix'));
app.use('/api/gap-ai-batch-fix-prioritization', require('./routes/gap_ai_batch_fix_prioritization'));
app.use('/api/gap-bulk-site-wide-remediation-workflow', require('./routes/gap_bulk_site_wide_remediation_workflow'));
app.use('/api/gap-b-testing-fixed-vs-original', require('./routes/gap_b_testing_fixed_vs_original'));
app.use('/api/gap-notifications-subsystem', require('./routes/gap_notifications_subsystem'));
app.use('/api/gap-vpat-accessibility-statement-generation', require('./routes/gap_vpat_accessibility_statement_generation'));
app.use('/api/gap-reporting-dashboard-module', require('./routes/gap_reporting_dashboard_module'));
