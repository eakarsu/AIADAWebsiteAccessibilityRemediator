'use strict';
const PRIVATE_HOSTS = /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|::1$|fc|fd)/i;

function validateAuthorizedTarget(targetUrl, authorizedHost) {
  const violations = [];
  let parsed;
  try { parsed = new URL(targetUrl); } catch (_) { return { valid: false, violations: ['invalid_url'] }; }
  const host = parsed.hostname.toLowerCase();
  const scope = String(authorizedHost || '').toLowerCase();
  if (!['https:', 'http:'].includes(parsed.protocol)) violations.push('unsupported_protocol');
  if (!scope || (host !== scope && !host.endsWith(`.${scope}`))) violations.push('outside_authorized_scope');
  if (PRIVATE_HOSTS.test(host) || host.endsWith('.local') || host.endsWith('.internal')) violations.push('private_target_blocked');
  if (parsed.username || parsed.password) violations.push('embedded_credentials_blocked');
  return { valid: violations.length === 0, violations, normalizedUrl: parsed.toString() };
}

function assessRemediation(input) {
  const target = validateAuthorizedTarget(input.targetUrl, input.authorizedHost);
  const violations = [...target.violations];
  const before = input.evidence?.before;
  const after = input.evidence?.after;
  if (!input.authorizationReference || !input.sourceRevision) violations.push('authorization_and_revision_required');
  if (!before?.runId || !after?.runId || !Array.isArray(before.findings) || !Array.isArray(after.findings)) violations.push('reproducible_axe_evidence_required');
  if (!input.patch || !Array.isArray(input.patch.files) || input.patch.files.length === 0) violations.push('patch_manifest_required');
  const beforeCount = Array.isArray(before?.findings) ? before.findings.length : null;
  const afterCount = Array.isArray(after?.findings) ? after.findings.length : null;
  if (beforeCount !== null && afterCount !== null && afterCount > beforeCount) violations.push('regression_detected');
  return {
    valid: violations.length === 0,
    violations,
    verification: violations.length ? null : {
      targetUrl: target.normalizedUrl, sourceRevision: input.sourceRevision,
      beforeRunId: before.runId, afterRunId: after.runId,
      beforeFindings: beforeCount, afterFindings: afterCount,
      resolvedCount: beforeCount - afterCount,
      manualReviewRequired: true,
    },
  };
}
module.exports = { validateAuthorizedTarget, assessRemediation };
