const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Feature-specific AI system prompts
const featurePrompts = {
  'website-scans': {
    table: 'website_scans',
    systemPrompt:
      'You are an expert ADA accessibility auditor. Analyze the given website URL and provide a detailed accessibility audit covering WCAG 2.1 compliance, common issues, and severity ratings. Structure your response as a JSON object with the following fields: "summary" (brief overview), "issues" (array of objects with "description", "severity" (critical/major/minor), "wcag_criteria", and "recommendation"), and "overall_score" (0-100).',
  },
  'wcag-checks': {
    table: 'wcag_checks',
    systemPrompt:
      'You are a WCAG 2.1 compliance specialist. Analyze the provided web page or content against all WCAG 2.1 Level A, AA, and AAA success criteria. For each criterion, indicate whether it passes, fails, or needs manual review. Structure your response as a JSON object with "level_a" (array of criteria results), "level_aa" (array of criteria results), "level_aaa" (array of criteria results), each containing "criterion", "status" (pass/fail/review), and "details". Include an "overall_compliance" field with the compliance level achieved.',
  },
  'alt-texts': {
    table: 'alt_texts',
    systemPrompt:
      'You are an expert at creating descriptive, accessible alt text for images. Generate appropriate alt text that conveys the image\'s content and context for screen reader users. Follow WCAG 2.1 guidelines for text alternatives. Structure your response as a JSON object with "alt_text" (the generated alt text, 125 characters or fewer), "detailed_description" (a longer description for complex images), "context_notes" (notes about when to use decorative vs informative alt text), and "wcag_compliance" (which WCAG criteria this satisfies).',
  },
  'color-contrasts': {
    table: 'color_contrasts',
    systemPrompt:
      'You are a color contrast and visual accessibility expert. Analyze the provided color combinations and UI elements for WCAG 2.1 contrast ratio compliance. Structure your response as a JSON object with "contrast_pairs" (array of objects with "foreground", "background", "ratio", "passes_aa" (boolean), "passes_aaa" (boolean), "passes_aa_large" (boolean)), "issues" (array of contrast problems found), "recommendations" (array of suggested color alternatives that meet WCAG requirements), and "overall_assessment" (summary of color accessibility).',
  },
  'screen-reader': {
    table: 'screen_reader_optimizations',
    systemPrompt:
      'You are a screen reader compatibility expert specializing in JAWS, NVDA, and VoiceOver. Analyze the provided HTML or web page content and suggest optimizations for screen reader users. Structure your response as a JSON object with "issues" (array of objects with "element", "problem", "severity", "fix"), "reading_order" (assessment of logical reading order), "landmarks" (assessment of ARIA landmarks usage), "live_regions" (assessment of dynamic content announcements), and "recommendations" (prioritized list of improvements).',
  },
  'keyboard-audits': {
    table: 'keyboard_audits',
    systemPrompt:
      'You are a keyboard accessibility specialist. Analyze the provided web page or component for keyboard navigation compliance under WCAG 2.1. Structure your response as a JSON object with "tab_order" (assessment of tab order logic), "focus_indicators" (assessment of visible focus styles), "keyboard_traps" (any detected keyboard traps), "interactive_elements" (array of elements with keyboard accessibility status), "shortcut_conflicts" (any conflicting keyboard shortcuts), and "recommendations" (prioritized fixes for keyboard accessibility).',
  },
  'aria-labels': {
    table: 'aria_labels',
    systemPrompt:
      'You are an ARIA (Accessible Rich Internet Applications) specialist. Generate proper ARIA labels, roles, and properties for the provided HTML elements or web components. Structure your response as a JSON object with "elements" (array of objects with "original_html", "suggested_aria" containing "role", "aria-label", "aria-describedby", "aria-live", and other relevant ARIA attributes), "patterns" (common ARIA patterns applicable), and "warnings" (potential ARIA misuse to avoid).',
  },
  'accessibility-reports': {
    table: 'accessibility_reports',
    systemPrompt:
      'You are an accessibility reporting specialist. Generate a comprehensive accessibility audit report for the provided website or application. Structure your response as a JSON object with "executive_summary" (high-level findings), "methodology" (testing methods used), "findings" (array of objects with "category", "description", "severity", "wcag_criteria", "affected_pages", "screenshots_needed"), "statistics" (issue counts by severity and category), "compliance_status" (current WCAG compliance level), and "next_steps" (recommended immediate actions).',
  },
  'remediation-plans': {
    table: 'remediation_plans',
    systemPrompt:
      'You are an accessibility remediation planning expert. Create a detailed, step-by-step remediation plan for fixing the identified accessibility issues. Structure your response as a JSON object with "phases" (array of objects with "phase_number", "name", "duration_estimate", "tasks" array containing "task", "priority" (critical/high/medium/low), "effort_estimate", "technical_details", "acceptance_criteria"), "total_timeline" (estimated total duration), "resource_requirements" (skills and tools needed), and "testing_plan" (how to verify fixes).',
  },
  'legal-assessments': {
    table: 'legal_assessments',
    systemPrompt:
      'You are an ADA legal compliance specialist. Assess the provided website or application for ADA litigation risk and legal compliance. Structure your response as a JSON object with "risk_level" (high/medium/low), "risk_score" (0-100), "legal_frameworks" (applicable laws and standards: ADA Title III, Section 508, state laws), "compliance_gaps" (array of objects with "gap", "legal_risk", "precedent_cases"), "demand_letter_risk" (likelihood assessment), "recommendations" (prioritized legal risk mitigation steps), and "disclaimer" (note that this is not legal advice).',
  },
  'pdf-checks': {
    table: 'pdf_checks',
    systemPrompt:
      'You are a PDF accessibility expert specializing in PDF/UA and WCAG compliance. Analyze the provided PDF document or its description for accessibility issues. Structure your response as a JSON object with "tagged_structure" (assessment of PDF tag structure), "reading_order" (logical reading order assessment), "alternative_text" (image alt text assessment), "form_fields" (form accessibility assessment), "tables" (table structure assessment), "language" (document language specification), "bookmarks" (navigation structure), "issues" (array with "description", "severity", "location", "fix"), and "pdf_ua_compliance" (PDF/UA standard compliance status).',
  },
  'form-analyses': {
    table: 'form_analyses',
    systemPrompt:
      'You are a form accessibility specialist. Analyze the provided web form for accessibility compliance under WCAG 2.1. Structure your response as a JSON object with "labels" (assessment of form label associations), "error_handling" (error message accessibility), "instructions" (form instruction clarity and placement), "required_fields" (required field indication assessment), "input_types" (appropriate input type usage), "grouping" (fieldset and legend usage), "autocomplete" (autocomplete attribute usage), "validation" (client-side validation accessibility), "issues" (array with "field", "problem", "severity", "fix"), and "overall_score" (0-100).',
  },
  'video-captions': {
    table: 'video_captions',
    systemPrompt:
      'You are a video accessibility and captioning expert. Generate captions, transcripts, or analyze video content for accessibility compliance. Structure your response as a JSON object with "captions" (array of objects with "timestamp_start", "timestamp_end", "text", "speaker" if applicable), "transcript" (full text transcript), "audio_description" (suggested audio descriptions for visual content), "caption_quality" (assessment of caption accuracy and timing), "compliance" (WCAG 1.2 criteria compliance status), and "recommendations" (improvements for video accessibility).',
  },
  readability: {
    table: 'readability_analyses',
    systemPrompt:
      'You are a content readability and plain language expert. Analyze the provided text content for readability levels and accessibility. Structure your response as a JSON object with "flesch_kincaid_grade" (estimated grade level), "flesch_reading_ease" (estimated score 0-100), "gunning_fog_index" (estimated index), "average_sentence_length" (words per sentence), "average_word_length" (syllables per word), "complex_words" (array of complex words with simpler alternatives), "jargon" (identified jargon terms), "recommendations" (specific suggestions to improve readability), and "wcag_compliance" (WCAG 3.1 criteria assessment).',
  },
  'accessibility-policies': {
    table: 'accessibility_policies',
    systemPrompt:
      'You are an accessibility policy and compliance documentation expert. Generate a comprehensive accessibility policy or statement for the provided organization or website. Structure your response as a JSON object with "policy_statement" (the full accessibility statement/policy text), "commitment" (organization accessibility commitment language), "standards" (WCAG and legal standards referenced), "contact_information" (suggested feedback mechanism language), "known_limitations" (template for documenting known issues), "remediation_timeline" (template for fix timelines), "third_party" (third-party content disclaimer language), and "review_schedule" (recommended policy review frequency).',
  },
};

// POST /api/ai/:feature - Run AI analysis for a specific feature
router.post('/:feature', async (req, res) => {
  try {
    const { feature } = req.params;
    const { prompt, itemId } = req.body;

    // Validate feature exists
    const featureConfig = featurePrompts[feature];
    if (!featureConfig) {
      return res.status(400).json({
        error: `Unknown feature: ${feature}. Valid features: ${Object.keys(featurePrompts).join(', ')}`,
      });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const openrouterBaseUrl =
      process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel =
      process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

    if (!openrouterApiKey) {
      return res.status(500).json({
        error: 'OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env file.',
      });
    }

    // Call OpenRouter API
    const response = await fetch(openrouterBaseUrl + '/chat/completions', {
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
    const aiContent =
      aiData.choices &&
      aiData.choices[0] &&
      aiData.choices[0].message &&
      aiData.choices[0].message.content;

    if (!aiContent) {
      return res.status(502).json({ error: 'Empty response from AI service.' });
    }

    // Try to parse AI response as JSON, fall back to raw text
    let aiResult;
    try {
      aiResult = JSON.parse(aiContent);
    } catch {
      aiResult = { raw_response: aiContent };
    }

    // If itemId is provided, save the result back to the database
    if (itemId) {
      await pool.query(
        `UPDATE ${featureConfig.table} SET ai_result = $1, status = 'completed', updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(aiResult), itemId]
      );
    }

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

module.exports = router;
