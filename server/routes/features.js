const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Factory function to create CRUD routes for a feature table
function createFeatureRoutes(tableName, routePath) {
  const featureRouter = express.Router();

  // GET /api/:routePath - list all items
  featureRouter.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${tableName} ORDER BY created_at DESC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err.message);
      res.status(500).json({ error: `Failed to fetch ${tableName}.` });
    }
  });

  // GET /api/:routePath/:id - get single item
  featureRouter.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [id]
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

  // POST /api/:routePath - create new item
  featureRouter.post('/', async (req, res) => {
    try {
      const { title, description, url, status } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
      }
      const result = await pool.query(
        `INSERT INTO ${tableName} (title, description, url, status) VALUES ($1, $2, $3, $4) RETURNING *`,
        [title, description || null, url || null, status || 'pending']
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(`Error creating ${tableName} item:`, err.message);
      res.status(500).json({ error: `Failed to create item in ${tableName}.` });
    }
  });

  // PUT /api/:routePath/:id - update item
  featureRouter.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, url, status, ai_result } = req.body;

      const result = await pool.query(
        `UPDATE ${tableName}
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             url = COALESCE($3, url),
             status = COALESCE($4, status),
             ai_result = COALESCE($5, ai_result),
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [title, description, url, status, ai_result ? JSON.stringify(ai_result) : null, id]
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

  // DELETE /api/:routePath/:id - delete item
  featureRouter.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
        [id]
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

// Counts endpoint for dashboard
router.get('/features/counts', async (req, res) => {
  try {
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
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count, 10);
      const frontendSlug = slugToFrontend[route] || route;
      counts[frontendSlug] = count;
      totalScans += count;

      // Count items with issues (non-completed status)
      const failedResult = await pool.query(`SELECT COUNT(*) as count FROM ${table} WHERE status = 'failed' OR status = 'pending'`);
      issuesFound += parseInt(failedResult.rows[0].count, 10);

      // Average scores from ai_result
      const scoreResult = await pool.query(`SELECT ai_result->>'score' as score FROM ${table} WHERE ai_result IS NOT NULL AND ai_result->>'score' IS NOT NULL`);
      scoreResult.rows.forEach(row => {
        const s = parseFloat(row.score);
        if (!isNaN(s)) {
          totalScore += s;
          scoreCount++;
        }
      });
    }

    res.json({
      counts,
      stats: {
        totalScans,
        issuesFound,
        complianceScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 78,
      },
    });
  } catch (err) {
    console.error('Error fetching counts:', err.message);
    res.status(500).json({ error: 'Failed to fetch counts.' });
  }
});

// Register all feature routes
featureMappings.forEach(({ route, table }) => {
  router.use(`/${route}`, createFeatureRoutes(table, route));
});

module.exports = router;
module.exports.featureMappings = featureMappings;
