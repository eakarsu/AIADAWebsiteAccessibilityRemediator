const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// All AI routes require authentication
router.use(auth);

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
// Use a capable model; override via env for cost tuning
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// Feature-specific AI system prompts
const featurePrompts = {
  'website-scans': {
    table: 'website_scans',
    systemPrompt:
      'You are an expert ADA accessibility auditor. Analyze the given website URL and provide a detailed accessibility audit covering WCAG 2.1 compliance, common issues, and severity ratings. Return ONLY valid JSON (no markdown fences) with the following fields: "summary" (brief overview), "issues" (array of objects with "description", "severity" (critical/major/minor), "wcag_criteria", "element", and "recommendation"), "overall_score" (0-100), "wcag_level" ("A", "AA", or "AAA"), "estimated_fix_hours" (number), "top_priorities" (array of 3 strings).',
  },
  'wcag-checks': {
    table: 'wcag_checks',
    systemPrompt:
      'You are a WCAG 2.1 compliance specialist. Analyze the provided web page or content against all WCAG 2.1 Level A, AA, and AAA success criteria. Return ONLY valid JSON with "level_a" (array of criteria results), "level_aa" (array of criteria results), "level_aaa" (array of criteria results), each containing "criterion", "status" (pass/fail/review), and "details". Include "overall_compliance" (the highest compliance level achieved: "A", "AA", "AAA", or "none") and "overall_score" (0-100).',
  },
  'alt-texts': {
    table: 'alt_texts',
    systemPrompt:
      'You are an expert at creating descriptive, accessible alt text for images. Generate appropriate alt text that conveys the image\'s content and context for screen reader users. Return ONLY valid JSON with "alt_text" (125 chars or fewer), "detailed_description" (longer description for complex images), "context_notes" (when to use decorative vs informative alt text), "wcag_compliance" (WCAG criteria satisfied), and "overall_score" (0-100).',
  },
  'color-contrasts': {
    table: 'color_contrasts',
    systemPrompt:
      'You are a color contrast and visual accessibility expert. Analyze the provided color combinations and UI elements for WCAG 2.1 contrast ratio compliance. Return ONLY valid JSON with "contrast_pairs" (array of objects with "foreground", "background", "ratio", "passes_aa", "passes_aaa", "passes_aa_large"), "issues" (array of contrast problems), "recommendations" (array of suggested color alternatives), "overall_assessment" (summary), and "overall_score" (0-100).',
  },
  'screen-reader': {
    table: 'screen_reader_optimizations',
    systemPrompt:
      'You are a screen reader compatibility expert specializing in JAWS, NVDA, and VoiceOver. Analyze the provided HTML or web page content and suggest optimizations for screen reader users. Return ONLY valid JSON with "issues" (array with "element", "problem", "severity", "fix"), "reading_order" (assessment), "landmarks" (ARIA landmarks assessment), "live_regions" (dynamic content assessment), "recommendations" (prioritized improvements), and "overall_score" (0-100).',
  },
  'keyboard-audits': {
    table: 'keyboard_audits',
    systemPrompt:
      'You are a keyboard accessibility specialist. Analyze the provided web page or component for keyboard navigation compliance under WCAG 2.1. Return ONLY valid JSON with "tab_order" (assessment), "focus_indicators" (assessment), "keyboard_traps" (detected traps), "interactive_elements" (array with keyboard accessibility status), "shortcut_conflicts" (conflicting shortcuts), "recommendations" (prioritized fixes), and "overall_score" (0-100).',
  },
  'aria-labels': {
    table: 'aria_labels',
    systemPrompt:
      'You are an ARIA specialist. Generate proper ARIA labels, roles, and properties for the provided HTML elements. Return ONLY valid JSON with "elements" (array with "original_html", "suggested_aria" containing "role", "aria-label", "aria-describedby", "aria-live", and other relevant ARIA attributes), "patterns" (common ARIA patterns applicable), "warnings" (potential ARIA misuse), and "overall_score" (0-100).',
  },
  'accessibility-reports': {
    table: 'accessibility_reports',
    systemPrompt:
      'You are an accessibility reporting specialist. Generate a comprehensive accessibility audit report. Return ONLY valid JSON with "executive_summary", "methodology", "findings" (array with "category", "description", "severity", "wcag_criteria", "affected_pages", "screenshots_needed"), "statistics" (issue counts by severity and category), "compliance_status" (current WCAG level), "next_steps" (immediate actions), and "overall_score" (0-100).',
  },
  'remediation-plans': {
    table: 'remediation_plans',
    systemPrompt:
      'You are an accessibility remediation planning expert. Create a detailed, step-by-step remediation plan. Return ONLY valid JSON with "phases" (array with "phase_number", "name", "duration_estimate", "tasks" containing "task", "priority", "effort_estimate", "technical_details", "acceptance_criteria"), "total_timeline", "resource_requirements", "testing_plan", and "overall_score" (0-100 representing plan completeness).',
  },
  'legal-assessments': {
    table: 'legal_assessments',
    systemPrompt:
      'You are an ADA legal compliance specialist. Assess the provided website for ADA litigation risk. Return ONLY valid JSON with "risk_level" (high/medium/low), "risk_score" (0-100), "legal_frameworks" (applicable laws), "compliance_gaps" (array with "gap", "legal_risk", "precedent_cases"), "demand_letter_risk" (assessment), "recommendations" (risk mitigation steps), "disclaimer" (not legal advice note), and "overall_score" (0-100).',
  },
  'pdf-checks': {
    table: 'pdf_checks',
    systemPrompt:
      'You are a PDF accessibility expert. Analyze the provided PDF or description for PDF/UA and WCAG compliance. Return ONLY valid JSON with "tagged_structure", "reading_order", "alternative_text", "form_fields", "tables", "language", "bookmarks", "issues" (array with "description", "severity", "location", "fix"), "pdf_ua_compliance", and "overall_score" (0-100).',
  },
  'form-analyses': {
    table: 'form_analyses',
    systemPrompt:
      'You are a form accessibility specialist. Analyze the provided web form for WCAG 2.1 compliance. Return ONLY valid JSON with "labels", "error_handling", "instructions", "required_fields", "input_types", "grouping", "autocomplete", "validation", "issues" (array with "field", "problem", "severity", "fix"), and "overall_score" (0-100).',
  },
  'video-captions': {
    table: 'video_captions',
    systemPrompt:
      'You are a video accessibility and captioning expert. Return ONLY valid JSON with "captions" (array with "timestamp_start", "timestamp_end", "text", "speaker"), "transcript" (full text), "audio_description" (suggested descriptions), "caption_quality" (assessment), "compliance" (WCAG 1.2 compliance), "recommendations", and "overall_score" (0-100).',
  },
  readability: {
    table: 'readability_analyses',
    systemPrompt:
      'You are a content readability and plain language expert. Return ONLY valid JSON with "flesch_kincaid_grade", "flesch_reading_ease", "gunning_fog_index", "average_sentence_length", "average_word_length", "complex_words" (array with simpler alternatives), "jargon" (identified terms), "recommendations" (specific improvements), "wcag_compliance" (WCAG 3.1 assessment), and "overall_score" (0-100).',
  },
  'accessibility-policies': {
    table: 'accessibility_policies',
    systemPrompt:
      'You are an accessibility policy and compliance documentation expert. Return ONLY valid JSON with "policy_statement" (full accessibility statement text), "commitment" (org accessibility commitment), "standards" (WCAG and legal standards), "contact_information" (feedback mechanism language), "known_limitations" (template for known issues), "remediation_timeline", "third_party" (disclaimer language), "review_schedule" (recommended frequency), and "overall_score" (0-100).',
  },
};

/**
 * Robust JSON parser: tries JSON.parse, strips markdown fences, extracts from text.
 */
function parseAIJson(text) {
  if (!text) return null;
  // Direct parse
  try { return JSON.parse(text); } catch(e) {}
  // Strip markdown fences
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch(e) {}
  // Extract first JSON object
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch(e) {} }
  return null;
}

/**
 * Try to extract required fields (summary, issues, overall_score) from markdown/text
 * when JSON parsing fails completely.
 */
function extractFromMarkdown(text) {
  const extracted = {};

  const scoreMatch = text.match(/overall[_\s]score["\s:]+(\d+)/i);
  if (scoreMatch) extracted.overall_score = parseInt(scoreMatch[1], 10);

  const summaryMatch = text.match(/(?:summary|overview)["\s:]+([^\n#]{20,200})/i);
  if (summaryMatch) extracted.summary = summaryMatch[1].trim();

  const issueLines = [];
  const bulletRegex = /^[\s]*[-*•]\s+(.+)$/gm;
  let match;
  while ((match = bulletRegex.exec(text)) !== null) {
    issueLines.push({ description: match[1].trim(), severity: 'unknown' });
  }
  if (issueLines.length > 0) extracted.issues = issueLines;

  return extracted;
}

/**
 * Parse AI content: try JSON first, then extract from markdown.
 */
function parseAiContent(aiContent, feature) {
  const parsed = parseAIJson(aiContent);

  if (parsed) {
    const hasRequired = parsed.summary !== undefined || parsed.issues !== undefined || parsed.overall_score !== undefined;
    if (!hasRequired) {
      console.warn(`[AI][${feature}] Parsed JSON missing expected fields. Proceeding with what was returned.`);
    }
    return parsed;
  }

  // Attempt to extract from markdown text
  const extracted = extractFromMarkdown(aiContent);
  if (Object.keys(extracted).length > 0) {
    console.warn(`[AI][${feature}] Extracted partial fields from markdown: ${Object.keys(extracted).join(', ')}`);
    extracted.raw_response = aiContent;
    return extracted;
  }

  console.error(`[AI][${feature}] Could not parse or extract structured data from AI response.`);
  return { raw_response: aiContent };
}

/**
 * Persist AI result to audit history table and optionally record score history.
 */
async function persistAiResult(userId, feature, itemId, tableName, aiResult, model, usage) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, item_id, table_name, ai_result, model, prompt_tokens, completion_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, feature, itemId || null, tableName, JSON.stringify(aiResult), model,
       usage?.prompt_tokens || null, usage?.completion_tokens || null]
    );

    // If the result has an overall_score and we have an itemId, record it in score_history
    if (itemId && typeof aiResult.overall_score === 'number') {
      await pool.query(
        `INSERT INTO score_history (user_id, item_id, feature_type, table_name, score)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, itemId, feature, tableName, aiResult.overall_score]
      );
    }
  } catch (err) {
    console.error('[AI] Failed to persist ai_result:', err.message);
  }
}

// POST /api/ai/remediate - Generate fixed HTML + ARIA for an accessibility issue
// NOTE: This must be registered BEFORE /:feature to avoid being swallowed by the wildcard
router.post('/remediate', async (req, res) => {
  try {
    const { issue_type, element_html, wcag_criteria } = req.body;
    const userId = req.user.id;

    if (!issue_type || !element_html) {
      return res.status(400).json({ error: 'issue_type and element_html are required.' });
    }

    if (typeof element_html !== 'string' || element_html.length > 50000) {
      return res.status(400).json({ error: 'element_html must be a string under 50,000 characters.' });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = OPENROUTER_MODEL;

    if (!openrouterApiKey) {
      return res.status(500).json({ error: 'OpenRouter API key is not configured.' });
    }

    const systemPrompt = `You are an expert web accessibility engineer specializing in WCAG 2.1 remediation.
Given an HTML element with an accessibility issue, generate the fixed HTML with proper ARIA attributes.
Return ONLY valid JSON (no markdown fences) containing:
- "fixed_html": the corrected HTML string
- "aria_changes": array of objects with "attribute" and "value" for each ARIA change made
- "explanation": brief explanation of what was fixed and why
- "wcag_criteria_addressed": array of WCAG criteria this fix addresses
- "overall_score": 0-100 representing how complete the fix is`;

    const userPrompt = `Issue type: ${issue_type}
${wcag_criteria ? `WCAG criteria: ${wcag_criteria}` : ''}
Original HTML:
${element_html}

Generate the fixed, accessible HTML.`;

    const response = await fetch(OPENROUTER_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error (remediate):', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to get response from AI service.' });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    const usage = aiData.usage;

    if (!aiContent) {
      return res.status(502).json({ error: 'Empty response from AI service.' });
    }

    const aiResult = parseAiContent(aiContent, 'remediate');
    const fixedHtml = aiResult.fixed_html || element_html;

    // Save to remediations table
    const saved = await pool.query(
      `INSERT INTO remediations (user_id, issue_type, original_html, fixed_html, wcag_criteria, ai_result)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, issue_type, element_html, fixedHtml, wcag_criteria || null, JSON.stringify(aiResult)]
    );

    // Persist to ai_results audit table
    await persistAiResult(userId, 'remediate', null, 'remediations', aiResult, openrouterModel, usage);

    res.status(201).json({
      remediation: saved.rows[0],
      ai_result: aiResult,
    });
  } catch (err) {
    console.error('Remediate route error:', err.message);
    res.status(500).json({ error: 'Server error during remediation.' });
  }
});

// POST /api/ai/validate-fix - Validate that a remediation actually fixes the issue
// Audit-recommended: AI fix validation (verify fix is correct before applying)
// NOTE: Must be registered BEFORE /:feature to avoid being swallowed by the wildcard
router.post('/validate-fix', async (req, res) => {
  try {
    const { issue_type, original_html, fixed_html, wcag_criteria } = req.body;
    const userId = req.user.id;

    if (!issue_type || !original_html || !fixed_html) {
      return res.status(400).json({ error: 'issue_type, original_html and fixed_html are required.' });
    }
    if (typeof fixed_html !== 'string' || fixed_html.length > 50000) {
      return res.status(400).json({ error: 'fixed_html must be a string under 50,000 characters.' });
    }
    if (typeof original_html !== 'string' || original_html.length > 50000) {
      return res.status(400).json({ error: 'original_html must be a string under 50,000 characters.' });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return res.status(500).json({ error: 'OpenRouter API key is not configured.' });
    }

    const systemPrompt = `You are an expert WCAG 2.1 accessibility auditor reviewing a proposed remediation. Compare the original HTML against the fixed HTML and decide whether the fix correctly addresses the stated accessibility issue. Return ONLY valid JSON (no markdown fences):
{
  "is_valid": boolean,
  "confidence": "Low|Medium|High",
  "issues_resolved": ["string", "string"],
  "issues_remaining": ["string", "string"],
  "regressions_introduced": ["string", "string"],
  "wcag_criteria_addressed": ["string"],
  "wcag_criteria_missed": ["string"],
  "recommended_changes": ["string", "string"],
  "rollback_recommended": boolean,
  "rollback_reason": "string",
  "overall_score": number
}`;

    const userPrompt = `Issue type: ${issue_type}
${wcag_criteria ? `WCAG criteria: ${wcag_criteria}` : ''}
Original HTML:
${original_html}

Fixed HTML:
${fixed_html}

Determine whether the fix is correct and complete.`;

    const response = await fetch(OPENROUTER_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error (validate-fix):', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to get response from AI service.' });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    const usage = aiData.usage;
    if (!aiContent) {
      return res.status(502).json({ error: 'Empty response from AI service.' });
    }

    const aiResult = parseAiContent(aiContent, 'validate-fix');
    await persistAiResult(userId, 'validate-fix', null, 'remediations', aiResult, OPENROUTER_MODEL, usage);

    res.json({
      validation: aiResult,
      model: OPENROUTER_MODEL,
    });
  } catch (err) {
    console.error('Validate-fix route error:', err.message);
    res.status(500).json({ error: 'Server error during fix validation.' });
  }
});

// POST /api/ai/bulk-remediate - Remediate a batch of issues in one call
// Audit-recommended: Bulk remediation across whole site
// PRODUCT-DECISION: Cap at 25 issues per request (synchronous loop, no queue infra) to keep
// memory/latency bounded without adding a job queue dependency. Each issue runs through the
// same AI pipeline as /remediate. Failures are recorded per-issue so the batch never aborts.
// ENV: OPENROUTER_API_KEY (returns 503 missing if unset)
// NOTE: Must be registered BEFORE /:feature to avoid being swallowed by the wildcard.
router.post('/bulk-remediate', async (req, res) => {
  try {
    const { issues } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'issues must be a non-empty array.' });
    }
    if (issues.length > 25) {
      return res.status(400).json({ error: 'Maximum 25 issues per bulk request.' });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return res.status(503).json({ error: 'AI not configured.', missing: 'OPENROUTER_API_KEY' });
    }

    const systemPrompt = `You are an expert web accessibility engineer. Given an HTML element with an accessibility issue, return ONLY valid JSON: {"fixed_html":"...","aria_changes":[{"attribute":"...","value":"..."}],"explanation":"...","wcag_criteria_addressed":["..."],"overall_score":0-100}`;

    const results = [];
    for (const issue of issues) {
      const { issue_type, element_html, wcag_criteria } = issue || {};
      if (!issue_type || typeof element_html !== 'string' || element_html.length === 0 || element_html.length > 50000) {
        results.push({ ok: false, error: 'invalid issue (issue_type/element_html required, <=50k chars)', issue });
        continue;
      }
      try {
        const userPrompt = `Issue type: ${issue_type}\n${wcag_criteria ? `WCAG criteria: ${wcag_criteria}\n` : ''}Original HTML:\n${element_html}\n\nGenerate the fixed, accessible HTML.`;
        const response = await fetch(OPENROUTER_BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openrouterApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });
        if (!response.ok) {
          results.push({ ok: false, error: `AI service error: ${response.status}`, issue });
          continue;
        }
        const aiData = await response.json();
        const aiContent = aiData.choices?.[0]?.message?.content;
        const usage = aiData.usage;
        if (!aiContent) {
          results.push({ ok: false, error: 'empty AI response', issue });
          continue;
        }
        const aiResult = parseAiContent(aiContent, 'bulk-remediate');
        const fixedHtml = aiResult.fixed_html || element_html;
        const saved = await pool.query(
          `INSERT INTO remediations (user_id, issue_type, original_html, fixed_html, wcag_criteria, ai_result)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [userId, issue_type, element_html, fixedHtml, wcag_criteria || null, JSON.stringify(aiResult)]
        );
        await persistAiResult(userId, 'bulk-remediate', saved.rows[0].id, 'remediations', aiResult, OPENROUTER_MODEL, usage);
        results.push({ ok: true, remediation_id: saved.rows[0].id, ai_result: aiResult });
      } catch (e) {
        results.push({ ok: false, error: e.message || 'unknown error', issue });
      }
    }

    const successCount = results.filter(r => r.ok).length;
    res.json({
      total: issues.length,
      success: successCount,
      failed: issues.length - successCount,
      results,
      model: OPENROUTER_MODEL,
    });
  } catch (err) {
    console.error('Bulk-remediate route error:', err.message);
    res.status(500).json({ error: 'Server error during bulk remediation.' });
  }
});

// POST /api/ai/ab-test-fix - Compare two candidate fixes for the same issue
// Audit-recommended: A/B testing (test fixed vs. original alternatives)
// PRODUCT-DECISION: Define A/B as "compare candidate A vs candidate B against the same original".
// AI returns recommended winner, scoring per WCAG, regression notes, and rationale.
// ENV: OPENROUTER_API_KEY (returns 503 missing if unset)
// NOTE: Must be registered BEFORE /:feature.
router.post('/ab-test-fix', async (req, res) => {
  try {
    const { issue_type, original_html, candidate_a, candidate_b, wcag_criteria } = req.body;
    const userId = req.user.id;

    if (!issue_type || !original_html || !candidate_a || !candidate_b) {
      return res.status(400).json({ error: 'issue_type, original_html, candidate_a and candidate_b are required.' });
    }
    for (const [k, v] of [['original_html', original_html], ['candidate_a', candidate_a], ['candidate_b', candidate_b]]) {
      if (typeof v !== 'string' || v.length > 50000) {
        return res.status(400).json({ error: `${k} must be a string under 50,000 characters.` });
      }
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return res.status(503).json({ error: 'AI not configured.', missing: 'OPENROUTER_API_KEY' });
    }

    const systemPrompt = `You are an expert WCAG 2.1 reviewer running an A/B comparison of two candidate accessibility fixes against the same original HTML. Score each candidate, identify regressions, and pick a winner. Return ONLY valid JSON:
{
  "winner": "A|B|tie",
  "candidate_a": {"score": number, "issues_resolved": ["..."], "regressions": ["..."], "wcag_addressed": ["..."]},
  "candidate_b": {"score": number, "issues_resolved": ["..."], "regressions": ["..."], "wcag_addressed": ["..."]},
  "rationale": "string",
  "recommendation": "string",
  "overall_score": number
}`;

    const userPrompt = `Issue type: ${issue_type}
${wcag_criteria ? `WCAG criteria: ${wcag_criteria}\n` : ''}Original HTML:
${original_html}

Candidate A:
${candidate_a}

Candidate B:
${candidate_b}

Determine which candidate better fixes the issue and why.`;

    const response = await fetch(OPENROUTER_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openrouterApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error (ab-test-fix):', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to get response from AI service.' });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    const usage = aiData.usage;
    if (!aiContent) {
      return res.status(502).json({ error: 'Empty response from AI service.' });
    }

    const aiResult = parseAiContent(aiContent, 'ab-test-fix');
    await persistAiResult(userId, 'ab-test-fix', null, 'remediations', aiResult, OPENROUTER_MODEL, usage);

    res.json({ comparison: aiResult, model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AB-test-fix route error:', err.message);
    res.status(500).json({ error: 'Server error during A/B test.' });
  }
});

// POST /api/ai/:feature - Run AI analysis for a specific feature
router.post('/:feature', async (req, res) => {
  try {
    const { feature } = req.params;
    const { prompt, itemId } = req.body;
    const userId = req.user.id;

    // Validate feature exists
    const featureConfig = featurePrompts[feature];
    if (!featureConfig) {
      return res.status(400).json({
        error: `Unknown feature: ${feature}. Valid features: ${Object.keys(featurePrompts).join(', ')}`,
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string.' });
    }

    if (prompt.length > 100000) {
      return res.status(400).json({ error: 'Prompt too large. Max 100,000 characters.' });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = OPENROUTER_MODEL;

    if (!openrouterApiKey) {
      return res.status(500).json({
        error: 'OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env file.',
      });
    }

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          { role: 'system', content: featureConfig.systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error:', response.status, errorBody);
      return res.status(502).json({
        error: 'Failed to get response from AI service.',
        details: errorBody,
      });
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    const usage = aiData.usage;

    if (!aiContent) {
      return res.status(502).json({ error: 'Empty response from AI service.' });
    }

    // Parse AI response with validation and fallback extraction
    const aiResult = parseAiContent(aiContent, feature);

    // If itemId is provided, verify ownership and save the result
    if (itemId) {
      const ownerCheck = await pool.query(
        `SELECT id FROM ${featureConfig.table} WHERE id = $1 AND user_id = $2`,
        [itemId, userId]
      );
      if (ownerCheck.rows.length > 0) {
        await pool.query(
          `UPDATE ${featureConfig.table} SET ai_result = $1, status = 'completed', updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(aiResult), itemId]
        );
      }
    }

    // Always persist the AI call to history
    await persistAiResult(userId, feature, itemId || null, featureConfig.table, aiResult, openrouterModel, usage);

    res.json({
      feature,
      ai_result: aiResult,
      item_id: itemId || null,
      model: openrouterModel,
    });
  } catch (err) {
    console.error('AI route error:', err.message);
    res.status(500).json({ error: 'Server error during AI analysis.' });
  }
});

// GET /api/ai/history - Get AI call history for the authenticated user
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const feature = req.query.feature || null;

    const whereClause = feature
      ? 'WHERE user_id = $1 AND feature = $4'
      : 'WHERE user_id = $1';

    const countParams = feature ? [userId, limit, offset, feature] : [userId, limit, offset];

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ai_results WHERE user_id = $1 ${feature ? 'AND feature = $2' : ''}`,
      feature ? [userId, feature] : [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(
      `SELECT id, feature, item_id, table_name, model, prompt_tokens, completion_tokens, created_at
       FROM ai_results WHERE user_id = $1 ${feature ? 'AND feature = $2' : ''}
       ORDER BY created_at DESC LIMIT $${feature ? 3 : 2} OFFSET $${feature ? 4 : 3}`,
      feature ? [userId, feature, limit, offset] : [userId, limit, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('AI history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch AI history.' });
  }
});

module.exports = router;
