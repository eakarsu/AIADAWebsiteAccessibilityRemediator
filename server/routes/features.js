const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// All feature routes require authentication
router.use(auth);

// Factory function to create CRUD routes for a feature table
function createFeatureRoutes(tableName) {
  const featureRouter = express.Router();

  // GET /api/:routePath?page=1&limit=20 - list user's items with pagination
  featureRouter.get('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = $1`,
        [userId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await pool.query(
        `SELECT * FROM ${tableName} WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      res.json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err.message);
      res.status(500).json({ error: `Failed to fetch ${tableName}.` });
    }
  });

  // GET /api/:routePath/:id - get single item (user-scoped)
  featureRouter.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT * FROM ${tableName} WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(`Error fetching ${tableName} item:`, err.message);
      res.status(500).json({ error: `Failed to fetch item from ${tableName}.` });
    }
  });

  // POST /api/:routePath - create new item (scoped to user)
  featureRouter.post('/', async (req, res) => {
    try {
      const { title, description, url, status } = req.body;
      const userId = req.user.id;

      // Validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required.' });
      }
      if (title.trim().length > 255) {
        return res.status(400).json({ error: 'Title must be 255 characters or fewer.' });
      }
      if (description && typeof description !== 'string') {
        return res.status(400).json({ error: 'Description must be a string.' });
      }
      if (description && description.length > 10000) {
        return res.status(400).json({ error: 'Description must be 10,000 characters or fewer.' });
      }
      if (url && typeof url !== 'string') {
        return res.status(400).json({ error: 'URL must be a string.' });
      }
      if (url && url.length > 500) {
        return res.status(400).json({ error: 'URL must be 500 characters or fewer.' });
      }
      const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'scanning'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const result = await pool.query(
        `INSERT INTO ${tableName} (user_id, title, description, url, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, title.trim(), description || null, url || null, status || 'pending']
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(`Error creating ${tableName} item:`, err.message);
      res.status(500).json({ error: `Failed to create item in ${tableName}.` });
    }
  });

  // PUT /api/:routePath/:id - update item (user-scoped)
  featureRouter.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, description, url, status, ai_result } = req.body;

      // Validation
      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        return res.status(400).json({ error: 'Title must be a non-empty string.' });
      }
      if (title && title.trim().length > 255) {
        return res.status(400).json({ error: 'Title must be 255 characters or fewer.' });
      }
      if (description !== undefined && description !== null && description.length > 10000) {
        return res.status(400).json({ error: 'Description must be 10,000 characters or fewer.' });
      }
      if (url !== undefined && url !== null && url.length > 500) {
        return res.status(400).json({ error: 'URL must be 500 characters or fewer.' });
      }
      const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'scanning'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const result = await pool.query(
        `UPDATE ${tableName}
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             url = COALESCE($3, url),
             status = COALESCE($4, status),
             ai_result = COALESCE($5, ai_result),
             updated_at = NOW()
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [title, description, url, status, ai_result ? JSON.stringify(ai_result) : null, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(`Error updating ${tableName} item:`, err.message);
      res.status(500).json({ error: `Failed to update item in ${tableName}.` });
    }
  });

  // DELETE /api/:routePath/:id - delete item (user-scoped)
  featureRouter.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const result = await pool.query(
        `DELETE FROM ${tableName} WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }
      res.json({ message: 'Item deleted successfully.', item: result.rows[0] });
    } catch (err) {
      console.error(`Error deleting ${tableName} item:`, err.message);
      res.status(500).json({ error: `Failed to delete item from ${tableName}.` });
    }
  });

  return featureRouter;
}

// Feature route mappings
const featureMappings = [
  { route: 'website-scans', table: 'website_scans' },
  { route: 'wcag-checks', table: 'wcag_checks' },
  { route: 'alt-texts', table: 'alt_texts' },
  { route: 'color-contrasts', table: 'color_contrasts' },
  { route: 'screen-reader', table: 'screen_reader_optimizations' },
  { route: 'keyboard-audits', table: 'keyboard_audits' },
  { route: 'aria-labels', table: 'aria_labels' },
  { route: 'accessibility-reports', table: 'accessibility_reports' },
  { route: 'remediation-plans', table: 'remediation_plans' },
  { route: 'legal-assessments', table: 'legal_assessments' },
  { route: 'pdf-checks', table: 'pdf_checks' },
  { route: 'form-analyses', table: 'form_analyses' },
  { route: 'video-captions', table: 'video_captions' },
  { route: 'readability', table: 'readability_analyses' },
  { route: 'accessibility-policies', table: 'accessibility_policies' },
];

// Counts endpoint for dashboard (user-scoped, real score)
router.get('/features/counts', async (req, res) => {
  try {
    const userId = req.user.id;
    const counts = {};
    let totalScans = 0;
    let issuesFound = 0;
    let totalScore = 0;
    let scoreCount = 0;

    const slugToFrontend = {
      'website-scans': 'website-accessibility-scanner',
      'wcag-checks': 'wcag-compliance-checker',
      'alt-texts': 'alt-text-generator',
      'color-contrasts': 'color-contrast-analyzer',
      'screen-reader': 'screen-reader-optimizer',
      'keyboard-audits': 'keyboard-navigation-auditor',
      'aria-labels': 'aria-label-generator',
      'accessibility-reports': 'accessibility-report-generator',
      'remediation-plans': 'remediation-plan-creator',
      'legal-assessments': 'legal-compliance-assessor',
      'pdf-checks': 'pdf-accessibility-checker',
      'form-analyses': 'form-accessibility-analyzer',
      'video-captions': 'video-caption-generator',
      'readability': 'readability-analyzer',
      'accessibility-policies': 'accessibility-policy-generator',
    };

    for (const { route, table } of featureMappings) {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1`,
        [userId]
      );
      const count = parseInt(result.rows[0].count, 10);
      const frontendSlug = slugToFrontend[route] || route;
      counts[frontendSlug] = count;
      totalScans += count;

      // Count items with issues (non-completed status) for this user
      const failedResult = await pool.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE user_id = $1 AND (status = 'failed' OR status = 'pending')`,
        [userId]
      );
      issuesFound += parseInt(failedResult.rows[0].count, 10);

      // Average scores from ai_result for this user
      const scoreResult = await pool.query(
        `SELECT ai_result->>'score' as score FROM ${table} WHERE user_id = $1 AND ai_result IS NOT NULL AND ai_result->>'score' IS NOT NULL`,
        [userId]
      );
      scoreResult.rows.forEach(row => {
        const s = parseFloat(row.score);
        if (!isNaN(s)) {
          totalScore += s;
          scoreCount++;
        }
      });
    }

    // Also aggregate overall_score from website_scans ai_result for the user
    const auditScoreResult = await pool.query(
      `SELECT ai_result->>'overall_score' as overall_score FROM website_scans WHERE user_id = $1 AND ai_result IS NOT NULL AND ai_result->>'overall_score' IS NOT NULL`,
      [userId]
    );
    auditScoreResult.rows.forEach(row => {
      const s = parseFloat(row.overall_score);
      if (!isNaN(s)) {
        totalScore += s;
        scoreCount++;
      }
    });

    res.json({
      counts,
      stats: {
        totalScans,
        issuesFound,
        // Use computed average; fall back to null (no fake hardcoded value)
        complianceScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : null,
      },
    });
  } catch (err) {
    console.error('Error fetching counts:', err.message);
    res.status(500).json({ error: 'Failed to fetch counts.' });
  }
});

// Register all feature routes
featureMappings.forEach(({ route, table }) => {
  router.use(`/${route}`, createFeatureRoutes(table));
});

module.exports = router;
module.exports.featureMappings = featureMappings;
