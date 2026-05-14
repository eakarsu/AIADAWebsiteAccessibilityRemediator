/**
 * Advanced (NEW) custom non-CRUD endpoints for the ADA Remediator.
 * Features:
 *  - Batch analysis job scheduling (POST /batch-jobs, GET /batch-jobs, GET /batch-jobs/:id)
 *  - Accessibility comparison reports (POST /comparisons, GET /comparisons, GET /comparisons/:id)
 *  - Third-party auditor invitations (POST /invites, GET /invites; public GET /invites/access/:token)
 *  - CI/CD webhook integration (POST /webhooks/scan, GET /webhooks/results)
 *  - Skill matrix tracking (GET /skills/suggest [MUST be before /:id], GET /skills, POST /skills, PATCH /skills/:id)
 *  - Multi-site portfolio scorecard (GET /portfolio)
 *  - Scheduled scan cron worker
 *  - WCAG Knowledge Base (GET /wcag-kb)
 *  - User profile management (GET/PUT /profile, POST /change-password)
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
// Upgraded to a more capable model
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

/**
 * Robust JSON parser: tries JSON.parse, strips markdown fences, extracts from text.
 */
function parseAIJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch(e) {}
  const stripped = String(s).replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch(e) {}
  const start = s.indexOf('{'); const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(s.slice(start, end + 1)); } catch(e) {} }
  return null;
}

async function callAI(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
  const r = await fetch(OPENROUTER_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenRouter (${r.status}): ${t}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(255),
      urls JSONB,
      status VARCHAR(50) DEFAULT 'queued',
      results JSONB,
      digest_email VARCHAR(255),
      scheduled_for TIMESTAMP,
      recurrence VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comparison_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      url_a VARCHAR(500),
      url_b VARCHAR(500),
      label_a VARCHAR(255),
      label_b VARCHAR(255),
      ai_result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auditor_invitations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      auditor_email VARCHAR(255),
      report_type VARCHAR(50),
      report_id INTEGER,
      access_token VARCHAR(128) UNIQUE,
      expires_at TIMESTAMP,
      revoked BOOLEAN DEFAULT FALSE,
      access_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ci_webhooks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      site_url VARCHAR(500),
      commit_sha VARCHAR(80),
      branch VARCHAR(120),
      score INTEGER,
      issues_count INTEGER,
      passed BOOLEAN,
      threshold INTEGER,
      ai_result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS team_skills (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      member_name VARCHAR(255),
      member_email VARCHAR(255),
      role VARCHAR(120),
      certifications JSONB,
      training_completed JSONB,
      proficiency_score INTEGER,
      last_updated TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Add recurrence column to batch_jobs if not present
  await pool.query(`ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS recurrence VARCHAR(50)`);
}

ensureTables().catch((e) => console.error('advanced.js ensureTables:', e.message));

// ===== Cron: process scheduled batch jobs =====
let cronStarted = false;
function startCronWorker() {
  if (cronStarted) return;
  cronStarted = true;

  let nodeCron;
  try { nodeCron = require('node-cron'); } catch(e) {
    console.warn('node-cron not available, scheduled jobs disabled.');
    return;
  }

  // Run every minute to check for due jobs
  nodeCron.schedule('* * * * *', async () => {
    try {
      const due = await pool.query(
        `SELECT * FROM batch_jobs WHERE status = 'queued' AND (scheduled_for IS NULL OR scheduled_for <= NOW()) LIMIT 5`
      );
      for (const job of due.rows) {
        // Mark as running immediately to prevent double-processing
        await pool.query(`UPDATE batch_jobs SET status = 'running' WHERE id = $1 AND status = 'queued'`, [job.id]);
        processJobInBackground(job);
      }
    } catch (e) {
      console.error('[cron] Error checking scheduled jobs:', e.message);
    }
  });

  console.log('[cron] Scheduled job worker started.');
}

async function processJobInBackground(job) {
  const urls = Array.isArray(job.urls) ? job.urls : [];
  const results = [];

  const systemPrompt = `You are an expert ADA and WCAG 2.1 accessibility auditor. Analyze the given URL and return ONLY valid JSON (no markdown) with: "overall_score" (0-100), "wcag_level" ("A", "AA", "AAA", or "none"), "issues_count" (number), "critical_count" (number), "top_issues" (array of objects with "description", "severity" ("critical"|"major"|"minor"), "wcag_criteria", "recommendation"), "summary" (string), "estimated_fix_hours" (number).`;

  for (const url of urls.slice(0, 50)) {
    try {
      const aiContent = await callAI(systemPrompt, `Perform a comprehensive WCAG 2.1 accessibility audit for: ${url}`);
      const parsed = parseAIJson(aiContent);
      results.push({ url, result: parsed || { raw: aiContent } });

      // Save each URL as a website_scan record linked to the job owner
      if (parsed && typeof parsed.overall_score === 'number') {
        const existing = await pool.query(
          `SELECT id FROM website_scans WHERE user_id = $1 AND url = $2 ORDER BY created_at DESC LIMIT 1`,
          [job.user_id, url]
        );
        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO website_scans (user_id, title, url, status, ai_result) VALUES ($1, $2, $3, 'completed', $4)`,
            [job.user_id, `Batch scan: ${url}`, url, JSON.stringify(parsed)]
          );
        }
      }
    } catch (e) {
      results.push({ url, error: e.message });
    }
  }

  const finalStatus = 'completed';
  await pool.query(
    `UPDATE batch_jobs SET status = $1, results = $2, completed_at = NOW() WHERE id = $3`,
    [finalStatus, JSON.stringify(results), job.id]
  );
}

// Start the cron worker
setImmediate(startCronWorker);

// All routes require auth except /invites/access/:token (handled below before auth middleware)
const publicRouter = express.Router();

// Public read-only access via invitation token
publicRouter.get('/invites/access/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const inv = await pool.query(
      `SELECT * FROM auditor_invitations WHERE access_token = $1 AND revoked = FALSE`,
      [token]
    );
    if (inv.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or revoked invitation token' });
    }
    const invitation = inv.rows[0];
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invitation expired' });
    }

    // Increment access count
    await pool.query(`UPDATE auditor_invitations SET access_count = access_count + 1 WHERE id = $1`, [invitation.id]);

    // Fetch report
    const tableMap = {
      website_scan: 'website_scans',
      accessibility_report: 'accessibility_reports',
      legal_assessment: 'legal_assessments',
      remediation_plan: 'remediation_plans',
    };
    const table = tableMap[invitation.report_type] || 'website_scans';
    const r = await pool.query(`SELECT id, title, description, url, status, ai_result, created_at FROM ${table} WHERE id = $1`, [invitation.report_id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    res.json({
      invitation: {
        auditor_email: invitation.auditor_email,
        report_type: invitation.report_type,
        access_count: invitation.access_count + 1,
        expires_at: invitation.expires_at,
      },
      report: r.rows[0],
    });
  } catch (err) {
    console.error('Invite access error:', err.message);
    res.status(500).json({ error: 'Failed to access invitation' });
  }
});

// === Authenticated routes ===
router.use(auth);

// ----- User Profile Management -----
router.get('/profile', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, email, name, role, organization, created_at, updated_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { name, organization } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required.' });
    }
    if (name.trim().length > 255) {
      return res.status(400).json({ error: 'name must be 255 characters or fewer.' });
    }
    const r = await pool.query(
      `UPDATE users SET name = $1, organization = $2, updated_at = NOW() WHERE id = $3 RETURNING id, email, name, role, organization, created_at, updated_at`,
      [name.trim(), organization || null, req.user.id]
    );
    res.json({ user: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'new_password must be at least 8 characters.' });
    }

    const userResult = await pool.query(`SELECT password FROM users WHERE id = $1`, [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(current_password, userResult.rows[0].password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- WCAG Knowledge Base -----
router.get('/wcag-kb', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const level = req.query.level; // optional filter: A, AA, AAA
    const q = req.query.q;

    let whereClause = '';
    const params = [];
    const conditions = [];

    if (level) {
      params.push(level.toUpperCase());
      conditions.push(`level = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length} OR criterion ILIKE $${params.length})`);
    }
    if (conditions.length > 0) whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await pool.query(`SELECT COUNT(*) FROM wcag_knowledge_base ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM wcag_knowledge_base ${whereClause} ORDER BY criterion ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Batch Analysis Job Scheduling -----
router.post('/batch-jobs', async (req, res) => {
  try {
    const { name, urls, digest_email, scheduled_for, recurrence } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls must be a non-empty array' });
    }
    if (urls.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 URLs per batch job.' });
    }

    const userId = req.user.id;
    const r = await pool.query(
      `INSERT INTO batch_jobs (user_id, name, urls, status, digest_email, scheduled_for, recurrence)
       VALUES ($1, $2, $3, 'queued', $4, $5, $6) RETURNING *`,
      [userId, name || `Batch ${new Date().toISOString()}`, JSON.stringify(urls),
       digest_email || null, scheduled_for || null, recurrence || null]
    );

    const job = r.rows[0];

    // If no scheduled_for, process immediately in background
    if (!scheduled_for) {
      setImmediate(() => processJobInBackground(job));
    }

    res.status(201).json(job);
  } catch (err) {
    console.error('Create batch job error:', err.message);
    res.status(500).json({ error: 'Failed to create batch job' });
  }
});

router.get('/batch-jobs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`SELECT COUNT(*) FROM batch_jobs WHERE user_id = $1`, [req.user.id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const r = await pool.query(
      `SELECT id, name, urls, status, digest_email, scheduled_for, recurrence, created_at, completed_at FROM batch_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: r.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch-jobs/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM batch_jobs WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch-jobs/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `DELETE FROM batch_jobs WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Batch job deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Accessibility Comparison Reports -----
router.post('/comparisons', async (req, res) => {
  try {
    const { url_a, url_b, label_a, label_b } = req.body;
    if (!url_a || !url_b) return res.status(400).json({ error: 'url_a and url_b are required' });

    const systemPrompt = `You are an expert WCAG 2.1 accessibility auditor. Compare the accessibility profile of two websites and return ONLY valid JSON (no markdown fences). The JSON must include: "overall_a" (0-100 score for site A), "overall_b" (0-100 score for site B), "gap_score" (absolute difference), "winner" ("A" or "B" or "tie"), "side_by_side" (array of objects with "category", "a_score" (0-100), "b_score" (0-100), "a_notes", "b_notes", "winner" ("A"/"B"/"tie")), "improvement_timeline" (array of objects with "phase", "weeks" (number), "focus"), "summary" (string), "recommendations_a" (array of strings), "recommendations_b" (array of strings).`;

    const aiContent = await callAI(
      systemPrompt,
      `Compare these two sites for WCAG 2.1 compliance.\n\nSite A: ${label_a || url_a} — ${url_a}\nSite B: ${label_b || url_b} — ${url_b}\n\nReturn the JSON described above.`
    );
    const ai = parseAIJson(aiContent) || { raw: aiContent };
    const r = await pool.query(
      `INSERT INTO comparison_reports (user_id, url_a, url_b, label_a, label_b, ai_result) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, url_a, url_b, label_a || null, label_b || null, JSON.stringify(ai)]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Comparison error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/comparisons', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`SELECT COUNT(*) FROM comparison_reports WHERE user_id = $1`, [req.user.id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const r = await pool.query(
      `SELECT id, url_a, url_b, label_a, label_b, created_at FROM comparison_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: r.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/comparisons/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM comparison_reports WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/comparisons/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM comparison_reports WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Comparison deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Third-party Auditor Invitations -----
router.post('/invites', async (req, res) => {
  try {
    const { auditor_email, report_type, report_id, expires_in_days } = req.body;
    if (!auditor_email || !report_type || !report_id) {
      return res.status(400).json({ error: 'auditor_email, report_type, report_id required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditor_email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    const validTypes = ['website_scan', 'accessibility_report', 'legal_assessment', 'remediation_plan'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({ error: `Invalid report_type. Must be one of: ${validTypes.join(', ')}` });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const days = Math.min(90, Math.max(1, parseInt(expires_in_days, 10) || 14));
    const expiresAt = new Date(Date.now() + days * 86400000);
    const r = await pool.query(
      `INSERT INTO auditor_invitations (user_id, auditor_email, report_type, report_id, access_token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, auditor_email, report_type, report_id, token, expiresAt]
    );
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.status(201).json({
      ...r.rows[0],
      share_link: `/api/advanced/invites/access/${token}`,
      full_share_url: `${clientUrl}/api/advanced/invites/access/${token}`,
    });
  } catch (err) {
    console.error('Create invite error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/invites', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`SELECT COUNT(*) FROM auditor_invitations WHERE user_id = $1`, [req.user.id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const r = await pool.query(
      `SELECT id, auditor_email, report_type, report_id, access_token, expires_at, revoked, access_count, created_at FROM auditor_invitations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: r.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/invites/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE auditor_invitations SET revoked = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Invitation revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- CI/CD Webhook Integration -----
// Accepts a deploy webhook payload (e.g., {site_url, commit_sha, branch, threshold})
router.post('/webhooks/scan', async (req, res) => {
  try {
    const { site_url, commit_sha, branch, threshold } = req.body;
    if (!site_url || typeof site_url !== 'string') {
      return res.status(400).json({ error: 'site_url is required and must be a string.' });
    }
    const minScore = typeof threshold === 'number' ? Math.min(100, Math.max(0, threshold)) : 80;

    const systemPrompt = `You are an expert ADA and WCAG 2.1 accessibility auditor for CI/CD pipelines. Analyze the URL and return ONLY valid JSON (no markdown fences) with: "overall_score" (0-100), "wcag_level" ("A", "AA", "AAA", or "none"), "issues_count" (number), "critical_count" (number), "high_count" (number), "top_issues" (array of objects with "description", "severity" ("critical"|"high"|"medium"|"low"), "wcag_criteria", "fix_complexity" ("quick"|"moderate"|"complex")), "summary" (string), "build_recommendation" ("pass"|"fail"|"warn"), "estimated_fix_hours" (number).`;

    let aiResult = {};
    let score = null;
    try {
      const aiContent = await callAI(systemPrompt, `CI/CD accessibility scan for: ${site_url} (branch: ${branch || 'unknown'}, commit: ${commit_sha || 'unknown'})`);
      aiResult = parseAIJson(aiContent) || { raw: aiContent };
      score = typeof aiResult.overall_score === 'number' ? aiResult.overall_score : null;
    } catch (e) {
      aiResult = { error: e.message };
    }

    const passed = score !== null ? score >= minScore : false;
    const r = await pool.query(
      `INSERT INTO ci_webhooks (user_id, site_url, commit_sha, branch, score, issues_count, passed, threshold, ai_result)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, site_url, commit_sha || null, branch || null, score, aiResult.issues_count || null, passed, minScore, JSON.stringify(aiResult)]
    );
    res.status(201).json({
      ...r.rows[0],
      ci_action: passed ? 'pass' : 'fail',
      message: passed ? `Build passes accessibility threshold (score ${score} >= ${minScore})` : `Build fails: score ${score} < threshold ${minScore}`,
    });
  } catch (err) {
    console.error('CI webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/webhooks/results', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`SELECT COUNT(*) FROM ci_webhooks WHERE user_id = $1`, [req.user.id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const r = await pool.query(
      `SELECT id, site_url, commit_sha, branch, score, issues_count, passed, threshold, created_at FROM ci_webhooks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: r.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Team Skill Matrix Tracking -----

// IMPORTANT: GET /skills/suggest MUST be registered BEFORE GET /skills/:id to avoid
// Express matching "suggest" as the :id parameter.
router.get('/skills/suggest', async (req, res) => {
  try {
    const r = await pool.query(`SELECT member_name, role, certifications, training_completed, proficiency_score FROM team_skills WHERE user_id = $1`, [req.user.id]);
    const team = r.rows;

    if (team.length === 0) {
      return res.json({ result: { suggestions: [], message: 'Add team members first to get suggestions.' } });
    }

    const systemPrompt = `You are a learning & development specialist for web accessibility teams. Suggest WCAG/ADA certifications and training paths based on each team member's role and current skill gaps. Return ONLY valid JSON (no markdown) with: "suggestions" (array of objects with "member_name" (string), "current_proficiency" (0-100), "skill_gaps" (array of strings), "recommended_certs" (array of strings like "CPACC", "WAS", "CPWA"), "recommended_trainings" (array of strings), "priority" ("high"|"medium"|"low"), "estimated_weeks_to_proficiency" (number), "rationale" (string)), "team_summary" (object with "average_proficiency", "weakest_areas" (array), "recommended_team_investment" (string)).`;

    const aiContent = await callAI(systemPrompt, `Team accessibility skill matrix:\n${JSON.stringify(team, null, 2)}`);
    const parsed = parseAIJson(aiContent) || { raw: aiContent };
    res.json({ result: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/skills', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`SELECT COUNT(*) FROM team_skills WHERE user_id = $1`, [req.user.id]);
    const total = parseInt(countResult.rows[0].count, 10);

    const r = await pool.query(
      `SELECT * FROM team_skills WHERE user_id = $1 ORDER BY member_name LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: r.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/skills', async (req, res) => {
  try {
    const { member_name, member_email, role, certifications, training_completed, proficiency_score } = req.body;
    if (!member_name || typeof member_name !== 'string' || member_name.trim().length === 0) {
      return res.status(400).json({ error: 'member_name is required.' });
    }
    if (member_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member_email)) {
      return res.status(400).json({ error: 'Invalid member_email format.' });
    }
    const score = Math.min(100, Math.max(0, parseInt(proficiency_score, 10) || 0));

    const r = await pool.query(
      `INSERT INTO team_skills (user_id, member_name, member_email, role, certifications, training_completed, proficiency_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, member_name.trim(), member_email || null, role || null,
       JSON.stringify(Array.isArray(certifications) ? certifications : []),
       JSON.stringify(Array.isArray(training_completed) ? training_completed : []),
       score]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/skills/:id', async (req, res) => {
  try {
    const { certifications, training_completed, proficiency_score, role, member_name, member_email } = req.body;
    const score = proficiency_score !== undefined ? Math.min(100, Math.max(0, parseInt(proficiency_score, 10) || 0)) : null;

    const r = await pool.query(
      `UPDATE team_skills
       SET certifications = COALESCE($1, certifications),
           training_completed = COALESCE($2, training_completed),
           proficiency_score = COALESCE($3, proficiency_score),
           role = COALESCE($4, role),
           member_name = COALESCE($5, member_name),
           member_email = COALESCE($6, member_email),
           last_updated = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [certifications ? JSON.stringify(certifications) : null,
       training_completed ? JSON.stringify(training_completed) : null,
       score,
       role ?? null,
       member_name ? member_name.trim() : null,
       member_email ?? null,
       req.params.id, req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM team_skills WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----- Multi-Site Portfolio Scorecard -----
router.get('/portfolio', async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(
      `SELECT id, title, url, ai_result, created_at FROM website_scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [userId]
    );
    const sites = r.rows;
    const sitesWithScore = sites.map((s) => {
      const ai = s.ai_result || {};
      const score = typeof ai.overall_score === 'number' ? ai.overall_score
        : (Array.isArray(ai.issues) ? Math.max(0, 100 - ai.issues.length * 5) : null);
      const issuesCount = Array.isArray(ai.issues) ? ai.issues.length : (ai.issues_count || 0);
      const criticalCount = Array.isArray(ai.issues)
        ? ai.issues.filter(i => i.severity === 'critical').length
        : (ai.critical_count || 0);
      let band = 'unknown';
      if (score !== null) {
        if (score >= 90) band = 'AAA';
        else if (score >= 80) band = 'AA';
        else if (score >= 60) band = 'A';
        else band = 'below_A';
      }
      return {
        id: s.id, title: s.title, url: s.url,
        score, issues: issuesCount, critical: criticalCount, band,
        last_scanned: s.created_at,
        wcag_level: ai.wcag_level || null,
      };
    });

    const totalSites = sitesWithScore.length;
    const scored = sitesWithScore.filter(s => s.score !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)
      : null;
    const belowAA = sitesWithScore.filter(s => s.score !== null && s.score < 80);
    const belowAACount = belowAA.length;
    const alerts = belowAA.slice(0, 10).map(s => ({
      id: s.id,
      title: s.title,
      url: s.url,
      score: s.score,
      message: `Score ${s.score} is below AA threshold (80)`,
    }));

    // Band distribution summary
    const bandDistribution = sitesWithScore.reduce((acc, s) => {
      acc[s.band] = (acc[s.band] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total_sites: totalSites,
      average_score: avgScore,
      below_aa_count: belowAACount,
      band_distribution: bandDistribution,
      alerts,
      sites: sitesWithScore,
    });
  } catch (err) {
    console.error('Portfolio scorecard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, publicRouter };
