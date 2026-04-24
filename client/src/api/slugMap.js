// Maps frontend URL slugs to backend API route paths and AI feature names
const slugMap = {
  'website-accessibility-scanner': { api: 'website-scans', ai: 'website-scans' },
  'wcag-compliance-checker': { api: 'wcag-checks', ai: 'wcag-checks' },
  'alt-text-generator': { api: 'alt-texts', ai: 'alt-texts' },
  'color-contrast-analyzer': { api: 'color-contrasts', ai: 'color-contrasts' },
  'screen-reader-optimizer': { api: 'screen-reader', ai: 'screen-reader' },
  'keyboard-navigation-auditor': { api: 'keyboard-audits', ai: 'keyboard-audits' },
  'aria-label-generator': { api: 'aria-labels', ai: 'aria-labels' },
  'accessibility-report-generator': { api: 'accessibility-reports', ai: 'accessibility-reports' },
  'remediation-plan-creator': { api: 'remediation-plans', ai: 'remediation-plans' },
  'legal-compliance-assessor': { api: 'legal-assessments', ai: 'legal-assessments' },
  'pdf-accessibility-checker': { api: 'pdf-checks', ai: 'pdf-checks' },
  'form-accessibility-analyzer': { api: 'form-analyses', ai: 'form-analyses' },
  'video-caption-generator': { api: 'video-captions', ai: 'video-captions' },
  'readability-analyzer': { api: 'readability', ai: 'readability' },
  'accessibility-policy-generator': { api: 'accessibility-policies', ai: 'accessibility-policies' },
};

export function getApiPath(featureSlug) {
  const mapping = slugMap[featureSlug];
  return mapping ? mapping.api : featureSlug;
}

export function getAiFeature(featureSlug) {
  const mapping = slugMap[featureSlug];
  return mapping ? mapping.ai : featureSlug;
}

export default slugMap;
