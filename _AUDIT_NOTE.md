# Audit Apply Note — AIADAWebsiteAccessibilityRemediator

## Audit recommendations (from batch_00.md)

Template-clone tool with 4 route files, 3 AI endpoints.

### Missing AI counterparts
- AI fix validation (verify fix is correct before applying)
- AI rollback suggestion (undo if fix breaks design)

### Missing non-AI features
- Bulk remediation (apply to whole site)
- A/B testing (test fixed vs. original)
- Browser extension

### Custom feature suggestions
- Automated HTML remediation (already exists as `/remediate`)
- Browser extension
- Figma/Adobe XD plugin
- Compliance reporting (VPAT, accessibility statements) — already covered by `/accessibility-policies` feature

## Implemented in this pass

1. `POST /api/ai/validate-fix` — added to `server/routes/ai.js` before the `/:feature` wildcard. Takes issue_type, original_html, fixed_html, optional wcag_criteria; returns validity assessment, regressions, rollback recommendation, WCAG addressed/missed, overall score. Persists via existing `persistAiResult` helper. Covers both audit-listed missing AI items (validation + rollback suggestion in one endpoint).

Files touched:
- `server/routes/ai.js`

Syntax check: PASS.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| Bulk remediation across whole site | TOO-RISKY | Crawler + queue + DB schema |
| A/B testing fixed vs original | NEEDS-PRODUCT-DECISION | Test harness design |
| Browser extension | TOO-RISKY | New project surface |
| Figma plugin | TOO-RISKY | New project surface |

## Apply pass 3 (frontend)

- **Status:** FE already wired — no changes.
- `client/src/components/advanced/ValidateFixPage.jsx` already exists and calls `POST /api/ai/validate-fix` via the project's axios helper.
- `App.jsx` registers `/advanced/validate-fix` and `Sidebar.jsx` exposes a nav entry "Validate Remediation Fix".
- Verified path: Sidebar → Validate Remediation Fix → form (issue_type, original_html, fixed_html, wcag_criteria) → JSON view of `ai_result`.

## Apply pass 4 (mechanical backlog)

- **Status:** SKIPPED — no MECHANICAL items remain. All four backlog rows are tagged `TOO-RISKY` (bulk remediation, browser extension, Figma plugin) or `NEEDS-PRODUCT-DECISION` (A/B testing). Per the pass-4 rules these are out of scope.

## Apply pass 5 (all backlog)

Implemented 2 of 4 backlog rows (cap 10/project; the other 2 — browser extension and Figma plugin — remain TOO-RISKY because they require a separate project surface).

- **BE:** added 2 routes to `server/routes/ai.js`, registered before the `/:feature` wildcard. Both check `OPENROUTER_API_KEY` and return `503 { error, missing: 'OPENROUTER_API_KEY' }` if unset.
  - `POST /api/ai/bulk-remediate` — was TOO-RISKY (bulk remediation across whole site). PRODUCT-DECISION: synchronous loop with a 25-issue/request cap so we avoid adding a job-queue/worker dependency. Each issue is processed independently; failures are recorded per-issue rather than aborting the batch. Persists each row to `remediations` and writes an `ai_results` audit entry per issue.
  - `POST /api/ai/ab-test-fix` — was NEEDS-PRODUCT-DECISION (A/B testing fixed vs original). PRODUCT-DECISION: A/B = compare candidate A vs candidate B against the same original HTML; AI scores each candidate, lists regressions, and picks a winner with rationale. Single AI call.

- **FE:** new pages reuse the existing axios + JsonView + react-icons + react-hot-toast pattern.
  - `client/src/components/advanced/BulkRemediatePage.jsx` — JSON-array textarea (defaulted with 2 example issues), POSTs `{ issues }`, renders per-issue results.
  - `client/src/components/advanced/ABTestFixPage.jsx` — form for issue_type / WCAG / original / candidate_a / candidate_b, POSTs to `/ai/ab-test-fix`, surfaces winner + structured comparison.

- **Routing/Nav:** `client/src/App.jsx` registers `/advanced/bulk-remediate` and `/advanced/ab-test-fix`. `client/src/components/Sidebar.jsx` adds two entries to `advancedItems`.

- **Syntax:** `node --check server/routes/ai.js` PASS.

- **Smoke test:** Pre-existing `express-rate-limit` IPv6 ValidationError + missing local Postgres `aiada_accessibility` DB prevent local boot. Verified pre-existing by stashing my changes — error reproduces identically. My changes are additive and not the cause; no revert performed.

### Remaining backlog (still out of scope)

| Item | Category | Reason |
|---|---|---|
| Browser extension | TOO-RISKY | New project surface (Chrome/Firefox WebExtension manifest, build pipeline) |
| Figma plugin | TOO-RISKY | New project surface (plugin manifest, Figma SDK) |
