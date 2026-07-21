const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const demoPassword = process.env.DEMO_PASSWORD;
if (process.env.CONFIRM_DEMO_SEED !== 'YES' || process.env.NODE_ENV === 'production' || !demoPassword || demoPassword.length < 12) {
  throw new Error('Demo seed requires CONFIRM_DEMO_SEED=YES, non-production NODE_ENV, and DEMO_PASSWORD of at least 12 characters');
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'aiada_accessibility',
      }
);

// Helper to generate a random date within the last 3 months
function randomDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const diff = now.getTime() - threeMonthsAgo.getTime();
  return new Date(threeMonthsAgo.getTime() + Math.random() * diff);
}

// Helper to pick a status with weighting toward 'completed'
function randomStatus() {
  const statuses = [
    'completed', 'completed', 'completed', 'completed', 'completed',
    'completed', 'completed', 'completed', 'completed',
    'in_progress', 'in_progress', 'in_progress',
    'pending', 'pending',
    'failed',
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// ---------------------------------------------------------------------------
// SEED DATA
// ---------------------------------------------------------------------------

const websiteScansData = [
  {
    title: 'Homepage Accessibility Audit - example.com',
    description: 'Full accessibility scan of the main homepage including hero section, navigation, and footer components.',
    url: 'https://www.example.com',
    ai_result: {
      summary: 'Homepage scan identified 12 accessibility issues across navigation and content areas.',
      score: 68,
      findings: [
        { type: 'error', severity: 'critical', title: 'Missing skip navigation link', description: 'No skip-to-content link found at the top of the page.', recommendation: 'Add a visually hidden skip link as the first focusable element.' },
        { type: 'error', severity: 'major', title: 'Images without alt text', description: '4 decorative images lack proper alt attributes.', recommendation: 'Add alt="" for decorative images or descriptive alt text for informative ones.' },
        { type: 'warning', severity: 'minor', title: 'Link text is ambiguous', description: '3 links use "click here" or "read more" without context.', recommendation: 'Rewrite link text to describe the destination or purpose.' },
      ],
      recommendations: ['Add skip navigation link', 'Audit all images for alt text', 'Rewrite ambiguous link text', 'Test with NVDA and VoiceOver'],
      details: 'The homepage has significant navigation barriers. Screen reader users cannot efficiently bypass the main navigation. Several images convey important information but lack text alternatives.',
    },
  },
  {
    title: 'E-commerce Checkout Flow Scan',
    description: 'Accessibility analysis of the full checkout process from cart to order confirmation.',
    url: 'https://shop.acme-corp.com/checkout',
    ai_result: {
      summary: 'Checkout flow has 8 critical accessibility barriers that prevent independent use by screen reader users.',
      score: 42,
      findings: [
        { type: 'error', severity: 'critical', title: 'Form fields lack labels', description: 'Credit card input fields have placeholder text but no associated label elements.', recommendation: 'Add <label> elements with for attributes matching each input id.' },
        { type: 'error', severity: 'critical', title: 'Error messages not announced', description: 'Validation errors appear visually but are not communicated to assistive technology.', recommendation: 'Use aria-live="polite" regions or aria-describedby to associate errors with fields.' },
        { type: 'warning', severity: 'major', title: 'Progress indicator not accessible', description: 'The multi-step checkout progress bar is purely visual.', recommendation: 'Add aria-label and aria-current to indicate the current step.' },
      ],
      recommendations: ['Label all form fields', 'Implement accessible error handling', 'Add ARIA to progress indicator', 'Enable keyboard-only checkout completion'],
      details: 'The checkout flow presents critical barriers. Users relying on assistive technology cannot complete a purchase independently due to unlabeled form fields and inaccessible error messages.',
    },
  },
  {
    title: 'Corporate Blog Section Scan',
    description: 'Scanning all blog listing and article pages for heading structure and content accessibility.',
    url: 'https://www.acme-corp.com/blog',
    ai_result: {
      summary: 'Blog section has good semantic structure but needs improvements in heading hierarchy and image descriptions.',
      score: 78,
      findings: [
        { type: 'warning', severity: 'minor', title: 'Heading levels skipped', description: 'Articles jump from h2 to h4 without an h3.', recommendation: 'Maintain sequential heading hierarchy for proper document outline.' },
        { type: 'info', severity: 'info', title: 'Reading level appropriate', description: 'Content averages a Flesch-Kincaid grade level of 8.2.', recommendation: 'No action needed; reading level is accessible to a broad audience.' },
      ],
      recommendations: ['Fix heading hierarchy in article templates', 'Add alt text to blog post featured images'],
      details: 'The blog section performs well overall. The main issues are inconsistent heading levels within articles and a few featured images missing descriptive alt text.',
    },
  },
  {
    title: 'Mobile Responsive Accessibility Check',
    description: 'Testing accessibility of responsive layouts on mobile viewport sizes for touch targets and zoom behavior.',
    url: 'https://m.example.com',
    ai_result: {
      summary: 'Mobile layout has touch target issues and content is lost at 200% zoom.',
      score: 55,
      findings: [
        { type: 'error', severity: 'major', title: 'Touch targets too small', description: 'Navigation links are 28x28px, below the recommended 44x44px minimum.', recommendation: 'Increase touch target size to at least 44x44 CSS pixels.' },
        { type: 'error', severity: 'major', title: 'Content truncated at 200% zoom', description: 'Horizontal scrolling required to read main content at 200% browser zoom.', recommendation: 'Use responsive CSS that reflows content properly at all zoom levels.' },
      ],
      recommendations: ['Increase all touch targets to 44x44px minimum', 'Fix reflow issues at 200% zoom', 'Test on actual mobile devices with screen readers'],
      details: 'The mobile experience fails WCAG 2.1 Level AA requirements for target size (2.5.5) and reflow (1.4.10). Content becomes inaccessible when users zoom to 200%.',
    },
  },
  {
    title: 'Patient Portal Login Page Scan',
    description: 'Accessibility audit of the healthcare patient portal login and password recovery pages.',
    url: 'https://portal.healthfirst.example.com/login',
    ai_result: {
      summary: 'Login page has critical issues with CAPTCHA accessibility and insufficient error messaging.',
      score: 38,
      findings: [
        { type: 'error', severity: 'critical', title: 'CAPTCHA has no audio alternative', description: 'Image-based CAPTCHA has no accessible alternative for vision-impaired users.', recommendation: 'Implement an audio CAPTCHA alternative or switch to an accessible CAPTCHA solution like hCaptcha accessible mode.' },
        { type: 'error', severity: 'critical', title: 'Session timeout without warning', description: 'Session expires after 5 minutes with no warning or extension option.', recommendation: 'Add a timeout warning dialog at least 20 seconds before expiry with option to extend.' },
        { type: 'error', severity: 'major', title: 'Password requirements not pre-announced', description: 'Password validation rules only appear after a failed attempt.', recommendation: 'Display password requirements before the user begins typing.' },
      ],
      recommendations: ['Replace CAPTCHA with accessible alternative', 'Implement session timeout warnings', 'Show password requirements proactively', 'Add "show password" toggle'],
      details: 'The patient portal login is a critical access point for healthcare services. The current CAPTCHA implementation and session timeout behavior create significant barriers for users with disabilities.',
    },
  },
  {
    title: 'University Course Catalog Scan',
    description: 'Comprehensive scan of the university course catalog, search, and filtering interface.',
    url: 'https://catalog.stateuniversity.example.com',
    ai_result: {
      summary: 'Course catalog search and filtering lack keyboard accessibility; data tables are not properly structured.',
      score: 51,
      findings: [
        { type: 'error', severity: 'critical', title: 'Filter dropdowns not keyboard accessible', description: 'Custom dropdown components cannot be operated with keyboard alone.', recommendation: 'Replace custom dropdowns with accessible components or add proper keyboard interaction patterns.' },
        { type: 'error', severity: 'major', title: 'Data tables missing headers', description: 'Course listing tables lack th elements and scope attributes.', recommendation: 'Add proper table headers with scope="col" and scope="row" attributes.' },
        { type: 'warning', severity: 'minor', title: 'Search results not announced', description: 'When search results update, screen readers are not notified.', recommendation: 'Add an aria-live region to announce result count changes.' },
      ],
      recommendations: ['Rebuild filter components for keyboard access', 'Add table headers', 'Announce search result updates', 'Add breadcrumb navigation'],
      details: 'Students using assistive technology cannot effectively search and filter courses. The custom UI components override native browser accessibility features.',
    },
  },
  {
    title: 'Government Services Portal Scan',
    description: 'Full-site accessibility audit of the municipal government services web portal.',
    url: 'https://services.cityofspringfield.gov',
    ai_result: {
      summary: 'Government portal has strong semantic structure but fails on dynamic content and document accessibility.',
      score: 72,
      findings: [
        { type: 'error', severity: 'major', title: 'PDF forms not tagged', description: '23 downloadable PDF forms lack proper tagging and reading order.', recommendation: 'Remediate all PDF forms with proper tags, reading order, and form field labels.' },
        { type: 'warning', severity: 'minor', title: 'Language not declared on some pages', description: '4 pages missing the lang attribute on the html element.', recommendation: 'Add lang="en" to the html element on all pages.' },
        { type: 'pass', severity: 'info', title: 'Good heading structure', description: 'All pages have proper heading hierarchy.', recommendation: 'Maintain current heading practices.' },
      ],
      recommendations: ['Remediate all PDF forms', 'Add missing language declarations', 'Test all interactive features with keyboard', 'Conduct user testing with assistive technology users'],
      details: 'The portal has a solid foundation with good heading structure and landmark regions. The primary concern is the inaccessible PDF forms that residents must use to access government services.',
    },
  },
  {
    title: 'Restaurant Menu and Ordering Scan',
    description: 'Accessibility review of an online restaurant menu with interactive ordering system.',
    url: 'https://order.tastybites.example.com',
    ai_result: {
      summary: 'Online ordering system is largely inaccessible to screen reader users due to custom widget patterns.',
      score: 35,
      findings: [
        { type: 'error', severity: 'critical', title: 'Menu items not focusable', description: 'Food items cannot be selected or added to cart using keyboard.', recommendation: 'Make all menu items focusable with proper button roles and keyboard handlers.' },
        { type: 'error', severity: 'critical', title: 'Cart updates not announced', description: 'Adding items to cart produces no screen reader announcement.', recommendation: 'Use aria-live to announce cart additions and total updates.' },
        { type: 'error', severity: 'major', title: 'Allergy information in images only', description: 'Allergen icons have no text alternatives.', recommendation: 'Add text labels for all allergen indicators.' },
      ],
      recommendations: ['Make all interactive elements keyboard accessible', 'Add cart update announcements', 'Provide text alternatives for allergen icons', 'Test complete ordering flow with JAWS and NVDA'],
      details: 'The ordering system creates a complete barrier for keyboard and screen reader users. Critical functionality—selecting items, customizing orders, and checking out—requires mouse interaction.',
    },
  },
  {
    title: 'Banking Dashboard Accessibility Scan',
    description: 'Security-focused accessibility audit of the online banking dashboard and transaction history.',
    url: 'https://online.securefinance.example.com/dashboard',
    ai_result: {
      summary: 'Banking dashboard has significant issues with data visualization accessibility and session management.',
      score: 48,
      findings: [
        { type: 'error', severity: 'critical', title: 'Charts convey data visually only', description: 'Spending charts and graphs have no text alternatives or data tables.', recommendation: 'Provide accessible data tables as alternatives to all charts.' },
        { type: 'error', severity: 'major', title: 'Account balances in inaccessible widget', description: 'Account summary uses a custom carousel that traps keyboard focus.', recommendation: 'Replace carousel with a simple list or accessible carousel implementation.' },
        { type: 'warning', severity: 'minor', title: 'Transaction table lacks sort indicators', description: 'Sortable columns do not announce sort direction to screen readers.', recommendation: 'Add aria-sort attributes to sortable table headers.' },
      ],
      recommendations: ['Provide data tables for all charts', 'Fix keyboard trap in account carousel', 'Add sort indicators to transaction tables', 'Implement accessible session timeout handling'],
      details: 'The banking dashboard presents critical barriers to users who rely on screen readers. Financial data is locked in visual-only charts, and the account carousel creates a keyboard trap.',
    },
  },
  {
    title: 'Job Application Portal Scan',
    description: 'End-to-end accessibility analysis of the multi-step job application form and resume upload.',
    url: 'https://careers.globaltech.example.com/apply',
    ai_result: {
      summary: 'Job application portal has form accessibility issues and the file upload component is not keyboard accessible.',
      score: 52,
      findings: [
        { type: 'error', severity: 'critical', title: 'File upload not keyboard accessible', description: 'The drag-and-drop resume upload area cannot be activated via keyboard.', recommendation: 'Add a standard file input as a fallback alongside the drag-and-drop interface.' },
        { type: 'error', severity: 'major', title: 'Required fields not programmatically indicated', description: 'Required fields use visual asterisks only without aria-required.', recommendation: 'Add aria-required="true" to all mandatory form fields.' },
      ],
      recommendations: ['Add keyboard-accessible file upload', 'Mark required fields programmatically', 'Ensure all form errors are accessible', 'Test multi-step form with screen readers'],
      details: 'The job application process has barriers that may prevent candidates with disabilities from applying, creating both accessibility and legal compliance risks.',
    },
  },
  {
    title: 'News Media Website Full Scan',
    description: 'Comprehensive audit of a news website covering article pages, video content, and dynamic elements.',
    url: 'https://www.dailynews.example.com',
    ai_result: null,
  },
  {
    title: 'Real Estate Listing Site Scan',
    description: 'Accessibility review of property search, map integration, and listing detail pages.',
    url: 'https://www.dreamhomes.example.com',
    ai_result: null,
  },
  {
    title: 'SaaS Dashboard Application Scan',
    description: 'Audit of the project management SaaS application including kanban boards and calendar views.',
    url: 'https://app.projectflow.example.com',
    ai_result: null,
  },
  {
    title: 'Online Learning Platform Scan',
    description: 'Accessibility analysis of the LMS including course player, quizzes, and discussion forums.',
    url: 'https://learn.edubright.example.com',
    ai_result: {
      summary: 'Learning platform has mixed results: good text content accessibility but poor multimedia and interactive quiz accessibility.',
      score: 58,
      findings: [
        { type: 'error', severity: 'critical', title: 'Video player lacks keyboard controls', description: 'Custom video player controls are mouse-only.', recommendation: 'Use an accessible video player library or ensure all controls are keyboard operable.' },
        { type: 'error', severity: 'major', title: 'Quiz drag-and-drop has no alternative', description: 'Matching questions use drag-and-drop with no keyboard alternative.', recommendation: 'Provide a dropdown or radio button alternative for matching questions.' },
      ],
      recommendations: ['Replace video player with accessible alternative', 'Add keyboard alternatives for all interactive quizzes', 'Caption all video content', 'Test with screen readers'],
      details: 'The learning platform creates barriers for students with disabilities, particularly in multimedia content and interactive assessments.',
    },
  },
  {
    title: 'Insurance Quote Calculator Scan',
    description: 'Accessibility audit of the interactive insurance quote calculator with multi-step form.',
    url: 'https://quote.safecover.example.com',
    ai_result: {
      summary: 'Quote calculator has form and dynamic content issues that block independent completion.',
      score: 45,
      findings: [
        { type: 'error', severity: 'critical', title: 'Slider controls not accessible', description: 'Coverage amount sliders cannot be operated with keyboard.', recommendation: 'Add keyboard support (arrow keys) and provide a text input fallback for slider values.' },
        { type: 'error', severity: 'major', title: 'Dynamic price updates not announced', description: 'Quote total updates in real time but changes are not communicated to screen readers.', recommendation: 'Use an aria-live region to announce price changes.' },
      ],
      recommendations: ['Make sliders keyboard accessible', 'Announce dynamic price changes', 'Label all form sections clearly', 'Provide text input alternatives for sliders'],
      details: 'The insurance quote calculator relies heavily on custom slider controls and dynamic updates that exclude assistive technology users.',
    },
  },
];

const wcagChecksData = [
  {
    title: 'Level A Conformance Check - Main Navigation',
    description: 'Verifying WCAG 2.1 Level A success criteria for the primary site navigation component.',
    url: 'https://www.example.com/nav',
    ai_result: {
      summary: 'Navigation fails 4 Level A success criteria including keyboard access and name-role-value.',
      score: 55,
      wcag_level: 'A',
      criteria_checked: 25,
      criteria_passed: 21,
      criteria_failed: 4,
      findings: [
        { type: 'error', severity: 'critical', title: 'SC 2.1.1 Keyboard - Fail', description: 'Dropdown submenus cannot be opened or navigated with keyboard.', recommendation: 'Implement keyboard interaction pattern: Enter/Space to open, arrow keys to navigate, Escape to close.' },
        { type: 'error', severity: 'major', title: 'SC 4.1.2 Name, Role, Value - Fail', description: 'Custom dropdown menus lack ARIA roles and states.', recommendation: 'Add role="menu", role="menuitem", aria-expanded, and aria-haspopup attributes.' },
      ],
      recommendations: ['Fix keyboard interaction for dropdown menus', 'Add ARIA roles and states', 'Ensure focus is visible on all navigation items', 'Test with multiple screen readers'],
      details: 'The main navigation component fails fundamental Level A requirements. Keyboard users cannot access dropdown menus, and screen readers cannot determine the structure or state of the navigation.',
    },
  },
  {
    title: 'Level AA Color Contrast Verification',
    description: 'Automated and manual verification of color contrast ratios across all page templates.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Color contrast analysis found 18 instances of insufficient contrast, primarily in body text and UI controls.',
      score: 62,
      wcag_level: 'AA',
      criteria_checked: 5,
      criteria_passed: 2,
      criteria_failed: 3,
      findings: [
        { type: 'error', severity: 'major', title: 'SC 1.4.3 Contrast Minimum - Fail', description: 'Body text (#777777 on #ffffff) has a contrast ratio of 4.48:1, below the 4.5:1 minimum.', recommendation: 'Darken body text to at least #767676 for a 4.54:1 ratio.' },
        { type: 'error', severity: 'major', title: 'SC 1.4.11 Non-text Contrast - Fail', description: 'Form field borders (#cccccc on #ffffff) have a 1.6:1 contrast ratio.', recommendation: 'Darken form borders to at least #949494 for a 3:1 ratio.' },
        { type: 'warning', severity: 'minor', title: 'SC 1.4.6 Enhanced Contrast', description: 'Headings meet AA but fall short of AAA enhanced contrast (7:1).', recommendation: 'Consider darkening heading colors for enhanced readability.' },
      ],
      recommendations: ['Darken body text color', 'Increase form field border contrast', 'Review all UI component contrast ratios', 'Update design system color palette'],
      details: 'The site uses a light gray color palette that creates insufficient contrast in multiple areas. The body text is the most impactful issue as it affects all content pages.',
    },
  },
  {
    title: 'Level AAA Enhanced Accessibility Review',
    description: 'Optional Level AAA success criteria review for premium accessibility certification.',
    url: 'https://www.example.com',
    ai_result: {
      summary: 'Site meets some Level AAA criteria but falls short on sign language, extended audio description, and enhanced contrast.',
      score: 35,
      wcag_level: 'AAA',
      criteria_checked: 28,
      criteria_passed: 10,
      criteria_failed: 18,
      findings: [
        { type: 'info', severity: 'info', title: 'SC 1.2.6 Sign Language - Not Met', description: 'No sign language interpretation provided for video content.', recommendation: 'Add sign language interpretation tracks for key video content.' },
        { type: 'info', severity: 'info', title: 'SC 1.4.8 Visual Presentation - Partial', description: 'Text blocks exceed recommended width of 80 characters.', recommendation: 'Limit text block width to 80 characters or 40em.' },
      ],
      recommendations: ['Limit line width to 80 characters', 'Provide sign language for videos', 'Enhance contrast to 7:1 ratio', 'Allow user font customization'],
      details: 'Level AAA conformance is aspirational for most sites. This review identifies opportunities for enhanced accessibility beyond the typical AA compliance target.',
    },
  },
  {
    title: 'Perceivable Criteria Audit - Media Content',
    description: 'Checking all Principle 1 (Perceivable) criteria for audio, video, and image content.',
    url: 'https://media.example.com',
    ai_result: {
      summary: 'Media content fails multiple perceivable criteria; 60% of videos lack captions and no audio descriptions exist.',
      score: 40,
      wcag_level: 'AA',
      criteria_checked: 12,
      criteria_passed: 5,
      criteria_failed: 7,
      findings: [
        { type: 'error', severity: 'critical', title: 'SC 1.2.2 Captions (Prerecorded) - Fail', description: '12 of 20 prerecorded videos have no captions.', recommendation: 'Add synchronized captions to all prerecorded video content.' },
        { type: 'error', severity: 'major', title: 'SC 1.2.5 Audio Description - Fail', description: 'No videos provide audio description tracks.', recommendation: 'Add audio descriptions for videos where visual content conveys information not in the audio track.' },
        { type: 'error', severity: 'major', title: 'SC 1.1.1 Non-text Content - Fail', description: '8 informative images lack meaningful alt text.', recommendation: 'Add descriptive alt text to all images that convey information.' },
      ],
      recommendations: ['Caption all video content', 'Add audio descriptions to informational videos', 'Audit and fix all image alt text', 'Provide transcripts for audio-only content'],
      details: 'The media-heavy content section presents major barriers for users with vision and hearing disabilities. Captioning coverage is inconsistent and audio descriptions are entirely absent.',
    },
  },
  {
    title: 'Operable Criteria Check - Interactive Components',
    description: 'Validating Principle 2 (Operable) criteria for all interactive UI components including modals, tabs, and accordions.',
    url: 'https://www.acme-corp.com/components',
    ai_result: {
      summary: 'Interactive components have keyboard accessibility gaps; 3 of 5 custom widgets are not fully operable.',
      score: 50,
      wcag_level: 'AA',
      criteria_checked: 15,
      criteria_passed: 8,
      criteria_failed: 7,
      findings: [
        { type: 'error', severity: 'critical', title: 'SC 2.1.2 No Keyboard Trap - Fail', description: 'Modal dialog traps keyboard focus and provides no escape mechanism.', recommendation: 'Ensure Escape key closes the modal and returns focus to the trigger element.' },
        { type: 'error', severity: 'major', title: 'SC 2.4.7 Focus Visible - Fail', description: 'Custom-styled buttons suppress the default focus outline with no replacement.', recommendation: 'Add a visible focus indicator style for all interactive elements.' },
      ],
      recommendations: ['Fix modal keyboard trap', 'Add visible focus indicators', 'Implement proper tab panel keyboard pattern', 'Add focus management for dynamic content'],
      details: 'Custom interactive components override native browser behavior without providing accessible alternatives. The modal keyboard trap is the most critical issue.',
    },
  },
  {
    title: 'Understandable Criteria Review - Forms and Errors',
    description: 'Checking Principle 3 (Understandable) criteria for form input assistance and error handling.',
    url: 'https://www.acme-corp.com/contact',
    ai_result: {
      summary: 'Form error handling is inconsistent; some errors are only communicated visually.',
      score: 65,
      wcag_level: 'AA',
      criteria_checked: 8,
      criteria_passed: 5,
      criteria_failed: 3,
      findings: [
        { type: 'error', severity: 'major', title: 'SC 3.3.1 Error Identification - Fail', description: 'Form errors use red color alone to indicate problems.', recommendation: 'Add text error messages and icons alongside color changes.' },
        { type: 'warning', severity: 'minor', title: 'SC 3.3.5 Help - Partial', description: 'Complex form fields lack inline help text.', recommendation: 'Add helper text or tooltips for fields with specific format requirements.' },
      ],
      recommendations: ['Add text error messages to all validation', 'Provide inline help for complex fields', 'Ensure error suggestions are specific', 'Test error flow with screen readers'],
      details: 'Form error handling relies too heavily on visual cues. Adding text-based error messages and linking them to fields with aria-describedby will significantly improve the experience.',
    },
  },
  {
    title: 'Robust Criteria Validation - Parsing and Compatibility',
    description: 'Validating Principle 4 (Robust) criteria for HTML parsing, ARIA usage, and assistive technology compatibility.',
    url: 'https://www.example.com',
    ai_result: {
      summary: 'HTML validation found 34 parsing errors; ARIA usage has 12 instances of incorrect role or state usage.',
      score: 58,
      wcag_level: 'AA',
      criteria_checked: 3,
      criteria_passed: 1,
      criteria_failed: 2,
      findings: [
        { type: 'error', severity: 'major', title: 'SC 4.1.1 Parsing - Fail', description: '34 HTML parsing errors including duplicate IDs and unclosed elements.', recommendation: 'Fix HTML validation errors, prioritizing duplicate IDs that break label associations.' },
        { type: 'error', severity: 'major', title: 'SC 4.1.2 Name, Role, Value - Fail', description: '12 custom widgets lack proper ARIA roles, states, or properties.', recommendation: 'Audit all custom components and add appropriate ARIA attributes following WAI-ARIA authoring practices.' },
      ],
      recommendations: ['Fix HTML parsing errors', 'Audit and correct ARIA usage', 'Validate HTML on all page templates', 'Test with multiple assistive technologies'],
      details: 'The codebase has HTML quality issues that affect assistive technology compatibility. Duplicate IDs are particularly problematic as they break form label associations and ARIA references.',
    },
  },
  {
    title: 'WCAG 2.1 New Criteria Assessment',
    description: 'Evaluating compliance with success criteria new to WCAG 2.1 including motion, spacing, and mobile.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Site partially meets new WCAG 2.1 criteria but fails on motion actuation and target size.',
      score: 60,
      wcag_level: 'AA',
      criteria_checked: 12,
      criteria_passed: 8,
      criteria_failed: 4,
      findings: [
        { type: 'error', severity: 'major', title: 'SC 2.5.1 Pointer Gestures - Fail', description: 'Image carousel requires swipe gestures with no single-pointer alternative.', recommendation: 'Add previous/next buttons as alternatives to swipe gestures.' },
        { type: 'warning', severity: 'minor', title: 'SC 1.4.12 Text Spacing - Partial', description: 'Increasing text spacing causes some content overflow.', recommendation: 'Test and fix layout with increased letter spacing, word spacing, and line height.' },
      ],
      recommendations: ['Add single-pointer alternatives for gestures', 'Fix text spacing overflow issues', 'Increase target sizes for mobile', 'Add motion preference detection'],
      details: 'The WCAG 2.1 criteria address mobile and responsive accessibility gaps. The most impactful issues are gesture-dependent interactions and small touch targets.',
    },
  },
  {
    title: 'WCAG Compliance Gap Analysis - Full Site',
    description: 'Comprehensive gap analysis comparing current site against all WCAG 2.1 Level AA success criteria.',
    url: 'https://www.globalretail.example.com',
    ai_result: null,
  },
  {
    title: 'Third-Party Widget WCAG Compliance Check',
    description: 'Evaluating WCAG compliance of embedded third-party widgets including chat, analytics consent, and social media.',
    url: 'https://www.example.com/widgets',
    ai_result: null,
  },
  {
    title: 'Single Page Application WCAG Audit',
    description: 'WCAG compliance check for a React-based SPA focusing on dynamic content and routing.',
    url: 'https://app.taskmanager.example.com',
    ai_result: {
      summary: 'SPA has unique accessibility challenges with client-side routing and dynamic content updates.',
      score: 47,
      wcag_level: 'AA',
      criteria_checked: 30,
      criteria_passed: 14,
      criteria_failed: 16,
      findings: [
        { type: 'error', severity: 'critical', title: 'SC 2.4.2 Page Titled - Fail', description: 'Page title does not update on client-side navigation.', recommendation: 'Update document.title on every route change to reflect current page content.' },
        { type: 'error', severity: 'critical', title: 'SC 4.1.3 Status Messages - Fail', description: 'Toast notifications are not announced by screen readers.', recommendation: 'Add role="status" or aria-live="polite" to notification containers.' },
      ],
      recommendations: ['Update page titles on route changes', 'Announce route changes to screen readers', 'Make toast notifications accessible', 'Manage focus on navigation'],
      details: 'Single page applications present unique WCAG challenges. Client-side routing breaks the traditional page load model that screen readers rely on for orientation.',
    },
  },
  {
    title: 'WCAG 2.1 Compliance Checklist - Healthcare Portal',
    description: 'Systematic checklist-based review of all 50 Level AA success criteria for the patient-facing healthcare portal.',
    url: 'https://myhealth.example.com',
    ai_result: {
      summary: 'Healthcare portal meets 35 of 50 Level AA criteria. 15 failures concentrated in forms, media, and navigation.',
      score: 70,
      wcag_level: 'AA',
      criteria_checked: 50,
      criteria_passed: 35,
      criteria_failed: 15,
      findings: [
        { type: 'error', severity: 'critical', title: 'SC 1.3.1 Info and Relationships - Fail', description: 'Medical form sections lack fieldset/legend grouping.', recommendation: 'Wrap related form controls in fieldset with descriptive legend elements.' },
        { type: 'pass', severity: 'info', title: 'SC 2.4.1 Bypass Blocks - Pass', description: 'Skip navigation link is present and functional.', recommendation: 'No action required.' },
      ],
      recommendations: ['Add fieldset/legend to form groups', 'Caption patient education videos', 'Fix keyboard navigation in appointment scheduler', 'Add text alternatives to medical diagrams'],
      details: 'The healthcare portal has a 70% compliance rate with WCAG 2.1 AA. Form accessibility is the largest area of concern, followed by media content and complex interactive components.',
    },
  },
  {
    title: 'WCAG Compliance Regression Test',
    description: 'Post-deployment regression test to verify previously fixed accessibility issues remain resolved.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Success Criteria 1.4.x Visual Presentation Audit',
    description: 'Deep-dive into all WCAG 1.4.x success criteria covering color, contrast, resize, and visual presentation.',
    url: 'https://www.designstudio.example.com',
    ai_result: null,
  },
  {
    title: 'WCAG Conformance Level Upgrade Assessment',
    description: 'Assessment to determine effort required to upgrade from WCAG 2.0 Level A to WCAG 2.1 Level AA.',
    url: 'https://legacy.enterprise.example.com',
    ai_result: null,
  },
];

const altTextsData = [
  {
    title: 'Hero Banner Image - Product Launch',
    description: 'Large hero image showcasing the new product line on the homepage above the fold.',
    url: 'https://www.acme-corp.com/images/hero-product-launch.jpg',
    ai_result: {
      summary: 'Generated alt text for hero banner image depicting new product line launch.',
      score: 88,
      original_alt: '',
      suggested_alt: 'Acme Corp 2024 product lineup featuring the new X-Series devices arranged on a minimalist white surface with dramatic lighting.',
      image_analysis: { dominant_colors: ['white', 'silver', 'blue'], detected_objects: ['electronic devices', 'product packaging'], text_detected: 'Introducing X-Series', is_decorative: false },
      findings: [
        { type: 'error', severity: 'critical', title: 'Missing alt text', description: 'Hero image has no alt attribute, making it invisible to screen readers.', recommendation: 'Add descriptive alt text that conveys the promotional message and product information.' },
      ],
      recommendations: ['Add the suggested alt text', 'Ensure alt text conveys the same information as the visual', 'Keep under 125 characters if possible'],
      details: 'This hero image is informative and promotional. It conveys the product launch message and should have descriptive alt text that communicates the same information to screen reader users.',
    },
  },
  {
    title: 'Team Photo - About Page',
    description: 'Group photo of the executive leadership team displayed on the About Us page.',
    url: 'https://www.acme-corp.com/images/team-photo.jpg',
    ai_result: {
      summary: 'Generated alt text for group team photo on About page.',
      score: 82,
      original_alt: 'team',
      suggested_alt: 'Acme Corp executive leadership team of eight people standing in the company lobby, smiling at the camera.',
      image_analysis: { dominant_colors: ['blue', 'gray', 'white'], detected_objects: ['people', 'office lobby'], text_detected: '', is_decorative: false },
      findings: [
        { type: 'warning', severity: 'major', title: 'Alt text too vague', description: 'Current alt text "team" does not adequately describe the image content.', recommendation: 'Replace with descriptive alt text identifying the group and context.' },
      ],
      recommendations: ['Use the suggested alt text', 'Consider naming individuals if they are identified on the page', 'Describe the setting and context'],
      details: 'The current alt text "team" is insufficient. The image shows the leadership team and the alt text should convey who they are and the context.',
    },
  },
  {
    title: 'Product Comparison Chart',
    description: 'Visual chart comparing features of three product tiers displayed on the pricing page.',
    url: 'https://www.acme-corp.com/images/pricing-chart.png',
    ai_result: {
      summary: 'Complex image requires long description or accessible data table alternative.',
      score: 30,
      original_alt: 'pricing',
      suggested_alt: 'Product comparison chart showing Basic, Pro, and Enterprise tier features. See accessible table below for details.',
      image_analysis: { dominant_colors: ['white', 'green', 'gray'], detected_objects: ['table', 'checkmarks', 'text'], text_detected: 'Basic, Pro, Enterprise', is_decorative: false },
      findings: [
        { type: 'error', severity: 'critical', title: 'Complex image needs detailed alternative', description: 'This comparison chart contains detailed data that cannot be conveyed in a short alt text.', recommendation: 'Provide an accessible HTML data table as an alternative to the chart image.' },
      ],
      recommendations: ['Add a detailed accessible table below the image', 'Use short alt text referencing the table', 'Consider replacing the image entirely with an HTML table'],
      details: 'Complex images with data should have either a long description (via aria-describedby) or an accessible data table alternative. A simple alt attribute cannot convey all the information.',
    },
  },
  {
    title: 'Decorative Background Pattern',
    description: 'Abstract geometric pattern used as a decorative background on the services section.',
    url: 'https://www.acme-corp.com/images/bg-pattern.svg',
    ai_result: {
      summary: 'Decorative image should have empty alt text to be hidden from screen readers.',
      score: 95,
      original_alt: 'background pattern decoration geometric shapes',
      suggested_alt: '',
      image_analysis: { dominant_colors: ['light blue', 'white'], detected_objects: ['geometric shapes'], text_detected: '', is_decorative: true },
      findings: [
        { type: 'warning', severity: 'minor', title: 'Decorative image has descriptive alt text', description: 'This decorative image has alt text that will be unnecessarily announced by screen readers.', recommendation: 'Set alt="" (empty) for decorative images so screen readers skip them.' },
      ],
      recommendations: ['Set alt="" for this decorative image', 'Alternatively, apply role="presentation" or aria-hidden="true"'],
      details: 'Decorative images should have empty alt text (alt="") so screen readers do not announce them. The current descriptive alt text adds noise for screen reader users.',
    },
  },
  {
    title: 'Infographic - Accessibility Statistics',
    description: 'Full-page infographic displaying accessibility statistics and impact data.',
    url: 'https://www.acme-corp.com/images/accessibility-infographic.png',
    ai_result: {
      summary: 'Infographic requires comprehensive long description to convey statistical data.',
      score: 20,
      original_alt: 'infographic',
      suggested_alt: 'Infographic showing accessibility statistics: 15% of the global population has a disability, 71% of users with disabilities leave inaccessible sites. Full data available in text below.',
      image_analysis: { dominant_colors: ['navy', 'orange', 'white'], detected_objects: ['charts', 'icons', 'text blocks'], text_detected: '15%, 71%, 1 billion', is_decorative: false },
      findings: [
        { type: 'error', severity: 'critical', title: 'Infographic inaccessible', description: 'Complex infographic with extensive data is represented only as an image with alt text "infographic".', recommendation: 'Provide a full text alternative that includes all data points and their relationships.' },
      ],
      recommendations: ['Add a detailed text version below the infographic', 'Link the image to the text version with aria-describedby', 'Consider creating an accessible HTML version'],
      details: 'Infographics are inherently inaccessible as images. All data, statistics, and relationships shown must be available in text form.',
    },
  },
  {
    title: 'Client Logo Grid - Partners Page',
    description: 'Grid of 12 client company logos displayed on the partners page.',
    url: 'https://www.acme-corp.com/partners',
    ai_result: {
      summary: 'Logo images need company name as alt text for screen reader identification.',
      score: 70,
      original_alt: 'various: "logo", "client", ""',
      suggested_alt: 'Use company name as alt text for each logo (e.g., "Microsoft", "Amazon Web Services")',
      image_analysis: { dominant_colors: ['various'], detected_objects: ['logos'], text_detected: 'various company names', is_decorative: false },
      findings: [
        { type: 'error', severity: 'major', title: 'Inconsistent logo alt text', description: '5 logos have no alt text, 4 say "logo", and 3 have proper company names.', recommendation: 'Set alt text for each logo to the company name only (e.g., alt="Microsoft").' },
      ],
      recommendations: ['Set each logo alt to the company name', 'Do not include "logo" in the alt text', 'If logos are linked, alt should describe the link destination'],
      details: 'Logo images should use the company or brand name as their alt text. Including "logo" in the alt text is redundant as screen readers already announce the image role.',
    },
  },
  {
    title: 'Icon Set - Feature Cards',
    description: 'SVG icons used in feature cards that convey meaning alongside text labels.',
    url: 'https://www.acme-corp.com/features',
    ai_result: {
      summary: 'Icons paired with text labels should be decorative; standalone icons need alt text.',
      score: 75,
      findings: [
        { type: 'warning', severity: 'minor', title: 'Redundant icon alt text', description: 'Icons next to text labels repeat the same information in their alt text.', recommendation: 'Set alt="" on icons that are adjacent to text conveying the same meaning.' },
        { type: 'error', severity: 'major', title: 'Standalone status icons lack alt text', description: '3 status icons (checkmark, warning, error) convey meaning without adjacent text.', recommendation: 'Add alt text to standalone icons (e.g., alt="Completed", alt="Warning", alt="Error").' },
      ],
      recommendations: ['Mark decorative icons adjacent to text as alt=""', 'Add alt text to standalone meaningful icons', 'Use aria-hidden="true" on purely decorative SVGs'],
      details: 'The approach to icon accessibility depends on context. Icons paired with text should be hidden from screen readers. Standalone icons that convey information need text alternatives.',
    },
  },
  {
    title: 'Map Image - Office Locations',
    description: 'Interactive map showing office locations, currently rendered as a static image for some users.',
    url: 'https://www.acme-corp.com/images/office-map.png',
    ai_result: {
      summary: 'Map image needs alternative text listing office locations and addresses.',
      score: 40,
      original_alt: 'map',
      suggested_alt: 'Map showing Acme Corp office locations in New York, San Francisco, and London. See address list below for details.',
      findings: [
        { type: 'error', severity: 'critical', title: 'Map image inaccessible', description: 'Static map image with alt="map" does not convey any location information.', recommendation: 'Provide a text list of all locations with addresses as an alternative to the map.' },
      ],
      recommendations: ['Add descriptive alt text summarizing locations', 'Provide text list of addresses below the map', 'Link map to text alternative with aria-describedby'],
      details: 'Map images are inherently visual. All location information must also be available in text form, typically as an address list below or alongside the map.',
    },
  },
  {
    title: 'Screenshot - Mobile App Preview',
    description: 'Mobile app screenshot showing the user interface on the download page.',
    url: 'https://www.acme-corp.com/images/app-preview.png',
    ai_result: {
      summary: 'App screenshot needs alt text describing the key interface elements shown.',
      score: 60,
      original_alt: 'app screenshot',
      suggested_alt: 'Acme Corp mobile app dashboard showing task list, calendar widget, and notification center on an iPhone screen.',
      findings: [
        { type: 'warning', severity: 'major', title: 'Alt text not descriptive enough', description: 'Current alt "app screenshot" does not describe what the app looks like.', recommendation: 'Describe the key UI elements and features visible in the screenshot.' },
      ],
      recommendations: ['Describe the features shown in the screenshot', 'Focus on what makes the app attractive or useful', 'Keep description concise but informative'],
      details: 'App preview screenshots serve a marketing purpose. The alt text should describe the key features and interface elements that the visual conveys to sighted users.',
    },
  },
  {
    title: 'Before/After Slider Images',
    description: 'Interactive before/after comparison slider showing website redesign on the case studies page.',
    url: 'https://www.acme-corp.com/case-studies/redesign',
    ai_result: {
      summary: 'Interactive image slider needs accessible alternatives for both comparison images.',
      score: 35,
      findings: [
        { type: 'error', severity: 'critical', title: 'Before/after slider not accessible', description: 'The interactive comparison slider is mouse-only and neither image has proper alt text.', recommendation: 'Add alt text to both images, make slider keyboard operable, and provide text description of differences.' },
      ],
      recommendations: ['Add alt text to both before and after images', 'Make slider keyboard accessible', 'Describe the key differences in text', 'Add aria-label to the slider control'],
      details: 'Before/after comparison sliders are a complex interactive element. Both images need alt text, the slider must be keyboard operable, and a text summary of differences should be provided.',
    },
  },
  {
    title: 'User Avatar Images - Comment Section',
    description: 'User profile photos displayed next to comments in the community discussion section.',
    url: 'https://community.acme-corp.com/discussions',
    ai_result: null,
  },
  {
    title: 'Social Media Share Icons',
    description: 'Social media platform icons used as sharing buttons at the bottom of blog posts.',
    url: 'https://www.acme-corp.com/blog',
    ai_result: null,
  },
  {
    title: 'Data Visualization - Revenue Chart',
    description: 'Bar chart showing quarterly revenue data in the investor relations section.',
    url: 'https://investors.acme-corp.com/charts/revenue.png',
    ai_result: null,
  },
  {
    title: 'Embedded Diagram - System Architecture',
    description: 'Technical architecture diagram embedded in the developer documentation.',
    url: 'https://docs.acme-corp.com/architecture/diagram.svg',
    ai_result: null,
  },
  {
    title: 'Testimonial Headshots - Reviews Page',
    description: 'Customer headshot photos displayed alongside their written testimonials.',
    url: 'https://www.acme-corp.com/reviews',
    ai_result: null,
  },
];

const colorContrastsData = [
  {
    title: 'Header Text on Dark Background',
    description: 'Checking contrast ratio of white header text against the dark navy background.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Header text passes both AA and AAA contrast requirements.',
      score: 98,
      foreground_color: '#ffffff',
      background_color: '#1a1a2e',
      contrast_ratio: '15.3:1',
      passes_aa: true,
      passes_aaa: true,
      findings: [
        { type: 'pass', severity: 'info', title: 'Excellent contrast ratio', description: 'White text on dark navy (#1a1a2e) achieves a 15.3:1 ratio, well above both AA (4.5:1) and AAA (7:1) thresholds.', recommendation: 'No changes needed. Maintain this color combination.' },
      ],
      recommendations: ['Maintain current color combination', 'Use this as a reference for other text areas'],
      details: 'The header text-background combination provides excellent readability for all users. This passes both WCAG 2.1 AA and AAA minimum contrast requirements.',
    },
  },
  {
    title: 'Button Text Contrast Check',
    description: 'Evaluating primary and secondary button text contrast across all button variants.',
    url: 'https://www.acme-corp.com/design-system/buttons',
    ai_result: {
      summary: 'Primary buttons pass AA; secondary and disabled button states fail contrast requirements.',
      score: 60,
      findings: [
        { type: 'pass', severity: 'info', title: 'Primary button passes', description: 'White (#ffffff) on blue (#0066cc) = 5.74:1 ratio. Passes AA.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'major', title: 'Secondary button fails', description: 'Light blue (#66aaff) on white (#ffffff) = 2.45:1 ratio. Fails AA.', recommendation: 'Darken secondary button text to at least #0066cc.' },
        { type: 'warning', severity: 'minor', title: 'Disabled button very low contrast', description: 'Gray (#cccccc) on light gray (#f0f0f0) = 1.43:1 ratio.', recommendation: 'Increase disabled state contrast while keeping it visually distinct from active state. Aim for at least 3:1.' },
      ],
      recommendations: ['Darken secondary button text color', 'Increase disabled state contrast', 'Update design system with compliant colors', 'Test all button states in context'],
      details: 'Button contrast varies significantly across states. The secondary button text color needs to be substantially darker to meet minimum AA requirements.',
    },
  },
  {
    title: 'Body Text Paragraph Contrast',
    description: 'Measuring contrast of main body text color across standard and alternative backgrounds.',
    url: 'https://www.acme-corp.com/blog',
    ai_result: {
      summary: 'Body text color is borderline AA compliant; slight darkening recommended.',
      score: 72,
      foreground_color: '#666666',
      background_color: '#ffffff',
      contrast_ratio: '5.74:1',
      passes_aa: true,
      passes_aaa: false,
      findings: [
        { type: 'pass', severity: 'info', title: 'Passes AA for normal text', description: '#666666 on white achieves 5.74:1, above the 4.5:1 AA threshold.', recommendation: 'Currently passing but consider darkening for improved readability.' },
        { type: 'warning', severity: 'minor', title: 'Fails AAA enhanced contrast', description: '5.74:1 is below the 7:1 AAA threshold.', recommendation: 'Darken to #595959 for a 7.0:1 ratio to meet AAA requirements.' },
      ],
      recommendations: ['Consider darkening body text to #595959 for AAA compliance', 'Ensure consistent text color across all sections'],
      details: 'Body text passes AA requirements but lacks margin. Darkening the text slightly would provide better readability and approach AAA compliance.',
    },
  },
  {
    title: 'Navigation Link Hover State',
    description: 'Verifying contrast of navigation links in normal, hover, and active states.',
    url: 'https://www.acme-corp.com/nav',
    ai_result: {
      summary: 'Navigation link normal and hover states pass AA; active state has insufficient contrast.',
      score: 75,
      findings: [
        { type: 'pass', severity: 'info', title: 'Normal state passes', description: '#0066cc on #ffffff = 5.74:1. Passes AA.', recommendation: 'No changes needed.' },
        { type: 'pass', severity: 'info', title: 'Hover state passes', description: '#004499 on #f0f8ff = 8.2:1. Passes AA and AAA.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'major', title: 'Active state fails', description: '#88bbff on #ffffff = 2.05:1. Fails AA.', recommendation: 'Darken active state color to at least #3366cc.' },
      ],
      recommendations: ['Darken the active link state color', 'Ensure all interactive states maintain sufficient contrast'],
      details: 'Link colors need to maintain adequate contrast in all states, not just the default. The active state color is too light on the white background.',
    },
  },
  {
    title: 'Form Placeholder Text Contrast',
    description: 'Assessing contrast of placeholder text in form input fields across the site.',
    url: 'https://www.acme-corp.com/contact',
    ai_result: {
      summary: 'Placeholder text fails minimum contrast requirements across all forms.',
      score: 25,
      foreground_color: '#c0c0c0',
      background_color: '#ffffff',
      contrast_ratio: '1.82:1',
      passes_aa: false,
      passes_aaa: false,
      findings: [
        { type: 'error', severity: 'major', title: 'Placeholder text invisible to many users', description: '#c0c0c0 on white (#ffffff) has only 1.82:1 contrast, far below the 4.5:1 minimum.', recommendation: 'Darken placeholder text to at least #767676 for a 4.54:1 ratio.' },
      ],
      recommendations: ['Darken placeholder text color to #767676 or darker', 'Do not rely on placeholder as the only label', 'Ensure visible labels are present for all fields'],
      details: 'Placeholder text with extremely low contrast is a common accessibility issue. The text is unreadable for users with low vision. Always provide visible labels in addition to placeholders.',
    },
  },
  {
    title: 'Alert Banner Color Combinations',
    description: 'Checking contrast of success, warning, error, and info alert banners.',
    url: 'https://www.acme-corp.com/design-system/alerts',
    ai_result: {
      summary: 'Error and info alerts pass; warning and success alerts fail contrast requirements.',
      score: 55,
      findings: [
        { type: 'pass', severity: 'info', title: 'Error alert passes', description: 'Dark red (#8b0000) on light red (#fce4e4) = 6.7:1. Passes AA and AAA.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'major', title: 'Warning alert fails', description: 'Orange (#ff8c00) on yellow (#fff3cd) = 2.1:1. Fails AA.', recommendation: 'Darken warning text to #7a4100 for proper contrast.' },
        { type: 'error', severity: 'major', title: 'Success alert fails', description: 'Green (#28a745) on light green (#d4edda) = 2.9:1. Fails AA.', recommendation: 'Darken success text to #155724 for a 7.1:1 ratio.' },
        { type: 'pass', severity: 'info', title: 'Info alert passes', description: 'Dark blue (#004085) on light blue (#cce5ff) = 7.2:1. Passes AA and AAA.', recommendation: 'No changes needed.' },
      ],
      recommendations: ['Darken warning alert text color', 'Darken success alert text color', 'Update design system alert color tokens'],
      details: 'Alert banners often use color combinations that feel intuitive but fail contrast checks. Warning (orange/yellow) and success (green/light green) are the most common offenders.',
    },
  },
  {
    title: 'Footer Text on Dark Background',
    description: 'Evaluating footer content contrast including links, copyright text, and social media icons.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Footer text passes AA but footer links in light gray do not.',
      score: 65,
      findings: [
        { type: 'pass', severity: 'info', title: 'Footer body text passes', description: '#e0e0e0 on #222222 = 11.6:1. Excellent contrast.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'major', title: 'Footer links fail', description: '#888888 on #222222 = 3.54:1. Below AA 4.5:1 threshold.', recommendation: 'Lighten footer links to #a0a0a0 for a 4.6:1 ratio.' },
      ],
      recommendations: ['Lighten footer link color', 'Ensure all footer text elements meet minimum contrast'],
      details: 'Dark backgrounds require careful attention to text contrast, especially for links that may be styled differently from body text.',
    },
  },
  {
    title: 'Sidebar Widget Text Contrast',
    description: 'Checking contrast of all text in the sidebar widgets on blog and documentation pages.',
    url: 'https://docs.acme-corp.com',
    ai_result: {
      summary: 'Sidebar text contrast is generally good but category tags have insufficient contrast.',
      score: 78,
      findings: [
        { type: 'pass', severity: 'info', title: 'Sidebar headings pass', description: '#333333 on #f8f9fa = 10.1:1. Excellent.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'major', title: 'Category tags fail', description: '#9999cc on #f0f0ff = 2.3:1. Below AA threshold.', recommendation: 'Darken tag text to #5555aa for adequate contrast.' },
      ],
      recommendations: ['Darken category tag text colors', 'Test all sidebar elements individually'],
      details: 'Category tags use a purple-on-light-purple scheme that is visually pleasing but fails contrast requirements. A darker shade maintains the purple branding while improving readability.',
    },
  },
  {
    title: 'Data Table Cell Contrast',
    description: 'Analyzing text contrast in data table cells including alternating row backgrounds.',
    url: 'https://www.acme-corp.com/reports/data',
    ai_result: {
      summary: 'Table text contrast passes on both white and alternating gray row backgrounds.',
      score: 90,
      findings: [
        { type: 'pass', severity: 'info', title: 'White rows pass', description: '#333333 on #ffffff = 12.6:1. Excellent.', recommendation: 'No changes needed.' },
        { type: 'pass', severity: 'info', title: 'Alternating rows pass', description: '#333333 on #f5f5f5 = 11.3:1. Excellent.', recommendation: 'No changes needed.' },
      ],
      recommendations: ['Maintain current table styling', 'Ensure any custom cell highlights also meet contrast requirements'],
      details: 'Data tables have excellent text contrast on both white and alternating gray row backgrounds.',
    },
  },
  {
    title: 'Tooltip Text Contrast',
    description: 'Measuring contrast of tooltip text and background combinations site-wide.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Tooltip contrast is adequate but border contrast against surrounding content needs improvement.',
      score: 80,
      findings: [
        { type: 'pass', severity: 'info', title: 'Tooltip text passes', description: '#ffffff on #333333 = 12.6:1. Passes all levels.', recommendation: 'No changes needed.' },
        { type: 'warning', severity: 'minor', title: 'Tooltip boundary low contrast', description: 'Tooltip border does not clearly distinguish it from surrounding content.', recommendation: 'Add a subtle border or shadow to help distinguish the tooltip.' },
      ],
      recommendations: ['Add visible tooltip boundary', 'Ensure tooltip is perceivable by all users'],
      details: 'Tooltip text itself has good contrast, but the tooltip container needs better visual distinction from surrounding content.',
    },
  },
  {
    title: 'Badge and Tag Component Contrast',
    description: 'Evaluating color contrast across all badge and tag component variants in the design system.',
    url: 'https://www.acme-corp.com/design-system/badges',
    ai_result: null,
  },
  {
    title: 'Chart Legend Text Contrast',
    description: 'Checking contrast of chart legend labels against chart background in data visualizations.',
    url: 'https://analytics.acme-corp.com/dashboard',
    ai_result: null,
  },
  {
    title: 'Mobile Navigation Contrast - Dark Mode',
    description: 'Verifying dark mode navigation text contrast on mobile viewport.',
    url: 'https://m.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Breadcrumb Separator Contrast',
    description: 'Assessing contrast of breadcrumb separator characters and inactive link text.',
    url: 'https://www.acme-corp.com/products/category/item',
    ai_result: null,
  },
  {
    title: 'Hero Section Overlay Text Contrast',
    description: 'Analyzing text contrast on images with semi-transparent overlay backgrounds.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
];

const screenReaderOptimizationsData = [
  {
    title: 'Main Navigation Screen Reader Flow',
    description: 'Optimizing the main navigation for logical screen reader flow including landmark regions and bypass links.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Navigation lacks proper landmark regions and bypass mechanisms for screen reader users.',
      score: 45,
      screen_readers_tested: ['NVDA 2024.1', 'JAWS 2024', 'VoiceOver macOS 14'],
      findings: [
        { type: 'error', severity: 'critical', title: 'No navigation landmark', description: 'The main navigation is not wrapped in a <nav> element or does not have role="navigation".', recommendation: 'Wrap the main navigation in a <nav> element with aria-label="Main navigation".' },
        { type: 'error', severity: 'major', title: 'No skip link', description: 'No skip-to-content link is provided for bypassing navigation.', recommendation: 'Add a visually hidden skip link as the first focusable element on the page.' },
      ],
      recommendations: ['Add nav landmark with aria-label', 'Add skip-to-content link', 'Ensure all page regions have landmarks', 'Test with NVDA and VoiceOver'],
      details: 'Screen reader users navigate primarily by landmarks and headings. Without proper navigation landmarks and skip links, users must listen to the entire navigation on every page.',
    },
  },
  {
    title: 'Form Labels Optimization',
    description: 'Ensuring all form fields have programmatically associated labels for screen reader announcement.',
    url: 'https://www.acme-corp.com/contact',
    ai_result: {
      summary: 'Six of ten form fields lack programmatically associated labels; screen readers announce them as unlabeled.',
      score: 40,
      screen_readers_tested: ['NVDA 2024.1', 'VoiceOver macOS 14'],
      findings: [
        { type: 'error', severity: 'critical', title: 'Email field unlabeled', description: 'The email input has a visual label but no for/id association or aria-label.', recommendation: 'Add matching for and id attributes or use aria-labelledby.' },
        { type: 'error', severity: 'critical', title: 'Phone field uses placeholder only', description: 'Phone number input relies on placeholder text which disappears and may not be announced.', recommendation: 'Add a persistent visible label element associated with the input.' },
      ],
      recommendations: ['Associate all labels with for/id pairs', 'Add visible labels, not just placeholders', 'Use aria-describedby for help text', 'Group related fields with fieldset/legend'],
      details: 'Unlabeled form fields are one of the most critical screen reader accessibility issues. Users cannot determine what information to enter in each field.',
    },
  },
  {
    title: 'Live Region Announcements',
    description: 'Implementing and testing ARIA live regions for dynamic content updates across the application.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Dynamic content updates are silent to screen readers; no ARIA live regions implemented.',
      score: 20,
      findings: [
        { type: 'error', severity: 'critical', title: 'No live regions for notifications', description: 'Toast notifications and alerts appear visually but are not announced to screen readers.', recommendation: 'Add aria-live="polite" to notification containers and aria-live="assertive" for urgent alerts.' },
        { type: 'error', severity: 'major', title: 'Cart total updates silently', description: 'When items are added to cart, the total updates without screen reader announcement.', recommendation: 'Use aria-live="polite" to announce cart changes.' },
      ],
      recommendations: ['Add aria-live regions for all dynamic content', 'Use polite for non-urgent updates, assertive for urgent', 'Test live region timing with screen readers'],
      details: 'Without ARIA live regions, screen reader users are unaware of any dynamic content changes. This makes interactive applications effectively unusable.',
    },
  },
  {
    title: 'Heading Hierarchy Optimization',
    description: 'Restructuring heading levels to provide a logical document outline for screen reader navigation.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Heading hierarchy has multiple issues: skipped levels, multiple h1s, and non-semantic heading usage.',
      score: 50,
      findings: [
        { type: 'error', severity: 'major', title: 'Multiple h1 elements', description: 'Page has 3 h1 elements; there should be exactly one per page.', recommendation: 'Reduce to a single h1 that describes the page content. Demote others to h2 or h3.' },
        { type: 'warning', severity: 'minor', title: 'Heading levels skipped', description: 'Pages jump from h2 to h4, skipping h3.', recommendation: 'Maintain sequential heading hierarchy without skipping levels.' },
      ],
      recommendations: ['Use exactly one h1 per page', 'Maintain sequential heading levels', 'Use headings for structure, not styling', 'Add headings to all content sections'],
      details: 'Screen reader users rely heavily on heading navigation to understand page structure and find content quickly. A logical heading hierarchy is essential for efficient navigation.',
    },
  },
  {
    title: 'Table Screen Reader Accessibility',
    description: 'Optimizing data tables for screen reader comprehension with proper headers and captions.',
    url: 'https://www.acme-corp.com/reports',
    ai_result: {
      summary: 'Data tables lack proper header associations; screen readers cannot determine column/row relationships.',
      score: 35,
      findings: [
        { type: 'error', severity: 'critical', title: 'Tables missing th elements', description: 'Data tables use td elements for all cells including headers.', recommendation: 'Convert header cells to th elements with scope="col" or scope="row".' },
        { type: 'error', severity: 'major', title: 'No table captions', description: 'Tables lack caption elements to identify their purpose.', recommendation: 'Add <caption> elements to all data tables describing the data they contain.' },
      ],
      recommendations: ['Convert header cells to th elements', 'Add scope attributes', 'Add captions to all tables', 'Use aria-describedby for complex tables'],
      details: 'Without proper table headers, screen readers cannot announce the column or row header when reading individual cells, making data tables incomprehensible.',
    },
  },
  {
    title: 'Image Description Enhancement',
    description: 'Improving image descriptions for detailed screen reader announcements beyond basic alt text.',
    url: 'https://www.acme-corp.com/products',
    ai_result: {
      summary: 'Product images have basic alt text but complex images need extended descriptions.',
      score: 65,
      findings: [
        { type: 'warning', severity: 'minor', title: 'Alt text too brief', description: 'Product images use generic descriptions like "Product photo" instead of specific details.', recommendation: 'Include product name, key features, and color in alt text.' },
      ],
      recommendations: ['Write specific, detailed alt text for product images', 'Use aria-describedby for complex images', 'Include key product details in descriptions'],
      details: 'Product images should describe key visual details that help users make purchasing decisions—color, style, features visible in the image.',
    },
  },
  {
    title: 'Modal Dialog Screen Reader Support',
    description: 'Implementing proper focus management and ARIA attributes for modal dialogs.',
    url: 'https://app.acme-corp.com/dialogs',
    ai_result: {
      summary: 'Modal dialogs lack focus management, role, and label attributes needed for screen reader support.',
      score: 30,
      findings: [
        { type: 'error', severity: 'critical', title: 'Modal has no dialog role', description: 'Modal overlay uses a div without role="dialog" or aria-modal="true".', recommendation: 'Add role="dialog", aria-modal="true", and aria-labelledby pointing to the dialog title.' },
        { type: 'error', severity: 'critical', title: 'Focus not managed', description: 'Focus is not moved to the modal when it opens, nor returned when it closes.', recommendation: 'Move focus to the first focusable element in the modal on open; return to trigger on close.' },
      ],
      recommendations: ['Add dialog role and aria-modal', 'Implement focus trapping within modal', 'Manage focus on open and close', 'Add aria-labelledby for dialog title'],
      details: 'Screen reader users will not be aware a modal has opened without proper ARIA attributes and focus management. The dialog pattern requires careful implementation.',
    },
  },
  {
    title: 'Page Title and Language Attributes',
    description: 'Ensuring all pages have descriptive titles and proper language declarations for screen readers.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Several pages share identical titles and some pages are missing language attributes.',
      score: 60,
      findings: [
        { type: 'error', severity: 'major', title: 'Duplicate page titles', description: '5 pages all use the generic title "Acme Corp" without page-specific information.', recommendation: 'Use unique, descriptive titles following the pattern: "Page Name - Section - Acme Corp".' },
        { type: 'warning', severity: 'minor', title: 'Missing lang attribute on 2 pages', description: 'Two pages lack the lang attribute on the html element.', recommendation: 'Add lang="en" to the html element on all pages.' },
      ],
      recommendations: ['Create unique, descriptive page titles', 'Add lang attribute to all pages', 'Use lang attribute for content in other languages'],
      details: 'Page titles are the first thing announced by screen readers when a page loads. Unique, descriptive titles help users identify and navigate between pages.',
    },
  },
  {
    title: 'Link Purpose and Context',
    description: 'Reviewing all links to ensure their purpose can be determined from link text or context.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Custom Widget Screen Reader Patterns',
    description: 'Implementing WAI-ARIA authoring practices for custom tab panels, accordions, and carousels.',
    url: 'https://www.acme-corp.com/components',
    ai_result: null,
  },
  {
    title: 'Error Announcement Optimization',
    description: 'Configuring form validation errors to be properly announced by screen readers.',
    url: 'https://www.acme-corp.com/forms',
    ai_result: {
      summary: 'Form validation errors are visual only; screen readers do not announce error messages.',
      score: 25,
      findings: [
        { type: 'error', severity: 'critical', title: 'Errors not announced', description: 'Validation errors appear below fields but are not linked to the fields and not announced.', recommendation: 'Use aria-describedby to associate error messages with fields and aria-invalid to indicate error state.' },
      ],
      recommendations: ['Add aria-describedby linking errors to fields', 'Set aria-invalid="true" on fields with errors', 'Use aria-live to announce new errors', 'Provide error summary at top of form'],
      details: 'Screen reader users receive no feedback when form validation fails. They must manually search for error messages, if they are even aware errors occurred.',
    },
  },
  {
    title: 'Breadcrumb Navigation for Screen Readers',
    description: 'Adding proper ARIA markup to breadcrumb navigation for screen reader orientation.',
    url: 'https://www.acme-corp.com/products/category',
    ai_result: {
      summary: 'Breadcrumb navigation lacks nav landmark and aria-label for screen reader identification.',
      score: 55,
      findings: [
        { type: 'error', severity: 'major', title: 'Breadcrumb not identified', description: 'Breadcrumb is rendered as a plain list without navigation landmark.', recommendation: 'Wrap in <nav aria-label="Breadcrumb"> and add aria-current="page" to the last item.' },
      ],
      recommendations: ['Add nav element with aria-label="Breadcrumb"', 'Use ordered list markup', 'Add aria-current="page" to current page item'],
      details: 'Breadcrumb navigation helps screen reader users understand their location within the site hierarchy. Proper ARIA markup makes this wayfinding tool accessible.',
    },
  },
  {
    title: 'Search Results Screen Reader Experience',
    description: 'Optimizing search results page for screen reader navigation including result count and filtering.',
    url: 'https://www.acme-corp.com/search',
    ai_result: null,
  },
  {
    title: 'Accordion Panel Screen Reader Support',
    description: 'Implementing WAI-ARIA accordion pattern for FAQ and content sections.',
    url: 'https://www.acme-corp.com/faq',
    ai_result: null,
  },
  {
    title: 'Footer Links Screen Reader Organization',
    description: 'Organizing footer link sections with proper heading and list structure for screen readers.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
];

const keyboardAuditsData = [
  {
    title: 'Tab Order Analysis - Homepage',
    description: 'Mapping and validating the tab order sequence across all interactive elements on the homepage.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Tab order is mostly logical but skips the search bar and becomes trapped in the hero carousel.',
      score: 52,
      elements_tested: 45,
      elements_keyboard_accessible: 38,
      keyboard_traps_found: 1,
      findings: [
        { type: 'error', severity: 'critical', title: 'Keyboard trap in hero carousel', description: 'Focus enters the carousel but arrow keys and tab do not move focus out of the component.', recommendation: 'Ensure Tab moves focus out of the carousel to the next interactive element. Add Escape key to exit.' },
        { type: 'error', severity: 'major', title: 'Search bar skipped in tab order', description: 'The search input is not reachable via Tab key navigation.', recommendation: 'Remove negative tabindex or CSS that prevents the search bar from receiving focus.' },
      ],
      recommendations: ['Fix keyboard trap in carousel', 'Include search bar in tab order', 'Verify tab order matches visual layout', 'Test tab order at all viewport sizes'],
      details: 'The homepage tab order generally follows visual layout but has two critical issues: a keyboard trap in the hero carousel and the search bar being unreachable.',
    },
  },
  {
    title: 'Focus Indicator Visibility Check',
    description: 'Verifying all interactive elements display visible focus indicators that meet WCAG 2.4.7 requirements.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Focus indicators are suppressed on 60% of interactive elements via CSS outline: none.',
      score: 30,
      findings: [
        { type: 'error', severity: 'critical', title: 'Focus outlines removed globally', description: 'CSS rule "*:focus { outline: none; }" removes all default focus indicators.', recommendation: 'Replace outline: none with custom focus styles using :focus-visible for keyboard-only indicators.' },
        { type: 'error', severity: 'major', title: 'Custom focus style insufficient', description: 'Where custom focus styles exist, they use a subtle color change that does not meet contrast requirements.', recommendation: 'Use a visible focus indicator with at least 3:1 contrast against adjacent colors.' },
      ],
      recommendations: ['Remove global outline: none rule', 'Add :focus-visible styles to all interactive elements', 'Use high-contrast focus indicators', 'Test focus visibility on all backgrounds'],
      details: 'Removing default focus indicators without providing adequate replacements is one of the most common and impactful keyboard accessibility failures.',
    },
  },
  {
    title: 'Dropdown Menu Keyboard Navigation',
    description: 'Testing keyboard interaction patterns for all dropdown menus including navigation submenus.',
    url: 'https://www.acme-corp.com/nav',
    ai_result: {
      summary: 'Dropdown menus are mouse-hover only; no keyboard interaction support implemented.',
      score: 15,
      findings: [
        { type: 'error', severity: 'critical', title: 'Dropdowns do not open with keyboard', description: 'Submenu dropdowns only appear on mouse hover; no keyboard trigger exists.', recommendation: 'Add Enter/Space to toggle dropdowns, arrow keys for navigation, Escape to close.' },
        { type: 'error', severity: 'critical', title: 'Submenu items not focusable', description: 'Dropdown menu items are not in the tab order and cannot receive keyboard focus.', recommendation: 'Make all menu items focusable and implement the WAI-ARIA menu pattern.' },
      ],
      recommendations: ['Implement keyboard triggers for dropdowns', 'Add arrow key navigation within menus', 'Add Escape to close', 'Follow WAI-ARIA menubar pattern'],
      details: 'The navigation dropdown menus are completely inaccessible to keyboard users, blocking access to all sub-pages linked from the dropdowns.',
    },
  },
  {
    title: 'Modal Dialog Keyboard Interaction',
    description: 'Auditing keyboard focus management and trapping within modal dialog overlays.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Modal dialogs do not trap focus or respond to Escape key for closing.',
      score: 25,
      findings: [
        { type: 'error', severity: 'critical', title: 'No focus trap in modal', description: 'Tabbing in the modal moves focus behind the overlay to background content.', recommendation: 'Implement focus trapping: Tab from last element goes to first; Shift+Tab from first goes to last.' },
        { type: 'error', severity: 'major', title: 'Escape key does not close modal', description: 'Pressing Escape has no effect when a modal is open.', recommendation: 'Add keydown listener for Escape to close the modal and return focus to the trigger.' },
      ],
      recommendations: ['Implement focus trapping', 'Add Escape key to close', 'Move focus to modal on open', 'Return focus to trigger on close'],
      details: 'Modal dialogs require careful keyboard management. Without focus trapping, keyboard users can interact with background content they should not be able to reach.',
    },
  },
  {
    title: 'Form Submission Keyboard Flow',
    description: 'Testing complete form workflows using keyboard only, from first field to submission.',
    url: 'https://www.acme-corp.com/contact',
    ai_result: {
      summary: 'Form can be completed via keyboard but date picker and file upload require mouse.',
      score: 60,
      findings: [
        { type: 'error', severity: 'critical', title: 'Date picker keyboard inaccessible', description: 'Custom date picker widget cannot be operated with keyboard.', recommendation: 'Replace with a keyboard-accessible date picker or allow manual date entry in a text field.' },
        { type: 'error', severity: 'major', title: 'File upload drag-only', description: 'File upload area only supports drag-and-drop with no keyboard alternative.', recommendation: 'Include a standard file input button alongside the drag-and-drop area.' },
      ],
      recommendations: ['Replace date picker with accessible alternative', 'Add keyboard-accessible file upload', 'Ensure submit button is reachable and activatable', 'Announce form submission result'],
      details: 'The form is partially keyboard accessible but two custom widgets (date picker and file upload) create barriers that prevent keyboard-only form submission.',
    },
  },
  {
    title: 'Interactive Table Keyboard Controls',
    description: 'Auditing sortable, filterable data tables for keyboard operability.',
    url: 'https://app.acme-corp.com/data-tables',
    ai_result: {
      summary: 'Data table sorting and pagination work via keyboard but row selection and inline editing do not.',
      score: 55,
      findings: [
        { type: 'pass', severity: 'info', title: 'Column sorting keyboard accessible', description: 'Sort buttons in table headers can be activated with Enter or Space.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'major', title: 'Row selection requires click', description: 'Selecting rows for bulk actions requires mouse click on checkbox area.', recommendation: 'Make row checkboxes focusable and operable with Space key.' },
      ],
      recommendations: ['Make row selection checkboxes keyboard accessible', 'Add keyboard support for inline editing', 'Ensure pagination is keyboard navigable'],
      details: 'Data tables have partial keyboard support. Core navigation works but row-level interactions need keyboard accessibility improvements.',
    },
  },
  {
    title: 'Carousel and Slider Controls',
    description: 'Testing keyboard interaction for image carousels, content sliders, and range inputs.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Carousels and sliders lack keyboard interaction; auto-rotation cannot be paused.',
      score: 20,
      findings: [
        { type: 'error', severity: 'critical', title: 'Carousel has no keyboard controls', description: 'Image carousel rotates automatically and has no keyboard-accessible controls.', recommendation: 'Add pause/play, previous/next buttons that are keyboard accessible. Stop rotation on focus.' },
        { type: 'error', severity: 'critical', title: 'Auto-rotation distracting', description: 'Carousel rotates every 3 seconds with no way to pause.', recommendation: 'Add a pause button and stop rotation when any carousel element has focus.' },
      ],
      recommendations: ['Add keyboard-accessible carousel controls', 'Implement pause functionality', 'Stop auto-rotation on focus or hover', 'Follow WAI-ARIA carousel pattern'],
      details: 'Auto-rotating carousels without pause controls violate WCAG 2.2.2. The lack of keyboard controls makes the carousel content completely inaccessible to keyboard users.',
    },
  },
  {
    title: 'Skip Links and Bypass Mechanisms',
    description: 'Verifying skip navigation links and other bypass mechanisms for keyboard efficiency.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Skip link exists but is broken; does not move focus to the main content area.',
      score: 40,
      findings: [
        { type: 'error', severity: 'major', title: 'Skip link target missing', description: 'Skip link points to #main-content but no element with that ID exists.', recommendation: 'Add id="main-content" to the main content container and ensure it is focusable with tabindex="-1".' },
      ],
      recommendations: ['Fix skip link target', 'Ensure main content is focusable', 'Consider adding skip links for other repeated content', 'Test skip link in all major browsers'],
      details: 'A broken skip link is worse than no skip link because it gives users a false expectation that they can bypass navigation.',
    },
  },
  {
    title: 'Accordion and Collapsible Section Controls',
    description: 'Auditing keyboard interaction for accordion panels and collapsible content sections.',
    url: 'https://www.acme-corp.com/faq',
    ai_result: null,
  },
  {
    title: 'Tab Panel Widget Keyboard Pattern',
    description: 'Verifying tabbed interface follows WAI-ARIA tab pattern for keyboard interaction.',
    url: 'https://www.acme-corp.com/products',
    ai_result: null,
  },
  {
    title: 'Context Menu Keyboard Accessibility',
    description: 'Testing right-click context menus for keyboard operability and screen reader support.',
    url: 'https://app.acme-corp.com/files',
    ai_result: null,
  },
  {
    title: 'Drag-and-Drop Keyboard Alternatives',
    description: 'Assessing drag-and-drop interfaces for keyboard-accessible alternatives.',
    url: 'https://app.acme-corp.com/kanban',
    ai_result: {
      summary: 'Kanban board drag-and-drop has no keyboard alternative; items cannot be moved without a mouse.',
      score: 10,
      findings: [
        { type: 'error', severity: 'critical', title: 'No keyboard alternative for drag-and-drop', description: 'Cards can only be moved between columns via mouse drag.', recommendation: 'Add a keyboard-accessible move action (e.g., a "Move to" button or keyboard shortcuts).' },
      ],
      recommendations: ['Add keyboard-accessible move/reorder mechanism', 'Consider arrow key + modifier for moving items', 'Announce position changes with aria-live'],
      details: 'Drag-and-drop functionality must have a keyboard-accessible alternative. A common approach is to provide a context menu or action button with move options.',
    },
  },
  {
    title: 'Infinite Scroll Keyboard Interaction',
    description: 'Evaluating keyboard behavior in infinite scroll content loading patterns.',
    url: 'https://www.acme-corp.com/blog',
    ai_result: {
      summary: 'Infinite scroll prevents keyboard users from reaching the footer and does not announce new content.',
      score: 35,
      findings: [
        { type: 'error', severity: 'major', title: 'Footer unreachable', description: 'Infinite scroll continuously loads content, making the footer permanently unreachable via keyboard.', recommendation: 'Replace infinite scroll with paginated loading or a "Load more" button.' },
        { type: 'error', severity: 'major', title: 'New content not announced', description: 'When new content loads, screen readers are not informed.', recommendation: 'Announce loaded content count and provide focus management.' },
      ],
      recommendations: ['Replace infinite scroll with pagination or load-more button', 'Announce new content loading', 'Ensure footer is reachable'],
      details: 'Infinite scroll creates significant barriers for keyboard and screen reader users. A "Load more" button with status announcements is a more accessible alternative.',
    },
  },
  {
    title: 'Tooltip Keyboard Trigger',
    description: 'Ensuring tooltips are accessible via keyboard focus, not just mouse hover.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Mobile Hamburger Menu Keyboard Support',
    description: 'Testing the responsive hamburger menu for keyboard operability on mobile viewports.',
    url: 'https://m.acme-corp.com',
    ai_result: null,
  },
];

const ariaLabelsData = [
  {
    title: 'Navigation Menu ARIA Labels',
    description: 'Generating and validating ARIA labels for primary, secondary, and footer navigation menus.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Multiple navigation landmarks lack distinguishing ARIA labels.',
      score: 45,
      findings: [
        { type: 'error', severity: 'major', title: 'Duplicate navigation landmarks', description: 'Three nav elements exist without aria-label, making them indistinguishable for screen readers.', recommendation: 'Add aria-label="Main navigation", aria-label="Secondary navigation", and aria-label="Footer navigation".' },
        { type: 'warning', severity: 'minor', title: 'Redundant ARIA labels', description: 'The main nav has aria-label="Navigation nav menu" which is redundant with the nav role.', recommendation: 'Simplify to aria-label="Main" since the navigation role is already announced.' },
      ],
      recommendations: ['Add unique aria-labels to all nav elements', 'Avoid redundancy in labels', 'Test with screen readers to verify announcements'],
      details: 'When multiple navigation landmarks exist, each must have a unique aria-label so screen reader users can distinguish between them in landmark navigation.',
    },
  },
  {
    title: 'Modal Dialog Accessibility',
    description: 'Adding proper ARIA roles, labels, and descriptions to all modal dialog components.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Modal dialogs lack role="dialog", aria-modal, and aria-labelledby attributes.',
      score: 30,
      findings: [
        { type: 'error', severity: 'critical', title: 'Missing dialog role', description: 'Modal overlays use a plain div without role="dialog".', recommendation: 'Add role="dialog" and aria-modal="true" to the modal container.' },
        { type: 'error', severity: 'critical', title: 'No accessible name', description: 'Modals lack aria-labelledby pointing to the dialog heading.', recommendation: 'Add aria-labelledby referencing the modal title element ID.' },
      ],
      recommendations: ['Add role="dialog" to all modals', 'Add aria-modal="true"', 'Use aria-labelledby for modal titles', 'Add aria-describedby for modal descriptions'],
      details: 'Screen readers need ARIA attributes to identify and announce modal dialogs properly. Without these, users may not realize a modal has opened.',
    },
  },
  {
    title: 'Search Component ARIA Enhancement',
    description: 'Optimizing search input, autocomplete, and results with proper ARIA combobox pattern.',
    url: 'https://www.acme-corp.com/search',
    ai_result: {
      summary: 'Search autocomplete lacks ARIA combobox pattern; suggestions are not announced.',
      score: 35,
      findings: [
        { type: 'error', severity: 'critical', title: 'Autocomplete not accessible', description: 'Search suggestions dropdown has no ARIA combobox implementation.', recommendation: 'Implement role="combobox", aria-expanded, aria-autocomplete, and role="listbox" for suggestions.' },
        { type: 'error', severity: 'major', title: 'Active suggestion not indicated', description: 'Highlighted suggestion is not announced to screen readers.', recommendation: 'Use aria-activedescendant to indicate the currently highlighted suggestion.' },
      ],
      recommendations: ['Implement ARIA combobox pattern', 'Add aria-activedescendant for active suggestion', 'Announce number of suggestions', 'Add aria-label to search input'],
      details: 'The ARIA combobox pattern is required for accessible autocomplete search. Without it, screen reader users cannot perceive or interact with search suggestions.',
    },
  },
  {
    title: 'Tab Panel ARIA Implementation',
    description: 'Adding WAI-ARIA tab pattern roles and properties to tabbed content interfaces.',
    url: 'https://www.acme-corp.com/products',
    ai_result: {
      summary: 'Tabbed interface lacks all ARIA tab roles and keyboard interaction support.',
      score: 25,
      findings: [
        { type: 'error', severity: 'critical', title: 'Missing tab roles', description: 'Tab buttons use div elements without role="tab", role="tablist", or role="tabpanel".', recommendation: 'Add role="tablist" to container, role="tab" to each tab, and role="tabpanel" to each panel.' },
        { type: 'error', severity: 'major', title: 'No aria-selected state', description: 'The active tab is not indicated with aria-selected="true".', recommendation: 'Set aria-selected="true" on the active tab and "false" on inactive tabs.' },
      ],
      recommendations: ['Implement full ARIA tab pattern', 'Add aria-selected states', 'Connect tabs to panels with aria-controls', 'Add arrow key navigation between tabs'],
      details: 'The WAI-ARIA tab pattern requires specific roles, states, and keyboard interaction. Without these, tabbed interfaces are not perceivable as tabs to screen reader users.',
    },
  },
  {
    title: 'Form Field ARIA Descriptions',
    description: 'Adding aria-describedby for help text, format hints, and character count on form fields.',
    url: 'https://www.acme-corp.com/contact',
    ai_result: {
      summary: 'Form help text and format hints are not programmatically associated with their fields.',
      score: 50,
      findings: [
        { type: 'error', severity: 'major', title: 'Help text not associated', description: 'Instructions below form fields are not linked via aria-describedby.', recommendation: 'Add aria-describedby pointing to the help text element ID.' },
        { type: 'warning', severity: 'minor', title: 'Character count not announced', description: 'Remaining character count updates visually but is not announced.', recommendation: 'Use aria-live="polite" on the character counter element.' },
      ],
      recommendations: ['Link help text with aria-describedby', 'Make character counters live regions', 'Use aria-required for mandatory fields', 'Add aria-invalid for validation errors'],
      details: 'Form field descriptions provide crucial context for users. Without aria-describedby, screen reader users miss format requirements, help text, and error details.',
    },
  },
  {
    title: 'Icon Button Accessible Names',
    description: 'Ensuring all icon-only buttons have accessible names via aria-label or visually hidden text.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: '15 icon-only buttons lack accessible names; screen readers announce them as "button" with no context.',
      score: 20,
      findings: [
        { type: 'error', severity: 'critical', title: 'Unnamed icon buttons', description: '15 buttons contain only icon graphics with no accessible name.', recommendation: 'Add aria-label to each icon button describing its action (e.g., aria-label="Close", aria-label="Edit profile").' },
      ],
      recommendations: ['Add aria-label to all icon-only buttons', 'Use descriptive action labels', 'Avoid generic labels like "button" or "icon"', 'Test all buttons with screen readers'],
      details: 'Icon buttons without accessible names are announced as simply "button" by screen readers. Users have no way to determine what action the button performs.',
    },
  },
  {
    title: 'Accordion ARIA States',
    description: 'Implementing aria-expanded and aria-controls for accordion toggle buttons.',
    url: 'https://www.acme-corp.com/faq',
    ai_result: {
      summary: 'Accordion headers lack aria-expanded state and aria-controls relationship.',
      score: 40,
      findings: [
        { type: 'error', severity: 'major', title: 'No expanded state', description: 'Accordion trigger buttons do not indicate whether their associated panel is expanded or collapsed.', recommendation: 'Add aria-expanded="true/false" toggling on each accordion button.' },
        { type: 'error', severity: 'major', title: 'No panel association', description: 'Buttons are not programmatically linked to their content panels.', recommendation: 'Add aria-controls pointing to the associated panel element ID.' },
      ],
      recommendations: ['Add aria-expanded to toggle buttons', 'Add aria-controls linking to panels', 'Use button elements for triggers', 'Implement keyboard pattern (arrow keys optional)'],
      details: 'Screen reader users need aria-expanded to know the current state of each accordion section. Without it, they cannot determine which sections are open or closed.',
    },
  },
  {
    title: 'Progress Indicator ARIA Attributes',
    description: 'Adding proper ARIA attributes to progress bars, loading spinners, and step indicators.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Progress indicators are visual-only with no ARIA roles or values for screen readers.',
      score: 15,
      findings: [
        { type: 'error', severity: 'critical', title: 'Progress bar not accessible', description: 'Progress bar div has no role="progressbar" or aria-valuenow attributes.', recommendation: 'Add role="progressbar", aria-valuenow, aria-valuemin="0", aria-valuemax="100", and aria-label.' },
        { type: 'error', severity: 'major', title: 'Loading spinner silent', description: 'Loading spinner animation is not announced to screen readers.', recommendation: 'Add aria-live="polite" region with loading status text, or use role="status".' },
      ],
      recommendations: ['Add progressbar role with value attributes', 'Announce loading states with aria-live', 'Provide text status for all visual progress', 'Update aria-valuenow dynamically'],
      details: 'All visual progress indicators must have programmatic equivalents. Screen reader users need to know that content is loading and how much progress has been made.',
    },
  },
  {
    title: 'Notification Badge ARIA Labels',
    description: 'Ensuring notification count badges are announced by screen readers on icons and buttons.',
    url: 'https://app.acme-corp.com/notifications',
    ai_result: null,
  },
  {
    title: 'Breadcrumb ARIA Current Page',
    description: 'Adding aria-current="page" to breadcrumb navigation to indicate the current page.',
    url: 'https://www.acme-corp.com/products/category',
    ai_result: null,
  },
  {
    title: 'Expandable Tree View ARIA Pattern',
    description: 'Implementing ARIA tree view pattern for hierarchical navigation in the documentation sidebar.',
    url: 'https://docs.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Alert and Status Message Roles',
    description: 'Adding role="alert" and role="status" to dynamic notification messages.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Dynamic alerts and status messages lack appropriate ARIA roles for automatic announcement.',
      score: 30,
      findings: [
        { type: 'error', severity: 'critical', title: 'Alerts not announced', description: 'Error and warning messages appear without role="alert" and are not announced by screen readers.', recommendation: 'Add role="alert" to urgent messages and role="status" to non-urgent updates.' },
      ],
      recommendations: ['Add role="alert" for urgent messages', 'Add role="status" for informational updates', 'Test announcement timing with screen readers', 'Avoid excessive live region updates'],
      details: 'ARIA alert and status roles ensure that important messages are automatically announced by screen readers without requiring the user to navigate to them.',
    },
  },
  {
    title: 'Data Grid ARIA Roles',
    description: 'Adding appropriate ARIA grid roles to interactive data tables with editable cells.',
    url: 'https://app.acme-corp.com/spreadsheet',
    ai_result: {
      summary: 'Interactive data grid uses table markup but needs grid roles for its interactive capabilities.',
      score: 40,
      findings: [
        { type: 'error', severity: 'major', title: 'Grid role missing', description: 'Interactive table with editable cells uses role="table" instead of role="grid".', recommendation: 'Use role="grid" for interactive tables and role="gridcell" for editable cells.' },
        { type: 'warning', severity: 'minor', title: 'No aria-readonly indication', description: 'Read-only cells are not distinguished from editable cells.', recommendation: 'Add aria-readonly="true" to non-editable cells.' },
      ],
      recommendations: ['Use grid role for interactive tables', 'Mark editable cells with gridcell role', 'Add aria-readonly to non-editable cells', 'Implement arrow key navigation between cells'],
      details: 'Interactive data grids need the ARIA grid pattern to communicate their interactive nature. Standard table markup does not convey that cells can be edited or selected.',
    },
  },
  {
    title: 'Carousel Slide ARIA Labels',
    description: 'Labeling carousel slides with aria-label and implementing aria-roledescription.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Mega Menu ARIA Implementation',
    description: 'Implementing complete ARIA menu pattern for the site mega-menu navigation.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
];

const accessibilityReportsData = [
  {
    title: 'Q1 2024 Accessibility Audit Report',
    description: 'Comprehensive quarterly accessibility audit report covering all public-facing web properties.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Q1 2024 audit found 142 accessibility issues across 12 web properties; 34 are critical.',
      score: 55,
      report_type: 'quarterly_audit',
      total_issues: 142,
      critical_issues: 34,
      major_issues: 56,
      minor_issues: 52,
      findings: [
        { type: 'error', severity: 'critical', title: '34 critical barriers identified', description: 'Critical issues include keyboard traps, missing form labels, and absent alt text on informative images.', recommendation: 'Prioritize critical issues for immediate remediation within 30 days.' },
        { type: 'warning', severity: 'major', title: '56 major issues require attention', description: 'Major issues include color contrast failures, missing headings, and incomplete ARIA implementations.', recommendation: 'Schedule major issues for remediation within 60 days.' },
      ],
      recommendations: ['Address 34 critical issues within 30 days', 'Remediate major issues within 60 days', 'Implement automated accessibility testing in CI/CD', 'Schedule monthly accessibility regression tests'],
      details: 'The Q1 2024 audit reveals a 12% improvement over Q4 2023. However, 34 critical barriers remain that prevent users with disabilities from completing key tasks on the site.',
    },
  },
  {
    title: 'Annual VPAT Documentation',
    description: 'Voluntary Product Accessibility Template documentation for enterprise software compliance reporting.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'VPAT assessment shows product partially supports WCAG 2.1 Level AA with notable exceptions in forms and media.',
      score: 62,
      report_type: 'vpat',
      conformance_level: 'Partially Supports',
      findings: [
        { type: 'warning', severity: 'major', title: 'Partially supports Level AA', description: 'Product meets 65% of Level AA success criteria. Key gaps in forms, color contrast, and multimedia.', recommendation: 'Focus remediation on failing criteria before next VPAT update.' },
      ],
      recommendations: ['Remediate form accessibility issues', 'Fix color contrast failures', 'Add captions to all video content', 'Update VPAT annually'],
      details: 'The VPAT documents the product accessibility status for enterprise procurement. The "Partially Supports" rating may impact sales to government and education sectors.',
    },
  },
  {
    title: 'Section 508 Compliance Report',
    description: 'Federal Section 508 compliance assessment for government contract eligibility.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Site does not fully meet Section 508 requirements; 18 non-conformances documented.',
      score: 58,
      report_type: 'section_508',
      findings: [
        { type: 'error', severity: 'critical', title: 'Section 508 non-conformances', description: '18 instances of non-conformance with Section 508 revised standards.', recommendation: 'Remediate all non-conformances to maintain government contract eligibility.' },
      ],
      recommendations: ['Fix 18 non-conformances', 'Prioritize keyboard and screen reader issues', 'Conduct assistive technology testing', 'Document remediation timeline for procurement teams'],
      details: 'Section 508 compliance is mandatory for products sold to U.S. federal agencies. Non-conformances may disqualify the product from government procurement.',
    },
  },
  {
    title: 'Automated Scan Summary Report',
    description: 'Aggregated results from automated accessibility scanning tools across all pages.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Automated scanning detected 456 issues across 120 pages; estimated 30% are false positives.',
      score: 50,
      report_type: 'automated_scan',
      pages_scanned: 120,
      total_issues_detected: 456,
      estimated_false_positives: '30%',
      findings: [
        { type: 'warning', severity: 'major', title: 'High volume of automated findings', description: '456 issues detected but automated tools can only catch approximately 30-40% of accessibility issues.', recommendation: 'Manually review findings to filter false positives, then conduct manual testing for issues automation cannot detect.' },
      ],
      recommendations: ['Manually review and triage all findings', 'Conduct manual testing for issues automation misses', 'Use automation as a baseline, not the final word', 'Integrate automated scanning into build pipeline'],
      details: 'Automated scanning provides a baseline understanding of accessibility issues but cannot replace manual testing. Approximately 30% of findings are expected to be false positives.',
    },
  },
  {
    title: 'User Testing Report - Screen Reader Users',
    description: 'Results from moderated usability testing sessions with screen reader users.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Screen reader users completed 3 of 8 tasks successfully; major barriers in navigation and forms.',
      score: 38,
      report_type: 'user_testing',
      participants: 6,
      tasks_tested: 8,
      tasks_completed: 3,
      findings: [
        { type: 'error', severity: 'critical', title: 'Navigation unusable', description: 'All 6 participants could not navigate to sub-pages using the dropdown menu.', recommendation: 'Rebuild navigation with proper keyboard and screen reader support.' },
        { type: 'error', severity: 'critical', title: 'Checkout form abandoned', description: '5 of 6 participants abandoned the checkout form due to unlabeled fields.', recommendation: 'Add proper labels to all form fields.' },
        { type: 'warning', severity: 'major', title: 'Search results confusing', description: 'Participants had difficulty distinguishing individual search results.', recommendation: 'Add clear headings and structure to search result items.' },
      ],
      recommendations: ['Rebuild navigation for screen reader access', 'Label all form fields', 'Improve search results structure', 'Conduct follow-up testing after fixes'],
      details: 'User testing with screen reader participants reveals severe usability barriers that automated tools cannot detect. The navigation and form issues are complete blockers.',
    },
  },
  {
    title: 'Mobile Accessibility Audit Report',
    description: 'Accessibility evaluation of mobile-responsive layouts and touch interactions.',
    url: 'https://m.acme-corp.com',
    ai_result: {
      summary: 'Mobile experience has touch target and zoom issues; screen reader support on mobile is incomplete.',
      score: 48,
      report_type: 'mobile_audit',
      findings: [
        { type: 'error', severity: 'major', title: 'Touch targets too small', description: '40% of interactive elements are below the 44x44px minimum touch target size.', recommendation: 'Increase all touch targets to at least 44x44 CSS pixels.' },
        { type: 'error', severity: 'major', title: 'Content lost at 200% zoom', description: 'Some content is clipped or overlaps when zoomed to 200%.', recommendation: 'Ensure content reflows without horizontal scrolling at 200% zoom.' },
      ],
      recommendations: ['Increase touch target sizes', 'Fix reflow at 200% zoom', 'Test with TalkBack and VoiceOver on mobile', 'Ensure pinch-to-zoom is not disabled'],
      details: 'Mobile accessibility testing reveals issues unique to small screens and touch interaction. Touch target sizes and zoom behavior are the primary concerns.',
    },
  },
  {
    title: 'Competitor Accessibility Benchmarking Report',
    description: 'Comparative accessibility analysis against three major competitors in the industry.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Acme Corp ranks 3rd of 4 competitors in accessibility. Top competitor scores 85/100 vs our 55/100.',
      score: 55,
      report_type: 'benchmarking',
      findings: [
        { type: 'info', severity: 'info', title: 'Below industry average', description: 'Acme Corp accessibility score (55) trails the industry average (68).', recommendation: 'Invest in a structured remediation program to close the gap.' },
      ],
      recommendations: ['Study top competitor accessibility implementation', 'Set goal to reach industry average within 6 months', 'Prioritize issues that competitors have already addressed'],
      details: 'Benchmarking against competitors shows Acme Corp trails in accessibility. This represents both a compliance risk and a competitive disadvantage.',
    },
  },
  {
    title: 'Design System Accessibility Review',
    description: 'Evaluation of the design system component library for built-in accessibility support.',
    url: 'https://design.acme-corp.com',
    ai_result: {
      summary: 'Design system components have inconsistent accessibility; 8 of 20 components fail basic requirements.',
      score: 60,
      report_type: 'design_system_review',
      total_components: 20,
      accessible_components: 12,
      findings: [
        { type: 'error', severity: 'major', title: '8 components fail', description: 'Modal, dropdown, tooltip, date picker, tabs, carousel, autocomplete, and tree view components lack accessibility.', recommendation: 'Rebuild failing components following WAI-ARIA authoring practices.' },
        { type: 'pass', severity: 'info', title: '12 components pass', description: 'Basic components (button, link, input, checkbox, radio, etc.) meet accessibility requirements.', recommendation: 'Maintain accessibility in future updates.' },
      ],
      recommendations: ['Rebuild 8 failing components', 'Add accessibility tests to component library', 'Document accessibility features and usage', 'Conduct regular component audits'],
      details: 'Fixing accessibility at the design system level has a multiplying effect across all products and pages that use these components.',
    },
  },
  {
    title: 'Third-Party Content Accessibility Audit',
    description: 'Assessment of third-party widgets, embeds, and integrations for accessibility compliance.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Remediation Progress Report - Sprint 14',
    description: 'Tracking remediation progress on previously identified accessibility issues from Sprint 14.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Executive Summary - Annual Accessibility Status',
    description: 'High-level executive summary of accessibility posture, risks, and recommended investments.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Organization has made progress but remains at significant legal risk due to 34 critical unresolved issues.',
      score: 50,
      report_type: 'executive_summary',
      findings: [
        { type: 'error', severity: 'critical', title: 'Legal risk remains high', description: '34 critical accessibility barriers create significant ADA lawsuit risk.', recommendation: 'Allocate dedicated budget and resources for accessibility remediation.' },
      ],
      recommendations: ['Allocate dedicated accessibility budget', 'Hire or contract accessibility specialists', 'Establish accessibility governance program', 'Set quarterly remediation targets'],
      details: 'This executive summary highlights the business case for accessibility investment including legal risk reduction, market expansion, and brand reputation.',
    },
  },
  {
    title: 'PDF Document Accessibility Report',
    description: 'Assessment of all PDF documents published on the website for accessibility compliance.',
    url: 'https://www.acme-corp.com/resources',
    ai_result: null,
  },
  {
    title: 'Color Contrast Compliance Report',
    description: 'Dedicated report on color contrast compliance across all site templates and components.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Keyboard Navigation Compliance Report',
    description: 'Focused report on keyboard navigation testing results and keyboard trap analysis.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Content Accessibility Gap Analysis',
    description: 'Analysis of content-related accessibility gaps including reading level, structure, and language.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Content accessibility is moderate; main issues are reading level and heading structure.',
      score: 65,
      report_type: 'content_analysis',
      findings: [
        { type: 'warning', severity: 'major', title: 'Reading level too high', description: 'Average Flesch-Kincaid grade level is 12.3, above the recommended 8th grade level.', recommendation: 'Simplify language and reduce sentence complexity for key user-facing content.' },
        { type: 'warning', severity: 'minor', title: 'Inconsistent heading structure', description: 'Heading levels are skipped on 30% of content pages.', recommendation: 'Enforce proper heading hierarchy in the content management system.' },
      ],
      recommendations: ['Simplify content to 8th grade reading level', 'Fix heading hierarchy', 'Add page summaries', 'Define accessibility content guidelines'],
      details: 'Content accessibility ensures that information is understandable by the widest possible audience, including people with cognitive disabilities and non-native speakers.',
    },
  },
];

const remediationPlansData = [
  {
    title: 'Critical Issues Remediation Sprint',
    description: 'Two-week sprint plan to address all 34 critical accessibility issues identified in the Q1 audit.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Sprint plan targets 34 critical issues across 5 categories with estimated 80 development hours.',
      score: 75,
      plan_type: 'sprint_plan',
      total_issues: 34,
      estimated_hours: 80,
      priority: 'critical',
      findings: [
        { type: 'info', severity: 'critical', title: 'Keyboard traps (8 issues)', description: '8 keyboard trap issues requiring component rebuilds.', recommendation: 'Assign to senior frontend developers; estimated 20 hours.' },
        { type: 'info', severity: 'critical', title: 'Missing form labels (12 issues)', description: '12 form fields across 4 pages need proper labeling.', recommendation: 'Batch fix with label audit; estimated 8 hours.' },
        { type: 'info', severity: 'critical', title: 'Alt text gaps (14 issues)', description: '14 informative images need descriptive alt text.', recommendation: 'Content team to write alt text; estimated 4 hours.' },
      ],
      recommendations: ['Allocate 80 development hours over 2 weeks', 'Assign dedicated accessibility sprint team', 'Conduct accessibility regression testing after fixes', 'Document fixes for knowledge sharing'],
      details: 'This sprint plan prioritizes critical issues that create complete barriers for users with disabilities. Addressing these 34 issues will significantly reduce legal risk and improve user experience.',
    },
  },
  {
    title: 'Image Accessibility Fixes Roadmap',
    description: 'Phased plan to remediate all image accessibility issues including alt text, decorative images, and complex graphics.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Three-phase roadmap to achieve full image accessibility: alt text, complex images, and CMS integration.',
      score: 80,
      plan_type: 'roadmap',
      phases: 3,
      total_duration: '6 weeks',
      findings: [
        { type: 'info', severity: 'major', title: 'Phase 1: Alt text audit (2 weeks)', description: 'Audit and fix alt text on all 450 images across the site.', recommendation: 'Assign content team to write alt text using provided guidelines.' },
        { type: 'info', severity: 'major', title: 'Phase 2: Complex images (2 weeks)', description: 'Create long descriptions for infographics, charts, and diagrams.', recommendation: 'Create HTML alternatives for complex images.' },
        { type: 'info', severity: 'minor', title: 'Phase 3: CMS integration (2 weeks)', description: 'Add alt text validation and guidelines to the CMS.', recommendation: 'Implement required alt text field in CMS image upload.' },
      ],
      recommendations: ['Start Phase 1 immediately', 'Provide alt text writing guidelines to content team', 'Add CMS alt text requirement', 'Establish ongoing image audit process'],
      details: 'Image accessibility is a common and impactful issue. This roadmap addresses the backlog and implements processes to prevent future image accessibility problems.',
    },
  },
  {
    title: 'Color Contrast Remediation Plan',
    description: 'Plan to update the design system color palette to meet WCAG 2.1 AA contrast requirements.',
    url: 'https://design.acme-corp.com',
    ai_result: {
      summary: 'Design system update plan to replace 12 non-compliant color combinations with AA-compliant alternatives.',
      score: 85,
      plan_type: 'design_system_update',
      findings: [
        { type: 'info', severity: 'major', title: 'Update 12 color tokens', description: 'Replace 12 color combination tokens that fail AA contrast.', recommendation: 'Work with design team to select compliant alternatives that maintain brand identity.' },
      ],
      recommendations: ['Update design system color tokens', 'Test new colors across all components', 'Update documentation with contrast requirements', 'Add contrast checking to design review process'],
      details: 'Fixing color contrast at the design system level ensures consistency across all products. The updated palette will maintain brand identity while meeting AA requirements.',
    },
  },
  {
    title: 'Navigation Rebuild Plan',
    description: 'Complete rebuild of the main navigation component for full keyboard and screen reader accessibility.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Navigation rebuild estimated at 40 hours, implementing WAI-ARIA disclosure or menubar pattern.',
      score: 70,
      plan_type: 'component_rebuild',
      estimated_hours: 40,
      findings: [
        { type: 'info', severity: 'critical', title: 'Full navigation rebuild required', description: 'Current navigation cannot be incrementally fixed; requires ground-up rebuild with accessibility.', recommendation: 'Implement WAI-ARIA disclosure navigation pattern with full keyboard support.' },
      ],
      recommendations: ['Use disclosure pattern for simpler implementation', 'Implement full keyboard interaction', 'Test with NVDA, JAWS, and VoiceOver', 'Include mobile responsive behavior'],
      details: 'The current navigation component has fundamental accessibility issues that cannot be patched. A rebuild using the WAI-ARIA disclosure pattern will provide the most reliable accessibility.',
    },
  },
  {
    title: 'Form Accessibility Improvement Plan',
    description: 'Systematic plan to improve form accessibility across all contact, registration, and checkout forms.',
    url: 'https://www.acme-corp.com/forms',
    ai_result: {
      summary: 'Plan addresses form labels, error handling, and field descriptions across 15 forms site-wide.',
      score: 78,
      plan_type: 'systematic_fix',
      forms_affected: 15,
      findings: [
        { type: 'info', severity: 'critical', title: 'Label all form fields', description: 'Add visible labels with proper for/id associations to all form fields.', recommendation: 'Priority 1: Complete within 1 week.' },
        { type: 'info', severity: 'major', title: 'Implement accessible error handling', description: 'Add aria-invalid, aria-describedby for errors, and error summary.', recommendation: 'Priority 2: Complete within 2 weeks.' },
      ],
      recommendations: ['Add labels to all fields', 'Implement accessible error handling', 'Add aria-describedby for help text', 'Use fieldset/legend for related field groups'],
      details: 'Form accessibility improvements will benefit all users, not just those with disabilities. Clear labels and helpful error messages improve completion rates for everyone.',
    },
  },
  {
    title: 'ARIA Implementation Roadmap',
    description: 'Phased implementation plan for ARIA roles, states, and properties across all custom components.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Four-phase ARIA implementation plan covering modals, tabs, accordions, and dynamic content.',
      score: 72,
      plan_type: 'roadmap',
      phases: 4,
      findings: [
        { type: 'info', severity: 'critical', title: 'Phase 1: Modal dialogs', description: 'Implement dialog role, focus management, and keyboard interaction.', recommendation: 'Estimated 16 hours. Highest priority due to frequency of use.' },
        { type: 'info', severity: 'major', title: 'Phase 2: Tab panels', description: 'Implement tab pattern with proper roles and keyboard support.', recommendation: 'Estimated 12 hours.' },
      ],
      recommendations: ['Follow WAI-ARIA authoring practices', 'Test each component with multiple screen readers', 'Document ARIA patterns for developers', 'Conduct training on ARIA best practices'],
      details: 'ARIA implementation requires careful attention to the authoring practices specifications. Incorrect ARIA can be worse than no ARIA.',
    },
  },
  {
    title: 'PDF Remediation Schedule',
    description: 'Timeline for remediating all PDF documents to meet accessibility standards.',
    url: 'https://www.acme-corp.com/documents',
    ai_result: {
      summary: 'Plan to remediate 45 PDF documents over 8 weeks, prioritized by document traffic and importance.',
      score: 68,
      plan_type: 'remediation_schedule',
      documents_to_fix: 45,
      duration: '8 weeks',
      findings: [
        { type: 'info', severity: 'major', title: 'High-traffic PDFs first', description: '12 high-traffic documents to be remediated in weeks 1-3.', recommendation: 'Start with the most-downloaded documents.' },
      ],
      recommendations: ['Remediate high-traffic PDFs first', 'Convert simple PDFs to HTML where possible', 'Use Adobe Acrobat Pro for remediation', 'Establish PDF accessibility guidelines for future documents'],
      details: 'PDF remediation is resource-intensive. Prioritizing by traffic ensures the greatest number of users benefit from early remediation efforts.',
    },
  },
  {
    title: 'Video Captioning Backlog Plan',
    description: 'Plan to caption all existing video content and establish captioning process for new videos.',
    url: 'https://media.acme-corp.com',
    ai_result: {
      summary: 'Plan to caption 80 uncaptioned videos over 10 weeks using a combination of AI and human review.',
      score: 65,
      plan_type: 'backlog_remediation',
      videos_to_caption: 80,
      findings: [
        { type: 'info', severity: 'critical', title: '80 videos need captions', description: 'Backlog of 80 uncaptioned videos, estimated at 40 hours of captioning work.', recommendation: 'Use AI auto-captioning with human review for accuracy.' },
      ],
      recommendations: ['Use AI captioning tool for initial drafts', 'Conduct human review for accuracy', 'Establish captioning workflow for new videos', 'Include caption review in video publication process'],
      details: 'Video captioning benefits not only deaf and hard-of-hearing users but also users in sound-sensitive environments and non-native speakers.',
    },
  },
  {
    title: 'Automated Testing Pipeline Implementation',
    description: 'Plan to integrate accessibility testing into the CI/CD pipeline for continuous compliance monitoring.',
    url: 'https://ci.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Accessibility Training Program Plan',
    description: 'Training program outline for developers, designers, and content creators on accessibility best practices.',
    url: 'https://learn.acme-corp.com/accessibility',
    ai_result: null,
  },
  {
    title: 'Third-Party Widget Replacement Plan',
    description: 'Plan to replace inaccessible third-party widgets with accessible alternatives.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Replacing 5 inaccessible third-party widgets with accessible alternatives over 4 weeks.',
      score: 70,
      plan_type: 'vendor_replacement',
      widgets_to_replace: 5,
      findings: [
        { type: 'info', severity: 'major', title: 'Chat widget replacement', description: 'Current chat widget is keyboard-inaccessible. Replacing with accessible alternative.', recommendation: 'Evaluate Intercom or Zendesk for accessibility compliance.' },
      ],
      recommendations: ['Evaluate accessibility before selecting vendors', 'Require VPAT from all widget vendors', 'Test replacement widgets with screen readers', 'Include accessibility in vendor contract requirements'],
      details: 'Third-party widgets can introduce accessibility issues outside the development team control. Vendor selection criteria should include accessibility requirements.',
    },
  },
  {
    title: 'Content Readability Improvement Plan',
    description: 'Plan to simplify site content from a 12th grade reading level to 8th grade.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Mobile Accessibility Optimization Plan',
    description: 'Plan to address mobile-specific accessibility issues including touch targets and zoom.',
    url: 'https://m.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Legacy System Accessibility Migration',
    description: 'Multi-phase plan to migrate legacy system interfaces to accessible modern components.',
    url: 'https://legacy.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Quarterly Remediation Review Process',
    description: 'Establishing a quarterly review process to track remediation progress and set new targets.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Process framework for quarterly accessibility reviews including metrics, reporting, and goal setting.',
      score: 82,
      plan_type: 'process_framework',
      findings: [
        { type: 'info', severity: 'info', title: 'Quarterly review framework', description: 'Establish regular cadence of accessibility audits, progress reviews, and goal setting.', recommendation: 'Assign accessibility champion to coordinate quarterly reviews.' },
      ],
      recommendations: ['Conduct quarterly accessibility audits', 'Track remediation progress with metrics', 'Set measurable quarterly goals', 'Report progress to executive leadership'],
      details: 'A structured quarterly review process ensures accessibility remains a priority and progress is measurable. This aligns remediation work with business planning cycles.',
    },
  },
];

const legalAssessmentsData = [
  {
    title: 'ADA Title III Compliance Review',
    description: 'Legal assessment of compliance with Americans with Disabilities Act Title III for places of public accommodation.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Site has significant ADA Title III compliance gaps that create substantial litigation risk.',
      score: 40,
      legal_framework: 'ADA Title III',
      risk_level: 'high',
      findings: [
        { type: 'error', severity: 'critical', title: 'High litigation risk', description: 'Multiple barriers prevent users with disabilities from accessing goods and services, creating exposure under ADA Title III.', recommendation: 'Engage accessibility counsel and begin remediation immediately to reduce risk.' },
        { type: 'warning', severity: 'major', title: 'No accessibility statement', description: 'Site lacks an accessibility statement or feedback mechanism.', recommendation: 'Publish an accessibility statement with contact information for accessibility concerns.' },
      ],
      recommendations: ['Begin immediate remediation of critical barriers', 'Publish accessibility statement', 'Establish accessibility feedback mechanism', 'Consult with ADA defense counsel'],
      details: 'ADA Title III applies to places of public accommodation, which courts have increasingly interpreted to include websites. The current state of the site creates significant litigation exposure.',
    },
  },
  {
    title: 'California AB 1757 Risk Assessment',
    description: 'Evaluating compliance with California Assembly Bill 1757 website accessibility requirements.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Site does not meet California AB 1757 requirements; potential state-level enforcement action.',
      score: 35,
      legal_framework: 'California AB 1757',
      risk_level: 'high',
      findings: [
        { type: 'error', severity: 'critical', title: 'Non-compliance with state law', description: 'California law requires WCAG 2.1 AA compliance for businesses serving California residents.', recommendation: 'Achieve WCAG 2.1 AA conformance to meet state requirements.' },
      ],
      recommendations: ['Achieve WCAG 2.1 AA compliance', 'Document compliance efforts', 'Monitor California regulatory updates', 'Consider California-specific accessibility requirements'],
      details: 'California AB 1757 creates specific website accessibility requirements. Non-compliance exposes the business to state regulatory action in addition to ADA claims.',
    },
  },
  {
    title: 'European Accessibility Act Readiness',
    description: 'Assessment of readiness for the European Accessibility Act (EAA) requirements taking effect in 2025.',
    url: 'https://eu.acme-corp.com',
    ai_result: {
      summary: 'EU-facing properties need significant work to meet European Accessibility Act requirements by 2025 deadline.',
      score: 45,
      legal_framework: 'European Accessibility Act',
      risk_level: 'high',
      findings: [
        { type: 'error', severity: 'critical', title: 'EAA compliance gap', description: 'EU-facing web properties do not meet EN 301 549 standards referenced by the EAA.', recommendation: 'Conduct EN 301 549 assessment and begin remediation before 2025 deadline.' },
        { type: 'warning', severity: 'major', title: 'No EU accessibility statement', description: 'EAA requires an accessibility statement for digital products.', recommendation: 'Draft and publish an accessibility statement following EN 301 549 requirements.' },
      ],
      recommendations: ['Conduct EN 301 549 assessment', 'Begin remediation before 2025 deadline', 'Publish EU accessibility statement', 'Monitor member state implementation'],
      details: 'The European Accessibility Act creates binding accessibility requirements for digital products and services sold in the EU. The 2025 deadline requires immediate action.',
    },
  },
  {
    title: 'AODA Compliance Check - Ontario',
    description: 'Evaluating compliance with the Accessibility for Ontarians with Disabilities Act for Canadian operations.',
    url: 'https://ca.acme-corp.com',
    ai_result: {
      summary: 'Canadian web properties partially meet AODA requirements; WCAG 2.0 Level AA compliance needed.',
      score: 55,
      legal_framework: 'AODA',
      risk_level: 'moderate',
      findings: [
        { type: 'error', severity: 'major', title: 'AODA non-compliance', description: 'Ontario operations require WCAG 2.0 Level AA compliance for all public-facing web content.', recommendation: 'Bring Canadian web content into WCAG 2.0 AA compliance.' },
      ],
      recommendations: ['Achieve WCAG 2.0 AA for Canadian content', 'File AODA compliance report', 'Train Canadian content creators', 'Monitor AODA enforcement actions'],
      details: 'AODA requires organizations with Ontario operations to maintain WCAG 2.0 Level AA accessible web content. Non-compliance can result in fines.',
    },
  },
  {
    title: 'Demand Letter Response Assessment',
    description: 'Risk analysis and response strategy for an accessibility demand letter received from plaintiff counsel.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Demand letter cites 12 specific accessibility barriers; recommends settlement negotiation with remediation commitment.',
      score: 30,
      legal_framework: 'ADA Title III',
      risk_level: 'critical',
      findings: [
        { type: 'error', severity: 'critical', title: 'Active legal threat', description: 'Demand letter from plaintiff counsel citing specific accessibility barriers and threatening litigation.', recommendation: 'Engage ADA defense counsel immediately. Begin documenting remediation efforts.' },
        { type: 'error', severity: 'critical', title: 'Cited barriers confirmed', description: 'Initial assessment confirms 10 of 12 cited barriers are valid accessibility failures.', recommendation: 'Begin fixing cited issues immediately to demonstrate good faith remediation.' },
      ],
      recommendations: ['Engage ADA defense counsel immediately', 'Begin fixing cited barriers', 'Document all remediation efforts', 'Prepare response strategy with counsel'],
      details: 'This demand letter represents an immediate legal threat. Prompt remediation and documented good faith efforts can significantly improve negotiating position.',
    },
  },
  {
    title: 'DOJ Settlement Agreement Compliance',
    description: 'Monitoring compliance with terms of a Department of Justice accessibility settlement agreement.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Currently meeting 8 of 12 settlement agreement requirements; 4 items at risk of non-compliance.',
      score: 67,
      legal_framework: 'DOJ Settlement',
      risk_level: 'moderate',
      findings: [
        { type: 'warning', severity: 'major', title: '4 settlement terms at risk', description: 'Video captioning, PDF accessibility, mobile optimization, and staff training are behind schedule.', recommendation: 'Accelerate remediation on behind-schedule items before next compliance review.' },
      ],
      recommendations: ['Accelerate behind-schedule items', 'Prepare compliance documentation', 'Schedule pre-review internal audit', 'Maintain detailed remediation records'],
      details: 'Settlement agreement compliance is mandatory. Non-compliance could result in contempt findings, additional penalties, and extended monitoring.',
    },
  },
  {
    title: 'Section 508 Procurement Compliance',
    description: 'Assessing Section 508 compliance for products sold to U.S. federal government agencies.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Product does not fully meet Section 508 requirements; may affect government sales eligibility.',
      score: 52,
      legal_framework: 'Section 508',
      risk_level: 'moderate',
      findings: [
        { type: 'error', severity: 'major', title: 'Section 508 gaps identified', description: 'Product fails 15 Section 508 standards that government procurement evaluators check.', recommendation: 'Remediate Section 508 failures to maintain government sales eligibility.' },
      ],
      recommendations: ['Complete VPAT documentation', 'Remediate Section 508 failures', 'Test with government procurement criteria', 'Maintain Section 508 compliance documentation'],
      details: 'Section 508 compliance is a procurement requirement for federal agencies. Products that do not meet Section 508 may be excluded from government purchasing.',
    },
  },
  {
    title: 'Class Action Lawsuit Risk Analysis',
    description: 'Comprehensive legal risk analysis for potential class action accessibility lawsuit exposure.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Organization fits the profile of frequent ADA website lawsuit targets; significant class action risk.',
      score: 25,
      legal_framework: 'ADA Title III',
      risk_level: 'critical',
      findings: [
        { type: 'error', severity: 'critical', title: 'High class action risk', description: 'E-commerce website with known accessibility barriers fits the profile targeted by serial ADA plaintiffs.', recommendation: 'Implement comprehensive accessibility program to reduce lawsuit risk.' },
      ],
      recommendations: ['Begin comprehensive accessibility remediation', 'Publish accessibility statement and feedback mechanism', 'Consider accessibility insurance', 'Engage proactive ADA counsel'],
      details: 'ADA website accessibility lawsuits exceeded 4,000 in 2023. E-commerce sites with known barriers are primary targets. Proactive remediation is the most effective defense.',
    },
  },
  {
    title: 'GDPR and Accessibility Intersection Review',
    description: 'Analyzing where GDPR privacy requirements intersect with accessibility for cookie consent and privacy tools.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'State Attorney General Enforcement Risk',
    description: 'Assessing risk of state attorney general enforcement action for website accessibility violations.',
    url: 'https://www.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Higher Education Accessibility Compliance',
    description: 'Legal compliance review for university website under Section 504 and ADA requirements.',
    url: 'https://www.stateuniversity.example.com',
    ai_result: {
      summary: 'University website has significant accessibility gaps that may trigger OCR investigation.',
      score: 42,
      legal_framework: 'Section 504 / ADA',
      risk_level: 'high',
      findings: [
        { type: 'error', severity: 'critical', title: 'OCR investigation risk', description: 'Course materials, registration, and student services have accessibility barriers that could trigger an OCR complaint.', recommendation: 'Prioritize student-facing services for immediate remediation.' },
      ],
      recommendations: ['Remediate student-facing services first', 'Audit course materials for accessibility', 'Establish faculty training on accessible content', 'Create accessibility governance committee'],
      details: 'Higher education institutions face heightened scrutiny from the Department of Education Office for Civil Rights (OCR) regarding digital accessibility.',
    },
  },
  {
    title: 'Financial Services Accessibility Regulations',
    description: 'Review of accessibility requirements specific to financial services and banking regulations.',
    url: 'https://www.securefinance.example.com',
    ai_result: null,
  },
  {
    title: 'Healthcare HIPAA and Accessibility Review',
    description: 'Joint review of HIPAA compliance and accessibility requirements for healthcare portal.',
    url: 'https://portal.healthfirst.example.com',
    ai_result: null,
  },
  {
    title: 'Accessibility Statement Legal Review',
    description: 'Legal review of the draft accessibility statement for accuracy and liability considerations.',
    url: 'https://www.acme-corp.com/accessibility',
    ai_result: null,
  },
  {
    title: 'International Accessibility Law Comparison',
    description: 'Comparative analysis of accessibility legal requirements across operating jurisdictions.',
    url: 'https://global.acme-corp.com',
    ai_result: {
      summary: 'Organization operates in 8 jurisdictions with varying accessibility requirements; consolidated compliance strategy needed.',
      score: 50,
      legal_framework: 'Multiple jurisdictions',
      risk_level: 'moderate',
      findings: [
        { type: 'warning', severity: 'major', title: 'Varying requirements across jurisdictions', description: 'Each jurisdiction has different accessibility requirements, deadlines, and enforcement mechanisms.', recommendation: 'Adopt WCAG 2.1 AA as a baseline standard that satisfies most jurisdictional requirements.' },
      ],
      recommendations: ['Adopt WCAG 2.1 AA as global baseline', 'Monitor jurisdiction-specific requirements', 'Maintain compliance documentation per jurisdiction', 'Engage local counsel in key markets'],
      details: 'A harmonized approach targeting WCAG 2.1 AA will satisfy most jurisdictional requirements. However, some jurisdictions have additional specific requirements that need individual attention.',
    },
  },
];

const pdfChecksData = [
  {
    title: 'Annual Report PDF Accessibility',
    description: 'Checking the annual shareholder report PDF for proper tagging, reading order, and text alternatives.',
    url: 'https://www.acme-corp.com/documents/annual-report-2024.pdf',
    ai_result: {
      summary: 'Annual report PDF has no tags, no reading order, and images lack alt text.',
      score: 15,
      pdf_properties: { tagged: false, reading_order: false, language_set: false, bookmarks: false, pages: 48 },
      findings: [
        { type: 'error', severity: 'critical', title: 'PDF not tagged', description: 'The 48-page annual report has no PDF tags, making it completely inaccessible to screen readers.', recommendation: 'Add PDF tags using Adobe Acrobat Pro to establish document structure, headings, and reading order.' },
        { type: 'error', severity: 'critical', title: 'No reading order', description: 'Without tags, the reading order is determined by the raw content stream, which may not match visual layout.', recommendation: 'Set proper reading order after tagging the document.' },
        { type: 'error', severity: 'major', title: 'Charts lack alt text', description: '12 charts and graphs in the report have no text alternatives.', recommendation: 'Add alt text or long descriptions to all charts and graphs describing the data they convey.' },
      ],
      recommendations: ['Tag the entire document', 'Set reading order', 'Add alt text to all images and charts', 'Set document language', 'Add bookmarks for navigation'],
      details: 'The annual report is a high-visibility document that must be accessible. In its current state, screen reader users cannot read any of the content.',
    },
  },
  {
    title: 'Employee Handbook PDF Check',
    description: 'Accessibility assessment of the employee handbook distributed to all new hires.',
    url: 'https://hr.acme-corp.com/documents/employee-handbook.pdf',
    ai_result: {
      summary: 'Employee handbook has partial tagging but reading order and table structure need significant work.',
      score: 40,
      pdf_properties: { tagged: true, reading_order: false, language_set: true, bookmarks: true, pages: 72 },
      findings: [
        { type: 'warning', severity: 'major', title: 'Reading order incorrect', description: 'Multi-column layouts read across columns instead of down, scrambling content.', recommendation: 'Fix reading order in Adobe Acrobat Pro Order panel for all multi-column pages.' },
        { type: 'error', severity: 'major', title: 'Tables not tagged properly', description: 'Benefits comparison tables lack proper table header tags.', recommendation: 'Add TH tags with scope attributes to all data tables.' },
      ],
      recommendations: ['Fix reading order for multi-column pages', 'Add proper table structure tags', 'Verify heading hierarchy', 'Test with JAWS PDF reader'],
      details: 'The handbook has a foundation of tags but the multi-column layout and complex tables need manual remediation for proper accessibility.',
    },
  },
  {
    title: 'Tax Form PDF Accessibility',
    description: 'Checking fillable tax form PDF for form field labels and instructions.',
    url: 'https://www.acme-corp.com/forms/tax-form-w9.pdf',
    ai_result: {
      summary: 'Fillable PDF form fields lack labels and tab order is incorrect.',
      score: 30,
      pdf_properties: { tagged: true, reading_order: true, language_set: true, bookmarks: false, pages: 4, has_form_fields: true, form_fields_count: 22 },
      findings: [
        { type: 'error', severity: 'critical', title: 'Form fields unlabeled', description: '22 form fields have no tooltip labels; screen readers announce them as unnamed fields.', recommendation: 'Add tooltip text to every form field matching its visual label.' },
        { type: 'error', severity: 'major', title: 'Tab order incorrect', description: 'Tabbing through the form jumps between sections instead of following visual order.', recommendation: 'Set the tab order to match the visual reading order of the form.' },
      ],
      recommendations: ['Add tooltips to all form fields', 'Fix tab order', 'Add form field descriptions for complex fields', 'Test form completion with screen reader'],
      details: 'Fillable PDF forms must have labeled fields and correct tab order for screen reader users to complete them independently.',
    },
  },
  {
    title: 'Product Brochure PDF Check',
    description: 'Accessibility review of the marketing product brochure with complex layouts and graphics.',
    url: 'https://www.acme-corp.com/documents/product-brochure.pdf',
    ai_result: {
      summary: 'Marketing brochure with complex visual layout is largely inaccessible; needs extensive remediation.',
      score: 20,
      pdf_properties: { tagged: false, reading_order: false, language_set: false, bookmarks: false, pages: 12 },
      findings: [
        { type: 'error', severity: 'critical', title: 'Untagged marketing PDF', description: 'Complex visual layout with overlapping text and images has no tags.', recommendation: 'Tag the document and mark decorative elements as artifacts.' },
        { type: 'error', severity: 'critical', title: 'Text in images', description: 'Key marketing messages are embedded in images as text.', recommendation: 'Extract text from images and provide as tagged text content or alt text.' },
      ],
      recommendations: ['Tag the entire document', 'Extract text from images', 'Mark decorative elements as artifacts', 'Set reading order for complex layout'],
      details: 'Marketing materials with complex visual designs are among the most challenging PDFs to remediate. Consider providing an accessible HTML alternative.',
    },
  },
  {
    title: 'Legal Contract Template PDF',
    description: 'Checking the standard legal contract template for document structure and accessibility.',
    url: 'https://legal.acme-corp.com/templates/standard-contract.pdf',
    ai_result: {
      summary: 'Legal contract has basic tagging but heading structure and list formatting need improvement.',
      score: 55,
      pdf_properties: { tagged: true, reading_order: true, language_set: true, bookmarks: false, pages: 18 },
      findings: [
        { type: 'warning', severity: 'major', title: 'Heading structure incomplete', description: 'Contract sections and subsections are not tagged with proper heading levels.', recommendation: 'Tag section headings (H1-H4) to match the document outline.' },
        { type: 'warning', severity: 'minor', title: 'Numbered lists not tagged as lists', description: 'Contract terms numbered 1-50 are tagged as paragraphs, not list items.', recommendation: 'Tag numbered items as proper list structures (L, LI, Lbl, LBody).' },
      ],
      recommendations: ['Add heading tags for all sections', 'Convert numbered items to list tags', 'Add bookmarks for navigation', 'Verify reading order of footnotes'],
      details: 'Legal documents require precise structure for screen reader navigation. Proper headings and lists help users navigate lengthy contracts efficiently.',
    },
  },
  {
    title: 'Training Manual PDF Accessibility',
    description: 'Assessing the training manual PDF with step-by-step instructions and screenshots.',
    url: 'https://training.acme-corp.com/manuals/user-guide.pdf',
    ai_result: {
      summary: 'Training manual needs alt text for 35 screenshots and improved heading structure.',
      score: 45,
      pdf_properties: { tagged: true, reading_order: true, language_set: true, bookmarks: true, pages: 86 },
      findings: [
        { type: 'error', severity: 'major', title: '35 screenshots missing alt text', description: 'Step-by-step screenshots throughout the manual lack descriptive alt text.', recommendation: 'Add alt text describing each screenshot, focusing on the step being illustrated.' },
        { type: 'warning', severity: 'minor', title: 'Heading levels inconsistent', description: 'Some chapters skip heading levels or use inconsistent numbering.', recommendation: 'Standardize heading hierarchy across all chapters.' },
      ],
      recommendations: ['Add alt text to all screenshots', 'Standardize heading hierarchy', 'Add cross-reference links between sections', 'Consider HTML version for interactive steps'],
      details: 'Training manuals rely heavily on screenshots to illustrate steps. Each screenshot needs alt text that describes the action being demonstrated.',
    },
  },
  {
    title: 'Invoice Template PDF Check',
    description: 'Checking the standard invoice PDF template for table structure and form accessibility.',
    url: 'https://billing.acme-corp.com/templates/invoice.pdf',
    ai_result: {
      summary: 'Invoice template has properly tagged tables but the form field labels are missing.',
      score: 60,
      pdf_properties: { tagged: true, reading_order: true, language_set: true, bookmarks: false, pages: 2, has_form_fields: true, form_fields_count: 8 },
      findings: [
        { type: 'pass', severity: 'info', title: 'Table structure correct', description: 'Line item table has proper TH and TD tags with correct scope.', recommendation: 'No changes needed for table structure.' },
        { type: 'error', severity: 'major', title: 'Form fields unlabeled', description: 'Payment and notes fields lack tooltip labels.', recommendation: 'Add tooltip labels to all form fields.' },
      ],
      recommendations: ['Add tooltips to form fields', 'Verify reading order for payment section', 'Test with screen reader'],
      details: 'The invoice template has good table accessibility but the form fields for payment processing need labels for screen reader users.',
    },
  },
  {
    title: 'Whitepaper PDF Accessibility Review',
    description: 'Reviewing a technical whitepaper PDF for document accessibility and data table formatting.',
    url: 'https://www.acme-corp.com/whitepapers/ai-accessibility.pdf',
    ai_result: {
      summary: 'Whitepaper is well-structured but data tables and footnotes need accessibility improvements.',
      score: 70,
      pdf_properties: { tagged: true, reading_order: true, language_set: true, bookmarks: true, pages: 24 },
      findings: [
        { type: 'warning', severity: 'minor', title: 'Complex table headers', description: 'Multi-level table headers need scope attributes for proper cell association.', recommendation: 'Add headers and id attributes for complex table header relationships.' },
        { type: 'warning', severity: 'minor', title: 'Footnotes reading order', description: 'Footnotes at page bottom may be read out of context.', recommendation: 'Consider using endnotes or ensuring footnotes are tagged as notes.' },
      ],
      recommendations: ['Fix complex table headers', 'Improve footnote tagging', 'Verify all figures have alt text'],
      details: 'This whitepaper has a good accessibility foundation. The remaining issues are refinements to complex tables and footnote handling.',
    },
  },
  {
    title: 'Newsletter PDF Accessibility',
    description: 'Checking the monthly company newsletter PDF for multi-column layout accessibility.',
    url: 'https://www.acme-corp.com/newsletters/march-2024.pdf',
    ai_result: null,
  },
  {
    title: 'Presentation Slides PDF Export',
    description: 'Assessing a PowerPoint-to-PDF export for preserved accessibility features.',
    url: 'https://www.acme-corp.com/presentations/quarterly-review.pdf',
    ai_result: null,
  },
  {
    title: 'Compliance Certificate PDF',
    description: 'Checking generated compliance certificate PDF for basic accessibility requirements.',
    url: 'https://compliance.acme-corp.com/certificates/cert-2024-001.pdf',
    ai_result: null,
  },
  {
    title: 'Data Sheet PDF Accessibility',
    description: 'Reviewing product data sheet PDF with technical specifications tables.',
    url: 'https://www.acme-corp.com/datasheets/x-series-specs.pdf',
    ai_result: null,
  },
  {
    title: 'Application Form PDF Check',
    description: 'Checking a multi-page application form PDF for form field accessibility and instructions.',
    url: 'https://www.acme-corp.com/forms/membership-application.pdf',
    ai_result: null,
  },
  {
    title: 'Research Report PDF Review',
    description: 'Accessibility review of a research report PDF with complex charts and citations.',
    url: 'https://research.acme-corp.com/reports/market-analysis-2024.pdf',
    ai_result: {
      summary: 'Research report has good basic structure but charts and citation links need remediation.',
      score: 58,
      pdf_properties: { tagged: true, reading_order: true, language_set: true, bookmarks: true, pages: 36 },
      findings: [
        { type: 'error', severity: 'major', title: 'Charts inaccessible', description: '8 research charts lack text descriptions of the data they represent.', recommendation: 'Add detailed alt text or adjacent text summaries for all charts.' },
        { type: 'warning', severity: 'minor', title: 'Citation links not tagged', description: 'In-text citations are not linked to the reference list.', recommendation: 'Tag citations as links pointing to the corresponding reference entry.' },
      ],
      recommendations: ['Add alt text for all charts', 'Link citations to references', 'Verify statistical table accessibility', 'Test with screen reader'],
      details: 'Research reports with data visualizations need careful attention to ensure the data conveyed in charts is available in text form.',
    },
  },
  {
    title: 'Event Program PDF Accessibility',
    description: 'Checking the conference event program PDF for schedule table and speaker information accessibility.',
    url: 'https://events.acme-corp.com/conference-2024/program.pdf',
    ai_result: {
      summary: 'Event program has schedule tables that need proper headers and speaker photos need alt text.',
      score: 48,
      pdf_properties: { tagged: true, reading_order: false, language_set: true, bookmarks: false, pages: 16 },
      findings: [
        { type: 'error', severity: 'major', title: 'Schedule tables lack headers', description: 'Session schedule tables do not have properly tagged header rows.', recommendation: 'Tag the first row of each schedule table as TH cells with scope="col".' },
        { type: 'error', severity: 'major', title: 'Speaker photos need alt text', description: '24 speaker headshots have no alt text.', recommendation: 'Add speaker name as alt text for each headshot photo.' },
      ],
      recommendations: ['Add table headers to schedule tables', 'Add alt text to speaker photos', 'Fix reading order for multi-column layout', 'Add bookmarks for each event day'],
      details: 'Conference program PDFs serve as essential reference documents. Accessible schedule tables and speaker identification are critical for attendees using screen readers.',
    },
  },
];

const formAnalysesData = [
  {
    title: 'Contact Form Accessibility Analysis',
    description: 'Complete accessibility analysis of the main website contact form including labels, errors, and keyboard flow.',
    url: 'https://www.acme-corp.com/contact',
    ai_result: {
      summary: 'Contact form has multiple accessibility issues: missing labels, poor error handling, and no fieldset grouping.',
      score: 42,
      form_fields_count: 8,
      fields_with_labels: 3,
      fields_with_errors: 0,
      findings: [
        { type: 'error', severity: 'critical', title: '5 fields lack labels', description: 'Name, email, phone, subject, and message fields use placeholder text instead of labels.', recommendation: 'Add visible <label> elements with for attributes matching each input id.' },
        { type: 'error', severity: 'major', title: 'No error messaging', description: 'Form validation errors only trigger a page-level alert() with no field-specific feedback.', recommendation: 'Display inline error messages below each field using aria-describedby and aria-invalid.' },
        { type: 'warning', severity: 'minor', title: 'No fieldset grouping', description: 'Related fields (name + email + phone) are not grouped.', recommendation: 'Wrap related fields in <fieldset> with <legend> elements.' },
      ],
      recommendations: ['Add visible labels to all fields', 'Implement inline error messaging', 'Group related fields with fieldset/legend', 'Add aria-required to mandatory fields'],
      details: 'The contact form relies entirely on placeholder text for field identification, which disappears when users begin typing and is not reliably announced by all screen readers.',
    },
  },
  {
    title: 'Registration Form Field Labels',
    description: 'Auditing the user registration form for proper field labels and password requirements.',
    url: 'https://www.acme-corp.com/register',
    ai_result: {
      summary: 'Registration form has labels but password requirements and confirm password matching lack accessible feedback.',
      score: 58,
      form_fields_count: 6,
      fields_with_labels: 6,
      findings: [
        { type: 'pass', severity: 'info', title: 'All fields have labels', description: 'Every form field has an associated visible label element.', recommendation: 'No changes needed for labels.' },
        { type: 'error', severity: 'major', title: 'Password requirements hidden', description: 'Password complexity requirements only appear after a failed submission.', recommendation: 'Display password requirements before the field using aria-describedby.' },
        { type: 'error', severity: 'major', title: 'Password match not announced', description: 'Password confirmation mismatch is shown visually but not announced.', recommendation: 'Use aria-live region or aria-describedby to announce match status.' },
      ],
      recommendations: ['Show password requirements proactively', 'Announce password match status', 'Add "show password" toggle', 'Mark required fields with aria-required'],
      details: 'While the registration form has proper labels, the password creation experience has accessibility gaps that make it difficult for screen reader users.',
    },
  },
  {
    title: 'Checkout Form Multi-Step Analysis',
    description: 'Analyzing the multi-step checkout form for step indicators, navigation, and error recovery.',
    url: 'https://shop.acme-corp.com/checkout',
    ai_result: {
      summary: 'Multi-step checkout form lacks step indicators, back navigation, and has inaccessible payment fields.',
      score: 35,
      form_fields_count: 18,
      fields_with_labels: 10,
      findings: [
        { type: 'error', severity: 'critical', title: 'Step indicator inaccessible', description: 'The checkout progress indicator (step 1/2/3) is purely visual with no ARIA markup.', recommendation: 'Add aria-label to step indicators and use aria-current="step" for the active step.' },
        { type: 'error', severity: 'critical', title: 'Payment fields unlabeled', description: 'Credit card number, expiry, and CVV fields lack labels.', recommendation: 'Add visible labels to all payment form fields.' },
        { type: 'error', severity: 'major', title: 'Cannot navigate back', description: 'No accessible back button exists to return to previous checkout steps.', recommendation: 'Add a clearly labeled back button at each step.' },
      ],
      recommendations: ['Make step indicators accessible', 'Label all payment fields', 'Add back navigation between steps', 'Preserve user input when navigating between steps'],
      details: 'The checkout form is a critical conversion point. Accessibility barriers at checkout directly impact revenue from users with disabilities.',
    },
  },
  {
    title: 'Search Form with Autocomplete',
    description: 'Analyzing the site search form and autocomplete dropdown for accessibility compliance.',
    url: 'https://www.acme-corp.com/search',
    ai_result: {
      summary: 'Search form input is accessible but autocomplete suggestions are not perceivable to screen readers.',
      score: 45,
      form_fields_count: 2,
      fields_with_labels: 1,
      findings: [
        { type: 'pass', severity: 'info', title: 'Search input labeled', description: 'Search input has an associated label "Search the site".', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'critical', title: 'Autocomplete inaccessible', description: 'Suggestion dropdown is not announced by screen readers and cannot be navigated with keyboard.', recommendation: 'Implement WAI-ARIA combobox pattern with role="combobox", aria-expanded, and role="listbox" for suggestions.' },
      ],
      recommendations: ['Implement ARIA combobox pattern', 'Announce number of suggestions', 'Enable arrow key navigation in suggestions', 'Announce selected suggestion'],
      details: 'Search autocomplete is a complex interaction pattern that requires the ARIA combobox pattern for screen reader accessibility.',
    },
  },
  {
    title: 'Newsletter Signup Form Analysis',
    description: 'Quick analysis of the footer newsletter email signup form.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Newsletter signup form has no visible label and the submit button text is ambiguous.',
      score: 50,
      form_fields_count: 2,
      fields_with_labels: 0,
      findings: [
        { type: 'error', severity: 'major', title: 'Email field has no label', description: 'Email input uses placeholder "Enter your email" with no label element.', recommendation: 'Add a visible label or at minimum an aria-label="Email address for newsletter".' },
        { type: 'warning', severity: 'minor', title: 'Submit button text ambiguous', description: 'Submit button says "Go" which does not describe the action.', recommendation: 'Change button text to "Subscribe" or "Sign Up for Newsletter".' },
      ],
      recommendations: ['Add label to email field', 'Improve submit button text', 'Add aria-describedby for privacy policy link'],
      details: 'Even simple forms need proper labeling. The newsletter signup is a single-field form but still requires a clear label and descriptive submit button.',
    },
  },
  {
    title: 'Profile Settings Form Analysis',
    description: 'Analyzing the user profile settings form with file upload, toggles, and conditional fields.',
    url: 'https://app.acme-corp.com/settings/profile',
    ai_result: {
      summary: 'Profile form has labeled fields but avatar upload, toggle switches, and conditional fields lack accessibility.',
      score: 52,
      form_fields_count: 12,
      fields_with_labels: 8,
      findings: [
        { type: 'error', severity: 'major', title: 'Avatar upload inaccessible', description: 'Profile photo upload uses drag-and-drop only with no keyboard alternative.', recommendation: 'Add a file input button alternative to the drag-and-drop area.' },
        { type: 'error', severity: 'major', title: 'Toggle switches unlabeled', description: 'Notification preference toggles lack accessible names.', recommendation: 'Add aria-label to each toggle switch describing what it controls.' },
        { type: 'warning', severity: 'minor', title: 'Conditional fields confusing', description: 'Fields that appear based on other selections are not announced.', recommendation: 'Use aria-live to announce when conditional fields appear.' },
      ],
      recommendations: ['Add keyboard-accessible file upload', 'Label all toggle switches', 'Announce conditional field appearance', 'Group notification preferences with fieldset'],
      details: 'Profile settings forms often use custom UI components (toggles, drag-drop uploads) that need extra accessibility work beyond standard form fields.',
    },
  },
  {
    title: 'Survey Form Accessibility Review',
    description: 'Reviewing a multi-page customer satisfaction survey form for accessibility.',
    url: 'https://feedback.acme-corp.com/survey/csat-2024',
    ai_result: {
      summary: 'Survey form has radio button groups without fieldset/legend and rating scales without accessible labels.',
      score: 40,
      form_fields_count: 25,
      fields_with_labels: 15,
      findings: [
        { type: 'error', severity: 'major', title: 'Radio groups ungrouped', description: 'Likert scale radio button groups are not wrapped in fieldset/legend elements.', recommendation: 'Wrap each question radio group in <fieldset> with <legend> containing the question text.' },
        { type: 'error', severity: 'major', title: 'Star rating inaccessible', description: 'Star rating widget is mouse-only and has no accessible name.', recommendation: 'Use radio buttons styled as stars, or add keyboard interaction and ARIA labels.' },
      ],
      recommendations: ['Add fieldset/legend to radio groups', 'Make star rating accessible', 'Add progress indicator', 'Save progress between pages'],
      details: 'Surveys collect important feedback and must be accessible to get representative responses from all users including those with disabilities.',
    },
  },
  {
    title: 'Login Form Error Handling',
    description: 'Analyzing login form error messaging and recovery flow for accessibility.',
    url: 'https://www.acme-corp.com/login',
    ai_result: {
      summary: 'Login form has labels but error messages are visual-only and lack screen reader support.',
      score: 55,
      form_fields_count: 3,
      fields_with_labels: 3,
      findings: [
        { type: 'pass', severity: 'info', title: 'Fields properly labeled', description: 'Username and password fields have associated visible labels.', recommendation: 'No changes needed.' },
        { type: 'error', severity: 'critical', title: 'Login error not announced', description: 'Invalid credentials error appears visually but is not announced by screen readers.', recommendation: 'Use role="alert" on the error message container for automatic announcement.' },
      ],
      recommendations: ['Add role="alert" to error messages', 'Move focus to error on failed login', 'Add aria-invalid to errored fields', 'Ensure "forgot password" link is accessible'],
      details: 'Login forms are critical access points. Error messages must be perceivable by all users to allow recovery from failed login attempts.',
    },
  },
  {
    title: 'Date Picker Component Analysis',
    description: 'Analyzing the custom date picker form component for keyboard and screen reader accessibility.',
    url: 'https://app.acme-corp.com/booking',
    ai_result: null,
  },
  {
    title: 'Address Autocomplete Form Analysis',
    description: 'Evaluating the address form with Google Places autocomplete integration for accessibility.',
    url: 'https://shop.acme-corp.com/checkout/shipping',
    ai_result: null,
  },
  {
    title: 'File Upload Form Accessibility',
    description: 'Assessing the document upload form with multiple file selection and progress indicators.',
    url: 'https://app.acme-corp.com/upload',
    ai_result: null,
  },
  {
    title: 'Inline Edit Form Pattern',
    description: 'Reviewing inline editing form patterns where clicking text converts to editable fields.',
    url: 'https://app.acme-corp.com/projects',
    ai_result: null,
  },
  {
    title: 'Filter Panel Form Analysis',
    description: 'Analyzing the product filter panel with checkboxes, ranges, and dynamic result updates.',
    url: 'https://shop.acme-corp.com/products',
    ai_result: null,
  },
  {
    title: 'Appointment Scheduling Form',
    description: 'Accessibility analysis of the appointment booking form with time slot selection.',
    url: 'https://booking.acme-corp.com/schedule',
    ai_result: {
      summary: 'Appointment form has visual time slot grid that is inaccessible to keyboard and screen reader users.',
      score: 38,
      form_fields_count: 10,
      fields_with_labels: 6,
      findings: [
        { type: 'error', severity: 'critical', title: 'Time slot grid inaccessible', description: 'Time slots are presented as a clickable visual grid with no keyboard interaction.', recommendation: 'Use radio buttons for time slot selection or implement accessible grid pattern.' },
        { type: 'error', severity: 'major', title: 'Available slots not indicated', description: 'Available vs unavailable time slots are distinguished by color only.', recommendation: 'Add text labels or aria-disabled for unavailable slots.' },
      ],
      recommendations: ['Use radio buttons for time slots', 'Indicate availability in text', 'Add date selection keyboard support', 'Announce selected appointment summary'],
      details: 'Appointment scheduling forms often use visual grids and calendars that exclude keyboard and screen reader users from independently booking appointments.',
    },
  },
  {
    title: 'Two-Factor Authentication Form',
    description: 'Analyzing the 2FA code entry form with individual digit input boxes.',
    url: 'https://secure.acme-corp.com/verify',
    ai_result: {
      summary: '2FA code entry uses individual digit boxes that confuse screen readers and break paste functionality.',
      score: 45,
      form_fields_count: 7,
      fields_with_labels: 1,
      findings: [
        { type: 'error', severity: 'critical', title: 'Digit boxes confuse screen readers', description: 'Six individual input boxes for verification code digits are announced as separate unlabeled fields.', recommendation: 'Use a single input field with inputmode="numeric" and maxlength="6" instead of individual boxes.' },
        { type: 'error', severity: 'major', title: 'Cannot paste code', description: 'Individual digit boxes prevent pasting the full verification code.', recommendation: 'Switch to a single input that allows pasting the complete code.' },
      ],
      recommendations: ['Replace digit boxes with single input', 'Allow pasting of full code', 'Add clear instructions', 'Auto-submit after code entry'],
      details: 'The trendy individual digit box pattern for 2FA creates significant accessibility barriers. A single input field is more accessible and user-friendly.',
    },
  },
];

const videoCaptionsData = [
  {
    title: 'Product Demo Video Captions',
    description: 'Generating captions for the main product demonstration video on the homepage.',
    url: 'https://www.acme-corp.com/videos/product-demo.mp4',
    ai_result: {
      summary: 'AI-generated captions for 8-minute product demo video; 96% accuracy after review.',
      score: 85,
      video_duration: '8:24',
      caption_format: 'WebVTT',
      word_count: 1245,
      accuracy_score: 96,
      findings: [
        { type: 'pass', severity: 'info', title: 'Captions generated successfully', description: 'AI-generated captions cover all spoken content with 96% accuracy.', recommendation: 'Review and correct technical terminology before publishing.' },
        { type: 'warning', severity: 'minor', title: 'Technical terms need review', description: '12 instances of technical product names may be incorrectly transcribed.', recommendation: 'Manually verify product names and technical terminology.' },
      ],
      recommendations: ['Review technical terminology', 'Add speaker identification', 'Include non-speech audio descriptions', 'Verify timing synchronization'],
      details: 'The product demo video has been captioned with high accuracy. A manual review pass for technical terminology is recommended before publishing.',
    },
  },
  {
    title: 'CEO Annual Message Transcript',
    description: 'Full transcript and captions for the CEO annual company update video message.',
    url: 'https://www.acme-corp.com/videos/ceo-annual-message-2024.mp4',
    ai_result: {
      summary: 'Complete transcript and captions generated for CEO message; includes speaker identification.',
      score: 92,
      video_duration: '15:30',
      caption_format: 'WebVTT',
      word_count: 2380,
      accuracy_score: 98,
      findings: [
        { type: 'pass', severity: 'info', title: 'High accuracy captions', description: 'Captions achieved 98% accuracy with clear audio source.', recommendation: 'Minor punctuation review recommended.' },
      ],
      recommendations: ['Review punctuation and formatting', 'Provide downloadable transcript', 'Add chapter markers for long video'],
      details: 'The CEO message video is a single-speaker recording with clear audio, resulting in high captioning accuracy.',
    },
  },
  {
    title: 'Customer Testimonial Video Series',
    description: 'Captioning five customer testimonial videos for the case studies page.',
    url: 'https://www.acme-corp.com/testimonials',
    ai_result: {
      summary: 'Captions generated for 5 testimonial videos; varying audio quality affects accuracy on 2 videos.',
      score: 72,
      videos_count: 5,
      findings: [
        { type: 'pass', severity: 'info', title: '3 videos captioned accurately', description: 'Three testimonial videos with good audio have 95%+ caption accuracy.', recommendation: 'Minor review and publish.' },
        { type: 'warning', severity: 'major', title: '2 videos need manual captioning', description: 'Two testimonial videos have background noise causing significant transcription errors.', recommendation: 'Manually caption or re-record these videos in a quiet environment.' },
      ],
      recommendations: ['Review all captions for accuracy', 'Manually fix low-quality audio transcriptions', 'Consider re-recording noisy videos', 'Add speaker names to captions'],
      details: 'Audio quality directly impacts AI captioning accuracy. Videos recorded in noisy environments may need manual captioning or re-recording.',
    },
  },
  {
    title: 'Training Course Video Captions - Module 1',
    description: 'Captioning the first module of the online training course with technical content.',
    url: 'https://learn.acme-corp.com/courses/module-1/video.mp4',
    ai_result: {
      summary: 'Training module captions generated with 94% accuracy; technical terms and code examples need manual review.',
      score: 80,
      video_duration: '22:15',
      caption_format: 'WebVTT',
      word_count: 3420,
      accuracy_score: 94,
      findings: [
        { type: 'warning', severity: 'major', title: 'Code examples in captions', description: 'Code examples spoken aloud are difficult to caption meaningfully.', recommendation: 'Provide code examples in an accessible text format below the video, not just in captions.' },
        { type: 'warning', severity: 'minor', title: 'Technical vocabulary corrections needed', description: '8 technical terms were mis-transcribed by the AI.', recommendation: 'Review and correct technical terminology in the caption file.' },
      ],
      recommendations: ['Correct technical terminology', 'Provide code examples in text format', 'Add visual description cues for on-screen demonstrations', 'Include downloadable transcript'],
      details: 'Training content with technical terminology and code examples presents unique captioning challenges. Supplementary text materials improve accessibility.',
    },
  },
  {
    title: 'Webinar Recording Captions',
    description: 'Adding captions to a recorded webinar with multiple speakers and Q&A session.',
    url: 'https://events.acme-corp.com/webinars/2024-03/recording.mp4',
    ai_result: {
      summary: 'Webinar captions need speaker identification and Q&A section has lower accuracy due to audio quality.',
      score: 65,
      video_duration: '58:00',
      caption_format: 'WebVTT',
      word_count: 8900,
      accuracy_score: 88,
      findings: [
        { type: 'warning', severity: 'major', title: 'Speaker identification needed', description: 'Multiple speakers are not identified in captions, making it unclear who is speaking.', recommendation: 'Add speaker labels (e.g., ">> Sarah: ", ">> John: ") to identify each speaker.' },
        { type: 'warning', severity: 'major', title: 'Q&A audio quality poor', description: 'Audience questions captured via room microphone are poorly transcribed.', recommendation: 'Have moderator repeat each question before answering for future webinars.' },
      ],
      recommendations: ['Add speaker identification labels', 'Fix Q&A section transcription', 'Consider providing edited transcript', 'Add chapter markers for topics'],
      details: 'Multi-speaker webinars require speaker identification in captions. Future webinars should use individual microphones and have moderators repeat audience questions.',
    },
  },
  {
    title: 'Social Media Short Video Captions',
    description: 'Generating captions for 10 social media promotional videos under 60 seconds each.',
    url: 'https://social.acme-corp.com/videos',
    ai_result: {
      summary: 'Captions generated for 10 short videos; burned-in captions recommended for social media platforms.',
      score: 88,
      videos_count: 10,
      findings: [
        { type: 'pass', severity: 'info', title: 'All videos captioned', description: 'All 10 short videos have accurate captions generated.', recommendation: 'Burn captions into video for social media platforms that do not support caption files.' },
        { type: 'warning', severity: 'minor', title: 'Background music noted', description: 'Background music is not described in captions.', recommendation: 'Add [upbeat music] or similar descriptions for non-speech audio.' },
      ],
      recommendations: ['Burn captions into social media videos', 'Add non-speech audio descriptions', 'Use high-contrast caption styling', 'Test caption readability on mobile'],
      details: 'Social media videos benefit from burned-in (open) captions since many platforms auto-mute videos. This also helps viewers in sound-off environments.',
    },
  },
  {
    title: 'Product Tutorial Playlist Captions',
    description: 'Captioning a series of 8 product tutorial videos covering key features.',
    url: 'https://www.acme-corp.com/tutorials',
    ai_result: {
      summary: 'Tutorial playlist captioned with consistent formatting; 95% average accuracy across 8 videos.',
      score: 82,
      videos_count: 8,
      findings: [
        { type: 'pass', severity: 'info', title: 'Consistent captioning quality', description: 'All 8 tutorials have 93-97% caption accuracy with consistent formatting.', recommendation: 'Review and publish with minor corrections.' },
        { type: 'warning', severity: 'minor', title: 'UI element names vary', description: 'Button and menu names are sometimes captioned differently than they appear on screen.', recommendation: 'Standardize UI element names to match on-screen labels.' },
      ],
      recommendations: ['Standardize UI element naming', 'Add visual indicator descriptions', 'Create downloadable transcripts', 'Verify caption timing with visual cues'],
      details: 'Tutorial videos should have captions that match on-screen labels exactly to avoid confusion for users who are both watching and reading captions.',
    },
  },
  {
    title: 'Accessibility Workshop Recording Captions',
    description: 'Captioning a recorded accessibility workshop with live demonstrations and audience interaction.',
    url: 'https://training.acme-corp.com/workshops/a11y-workshop.mp4',
    ai_result: {
      summary: 'Workshop captions need significant editing for live demo descriptions and audience interaction.',
      score: 58,
      video_duration: '120:00',
      caption_format: 'WebVTT',
      word_count: 18500,
      accuracy_score: 82,
      findings: [
        { type: 'warning', severity: 'major', title: 'Live demo descriptions missing', description: 'Screen demonstrations are visual-only with no audio description of what is being shown.', recommendation: 'Add extended audio descriptions or descriptive captions for visual demonstrations.' },
        { type: 'warning', severity: 'major', title: 'Long video needs chapters', description: '2-hour recording needs navigation points for different topics.', recommendation: 'Add chapter markers and provide a table of contents with timestamps.' },
      ],
      recommendations: ['Add visual demonstration descriptions', 'Create chapter markers', 'Fix audience interaction transcription', 'Provide downloadable transcript with screenshots'],
      details: 'Long workshop recordings with live demonstrations need additional accessibility features beyond captions, including chapter navigation and visual descriptions.',
    },
  },
  {
    title: 'Podcast Episode Transcript',
    description: 'Generating a full transcript for a podcast episode published on the website.',
    url: 'https://www.acme-corp.com/podcast/episode-42',
    ai_result: null,
  },
  {
    title: 'Conference Keynote Video Captions',
    description: 'Captioning the annual conference keynote presentation with slides and speaker.',
    url: 'https://events.acme-corp.com/conference-2024/keynote.mp4',
    ai_result: null,
  },
  {
    title: 'HR Onboarding Video Captions',
    description: 'Adding captions to the new employee onboarding video series.',
    url: 'https://hr.acme-corp.com/onboarding/welcome-video.mp4',
    ai_result: null,
  },
  {
    title: 'Investor Presentation Video',
    description: 'Captioning the quarterly investor presentation video with financial data references.',
    url: 'https://investors.acme-corp.com/presentations/q1-2024.mp4',
    ai_result: null,
  },
  {
    title: 'Multi-Language Caption Translation',
    description: 'Generating translated captions in Spanish, French, and German from English source.',
    url: 'https://www.acme-corp.com/videos/product-overview.mp4',
    ai_result: null,
  },
  {
    title: 'Live Event Caption Review',
    description: 'Reviewing and correcting auto-generated live captions from a streamed event.',
    url: 'https://live.acme-corp.com/events/product-launch',
    ai_result: {
      summary: 'Live captions had 78% accuracy; post-event cleanup and re-publishing recommended.',
      score: 55,
      video_duration: '45:00',
      caption_format: 'WebVTT',
      accuracy_score: 78,
      findings: [
        { type: 'warning', severity: 'major', title: 'Live caption accuracy low', description: 'Real-time captioning achieved only 78% accuracy, below the 99% standard for pre-recorded content.', recommendation: 'Edit and re-publish corrected captions on the archived recording.' },
        { type: 'info', severity: 'info', title: 'Live captioning acceptable', description: 'For live events, 78% is within acceptable range but post-event cleanup is expected.', recommendation: 'Establish workflow for post-event caption review and correction.' },
      ],
      recommendations: ['Clean up and republish corrected captions', 'Establish post-event caption review workflow', 'Consider professional CART services for future live events'],
      details: 'Live captioning inherently has lower accuracy than pre-recorded content. Post-event cleanup ensures the archived recording meets the higher accuracy standard.',
    },
  },
  {
    title: 'Audio Description Track Generation',
    description: 'Creating audio description narration for key video content where visual information is not spoken.',
    url: 'https://www.acme-corp.com/videos/company-overview.mp4',
    ai_result: {
      summary: 'Audio description script generated for company overview video; covers 12 visual-only segments.',
      score: 75,
      video_duration: '5:00',
      visual_segments: 12,
      findings: [
        { type: 'info', severity: 'info', title: 'Audio description drafted', description: 'Script covers all segments where visual information is not conveyed in the audio track.', recommendation: 'Record audio description narration and integrate as a separate audio track.' },
        { type: 'warning', severity: 'minor', title: 'Limited gaps for description', description: 'Fast-paced video has limited natural pauses for inserting descriptions.', recommendation: 'Consider extended audio description that pauses the video for longer descriptions.' },
      ],
      recommendations: ['Record audio description track', 'Consider extended audio description for dense scenes', 'Provide text description as an alternative', 'Test with screen reader users'],
      details: 'Audio descriptions narrate visual information that is not conveyed through dialogue or narration. This is essential for blind users to understand video content.',
    },
  },
];

const readabilityAnalysesData = [
  {
    title: 'Terms of Service Readability Score',
    description: 'Analyzing the readability of the Terms of Service page for plain language compliance.',
    url: 'https://www.acme-corp.com/terms',
    ai_result: {
      summary: 'Terms of Service written at 15.8 grade level; significantly above the recommended 8th grade level.',
      score: 25,
      readability_metrics: { flesch_kincaid_grade: 15.8, flesch_reading_ease: 22, gunning_fog: 17.2, smog_index: 16.1, average_sentence_length: 32, average_syllables_per_word: 2.1 },
      findings: [
        { type: 'error', severity: 'major', title: 'Reading level too high', description: 'Content is written at a college level (15.8 grade), making it inaccessible to many users.', recommendation: 'Rewrite in plain language targeting an 8th grade reading level. Break long sentences, use common words.' },
        { type: 'warning', severity: 'minor', title: 'Excessive legal jargon', description: '45 instances of legal terminology without plain-language explanations.', recommendation: 'Add parenthetical explanations for legal terms or a glossary.' },
      ],
      recommendations: ['Rewrite in plain language', 'Reduce average sentence length to under 20 words', 'Replace jargon with common words', 'Add a plain-language summary at the top'],
      details: 'Legal documents like Terms of Service are notoriously difficult to read. Plain language versions make the content accessible to users with cognitive disabilities and non-native speakers.',
    },
  },
  {
    title: 'Product Description Reading Level',
    description: 'Evaluating readability of product descriptions across the e-commerce catalog.',
    url: 'https://shop.acme-corp.com/products',
    ai_result: {
      summary: 'Product descriptions average 10.2 grade level; some technical specifications are above 14th grade.',
      score: 60,
      readability_metrics: { flesch_kincaid_grade: 10.2, flesch_reading_ease: 52, gunning_fog: 11.8, average_sentence_length: 22, average_syllables_per_word: 1.8 },
      findings: [
        { type: 'warning', severity: 'major', title: 'Above target reading level', description: 'Average reading level of 10.2 is above the recommended 8th grade target.', recommendation: 'Simplify product descriptions, use shorter sentences and more common words.' },
        { type: 'error', severity: 'major', title: 'Technical specs inaccessible', description: 'Technical specification sections reach 14th grade reading level.', recommendation: 'Add plain-language explanations alongside technical specifications.' },
      ],
      recommendations: ['Simplify product descriptions', 'Add plain-language tech spec summaries', 'Use bullet points for key features', 'Define technical terms on first use'],
      details: 'Product descriptions should be accessible to a broad audience. Technical specifications can remain detailed but should be accompanied by plain-language summaries.',
    },
  },
  {
    title: 'FAQ Page Readability Assessment',
    description: 'Checking the FAQ page content for clear, concise answers at an accessible reading level.',
    url: 'https://www.acme-corp.com/faq',
    ai_result: {
      summary: 'FAQ answers are mostly well-written at 7.5 grade level; a few complex answers need simplification.',
      score: 82,
      readability_metrics: { flesch_kincaid_grade: 7.5, flesch_reading_ease: 68, gunning_fog: 9.2, average_sentence_length: 16, average_syllables_per_word: 1.5 },
      findings: [
        { type: 'pass', severity: 'info', title: 'Good overall readability', description: 'FAQ content averages 7.5 grade level, within the recommended range.', recommendation: 'Maintain current writing standards.' },
        { type: 'warning', severity: 'minor', title: '3 complex answers identified', description: 'Three FAQ answers exceed 10th grade level and could be simplified.', recommendation: 'Rewrite the flagged answers using shorter sentences and simpler vocabulary.' },
      ],
      recommendations: ['Simplify 3 flagged answers', 'Maintain current writing guidelines', 'Add a search function to the FAQ', 'Group questions by category'],
      details: 'The FAQ page demonstrates good content accessibility practices. Most answers are clear and concise with appropriate reading levels.',
    },
  },
  {
    title: 'Blog Content Readability Audit',
    description: 'Auditing blog post readability across the last 50 published articles.',
    url: 'https://www.acme-corp.com/blog',
    ai_result: {
      summary: 'Blog posts range from 6th to 14th grade level; average is 9.8, slightly above target.',
      score: 65,
      readability_metrics: { flesch_kincaid_grade: 9.8, flesch_reading_ease: 55, gunning_fog: 11.5, average_sentence_length: 20, average_syllables_per_word: 1.7 },
      articles_analyzed: 50,
      findings: [
        { type: 'warning', severity: 'minor', title: 'Readability inconsistent', description: 'Grade levels range from 6 to 14 across 50 articles, showing inconsistent writing standards.', recommendation: 'Establish content guidelines with target reading level and provide editor training.' },
        { type: 'warning', severity: 'major', title: 'Technical posts too complex', description: 'Technical blog posts average 12.5 grade level without simplified introductions.', recommendation: 'Add plain-language summaries to technical posts.' },
      ],
      recommendations: ['Create content style guide with readability targets', 'Add TL;DR summaries to technical posts', 'Use readability checker in editorial workflow', 'Train content creators on plain language'],
      details: 'Blog content readability varies significantly by author and topic. Establishing clear guidelines and integrating readability checking into the editorial workflow will improve consistency.',
    },
  },
  {
    title: 'Error Message Clarity Analysis',
    description: 'Analyzing all user-facing error messages for clarity, helpfulness, and reading level.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'Error messages are often technical or vague; 60% need rewriting for clarity.',
      score: 40,
      error_messages_analyzed: 35,
      findings: [
        { type: 'error', severity: 'major', title: 'Technical error messages', description: '12 error messages contain HTTP status codes or technical identifiers that users cannot interpret.', recommendation: 'Replace technical errors with user-friendly messages explaining what happened and how to fix it.' },
        { type: 'error', severity: 'major', title: 'Vague error messages', description: '9 messages say only "An error occurred" with no helpful context.', recommendation: 'Provide specific error descriptions and actionable next steps.' },
      ],
      recommendations: ['Rewrite all error messages in plain language', 'Include actionable next steps', 'Remove technical jargon from user-facing messages', 'Test error messages with users'],
      details: 'Clear error messages are critical for all users but especially those with cognitive disabilities who may struggle with vague or technical language.',
    },
  },
  {
    title: 'Navigation and Label Clarity',
    description: 'Evaluating the clarity and consistency of navigation labels, button text, and headings.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Navigation labels are mostly clear but 8 labels are ambiguous or inconsistent across pages.',
      score: 70,
      findings: [
        { type: 'warning', severity: 'minor', title: 'Inconsistent labeling', description: 'Same feature is labeled "Dashboard" on one page and "Overview" on another.', recommendation: 'Audit and standardize labels across all pages.' },
        { type: 'warning', severity: 'minor', title: 'Ambiguous button text', description: '3 buttons use "Submit" without context about what is being submitted.', recommendation: 'Make button text specific (e.g., "Send Message", "Create Account", "Place Order").' },
      ],
      recommendations: ['Standardize navigation labels', 'Make button text action-specific', 'Ensure headings describe page content', 'Create a labeling style guide'],
      details: 'Consistent and descriptive labels help all users orient themselves and understand available actions. This is especially important for users with cognitive disabilities.',
    },
  },
  {
    title: 'Privacy Policy Plain Language Review',
    description: 'Evaluating the privacy policy for plain language and readability compliance.',
    url: 'https://www.acme-corp.com/privacy',
    ai_result: {
      summary: 'Privacy policy is written at 14.2 grade level; needs plain language rewrite.',
      score: 30,
      readability_metrics: { flesch_kincaid_grade: 14.2, flesch_reading_ease: 28, gunning_fog: 16.5, average_sentence_length: 29, average_syllables_per_word: 2.0 },
      findings: [
        { type: 'error', severity: 'major', title: 'Extremely high reading level', description: 'Privacy policy requires college-level reading ability.', recommendation: 'Rewrite using plain language principles: short sentences, common words, active voice.' },
      ],
      recommendations: ['Rewrite in plain language', 'Use layered notices (summary + detail)', 'Add a privacy policy summary', 'Use headings and bullet points'],
      details: 'Privacy policies affect all users and should be understandable by the broadest possible audience. A layered approach with a plain-language summary is recommended.',
    },
  },
  {
    title: 'Onboarding Flow Instruction Clarity',
    description: 'Analyzing the clarity of instructions in the new user onboarding flow.',
    url: 'https://app.acme-corp.com/onboarding',
    ai_result: {
      summary: 'Onboarding instructions are generally clear but some steps assume prior technical knowledge.',
      score: 72,
      findings: [
        { type: 'pass', severity: 'info', title: 'Step structure is clear', description: 'Onboarding uses numbered steps with clear headings.', recommendation: 'Maintain current step structure.' },
        { type: 'warning', severity: 'minor', title: 'Technical assumptions', description: 'Steps 3 and 5 use technical terms without explanation.', recommendation: 'Add brief explanations or tooltips for technical concepts.' },
      ],
      recommendations: ['Add explanations for technical terms', 'Include visual examples alongside instructions', 'Add a "need help?" link at each step', 'Test with non-technical users'],
      details: 'Good onboarding instructions assume minimal prior knowledge and provide clear, actionable steps. Adding visual examples would further improve accessibility.',
    },
  },
  {
    title: 'Accessibility Statement Readability',
    description: 'Ensuring the accessibility statement itself is written at an accessible reading level.',
    url: 'https://www.acme-corp.com/accessibility',
    ai_result: null,
  },
  {
    title: 'Email Notification Content Clarity',
    description: 'Reviewing automated email notification templates for readability and clarity.',
    url: 'https://email.acme-corp.com/templates',
    ai_result: null,
  },
  {
    title: 'Help Documentation Reading Level',
    description: 'Assessing the help center documentation for reading level and structural clarity.',
    url: 'https://help.acme-corp.com',
    ai_result: null,
  },
  {
    title: 'Form Instruction Text Analysis',
    description: 'Reviewing all form instruction text and helper text for clarity and completeness.',
    url: 'https://www.acme-corp.com/forms',
    ai_result: null,
  },
  {
    title: 'Alert and Notification Message Clarity',
    description: 'Analyzing system alert and notification messages for plain language and actionability.',
    url: 'https://app.acme-corp.com/notifications',
    ai_result: null,
  },
  {
    title: 'Multilingual Content Readability Comparison',
    description: 'Comparing readability scores across English, Spanish, and French versions of key pages.',
    url: 'https://www.acme-corp.com',
    ai_result: {
      summary: 'Translated content has higher reading levels than English originals; translations are too literal.',
      score: 50,
      findings: [
        { type: 'warning', severity: 'major', title: 'Translations increase complexity', description: 'Spanish and French translations have 2-3 grade levels higher readability scores than English originals.', recommendation: 'Use professional translators who prioritize plain language, not literal translation.' },
      ],
      recommendations: ['Hire plain-language translators', 'Set readability targets per language', 'Review translations for natural phrasing', 'Conduct user testing with native speakers'],
      details: 'Literal translations often produce awkward, complex sentences. Professional translators who write for the target audience produce more accessible multilingual content.',
    },
  },
  {
    title: 'Mobile Content Scannability Analysis',
    description: 'Evaluating how well site content can be scanned and understood on mobile devices.',
    url: 'https://m.acme-corp.com',
    ai_result: {
      summary: 'Mobile content is not optimized for scanning; paragraphs are too long and headings are sparse.',
      score: 55,
      findings: [
        { type: 'warning', severity: 'major', title: 'Long paragraphs on mobile', description: 'Paragraphs averaging 150 words create walls of text on mobile screens.', recommendation: 'Break paragraphs to under 60 words for mobile. Use bullet points and subheadings.' },
        { type: 'warning', severity: 'minor', title: 'Sparse headings', description: 'Content sections lack subheadings for scanning.', recommendation: 'Add subheadings every 2-3 short paragraphs for easier scanning.' },
      ],
      recommendations: ['Shorten paragraphs for mobile', 'Add more subheadings', 'Use bullet points for lists', 'Front-load important information'],
      details: 'Mobile reading behavior involves more scanning than desktop. Short paragraphs, frequent headings, and bullet points improve comprehension on small screens.',
    },
  },
];

const accessibilityPoliciesData = [
  {
    title: 'Corporate Accessibility Statement Draft',
    description: 'Drafting a comprehensive accessibility statement for the corporate website footer.',
    url: 'https://www.acme-corp.com/accessibility',
    ai_result: {
      summary: 'Generated comprehensive accessibility statement following W3C model template.',
      score: 85,
      policy_type: 'accessibility_statement',
      findings: [
        { type: 'pass', severity: 'info', title: 'Statement generated', description: 'Accessibility statement covers commitment, standards, known issues, and contact information.', recommendation: 'Review with legal team before publishing. Update known issues section as remediation progresses.' },
        { type: 'warning', severity: 'minor', title: 'Known issues need updating', description: 'The known issues section should be updated as items are remediated.', recommendation: 'Establish quarterly review process for the accessibility statement.' },
      ],
      recommendations: ['Review with legal team', 'Publish on the website', 'Include contact information for feedback', 'Update quarterly as issues are fixed'],
      details: 'The accessibility statement communicates the organization commitment to accessibility and provides a feedback mechanism for users encountering barriers.',
    },
  },
  {
    title: 'VPAT 2.4 Documentation',
    description: 'Preparing Voluntary Product Accessibility Template version 2.4 for enterprise clients.',
    url: 'https://app.acme-corp.com',
    ai_result: {
      summary: 'VPAT 2.4 document prepared covering WCAG 2.1, Section 508, and EN 301 549 standards.',
      score: 75,
      policy_type: 'vpat',
      standards_covered: ['WCAG 2.1 Level AA', 'Revised Section 508', 'EN 301 549'],
      findings: [
        { type: 'info', severity: 'info', title: 'VPAT documentation complete', description: 'All three standard editions documented with conformance levels for each criterion.', recommendation: 'Have accessibility specialist review conformance claims for accuracy.' },
        { type: 'warning', severity: 'major', title: 'Partially Supports claims need detail', description: '15 criteria marked "Partially Supports" need specific explanation of what works and what does not.', recommendation: 'Add detailed remarks for all Partially Supports and Does Not Support criteria.' },
      ],
      recommendations: ['Review all conformance claims', 'Add detailed remarks for partial support', 'Have third-party verify claims', 'Update VPAT with each major release'],
      details: 'VPATs are used by enterprise procurement teams to evaluate product accessibility. Accurate, detailed conformance claims are essential for sales success.',
    },
  },
  {
    title: 'Accessibility Conformance Testing Methodology',
    description: 'Documenting the standardized methodology for conducting accessibility conformance testing.',
    url: 'https://docs.acme-corp.com/a11y-testing',
    ai_result: {
      summary: 'Testing methodology document covers tools, processes, and reporting standards for accessibility testing.',
      score: 80,
      policy_type: 'testing_methodology',
      findings: [
        { type: 'pass', severity: 'info', title: 'Comprehensive methodology', description: 'Document covers automated testing, manual testing, assistive technology testing, and user testing.', recommendation: 'Train all QA team members on the methodology.' },
      ],
      recommendations: ['Train QA team on methodology', 'Include methodology in onboarding', 'Review and update annually', 'Align with ACT Rules format'],
      details: 'A documented testing methodology ensures consistent, reproducible accessibility evaluations across teams and time periods.',
    },
  },
  {
    title: 'Developer Accessibility Guidelines',
    description: 'Creating coding standards and guidelines for developers to build accessible components.',
    url: 'https://docs.acme-corp.com/dev-guidelines',
    ai_result: {
      summary: 'Developer guidelines document covering semantic HTML, ARIA, keyboard, and testing requirements.',
      score: 78,
      policy_type: 'developer_guidelines',
      findings: [
        { type: 'pass', severity: 'info', title: 'Guidelines drafted', description: 'Document covers semantic HTML, ARIA usage, keyboard interaction, color contrast, and testing expectations.', recommendation: 'Integrate guidelines into code review checklist.' },
        { type: 'warning', severity: 'minor', title: 'Needs code examples', description: 'Guidelines would benefit from concrete code examples for each pattern.', recommendation: 'Add before/after code examples for common accessibility patterns.' },
      ],
      recommendations: ['Add code examples for each guideline', 'Integrate into code review process', 'Create accessibility linting rules', 'Provide hands-on training workshops'],
      details: 'Developer guidelines shift accessibility left in the development process. Including these in code reviews ensures accessibility is considered during implementation, not just testing.',
    },
  },
  {
    title: 'Content Creator Accessibility Handbook',
    description: 'Guidelines for content creators on writing accessible content, alt text, and document structure.',
    url: 'https://docs.acme-corp.com/content-a11y',
    ai_result: {
      summary: 'Content creator handbook covering alt text writing, heading structure, plain language, and link text.',
      score: 82,
      policy_type: 'content_guidelines',
      findings: [
        { type: 'pass', severity: 'info', title: 'Comprehensive content guidelines', description: 'Handbook covers all major content accessibility topics with practical examples.', recommendation: 'Distribute to all content creators and include in onboarding.' },
      ],
      recommendations: ['Distribute to all content teams', 'Include in new hire onboarding', 'Conduct quarterly refresher training', 'Integrate alt text requirements into CMS'],
      details: 'Content creators play a crucial role in accessibility. Good alt text, heading structure, and plain language are content responsibilities that no amount of code can fix.',
    },
  },
  {
    title: 'Procurement Accessibility Requirements',
    description: 'Defining accessibility requirements for vendor and third-party procurement processes.',
    url: 'https://procurement.acme-corp.com/a11y-requirements',
    ai_result: {
      summary: 'Procurement policy requiring VPAT, conformance level, and remediation timeline from all vendors.',
      score: 72,
      policy_type: 'procurement_policy',
      findings: [
        { type: 'info', severity: 'info', title: 'Procurement requirements defined', description: 'Policy requires vendors to provide VPAT, demonstrate WCAG 2.1 AA conformance, and commit to remediation timelines.', recommendation: 'Add procurement requirements to all RFP templates.' },
        { type: 'warning', severity: 'minor', title: 'Enforcement mechanism needed', description: 'Policy needs clear consequences for vendors who do not meet accessibility requirements.', recommendation: 'Add contract clauses for accessibility non-compliance.' },
      ],
      recommendations: ['Add to RFP templates', 'Include in vendor contracts', 'Verify vendor claims independently', 'Establish vendor accessibility review process'],
      details: 'Procurement policies ensure that third-party products meet accessibility requirements. Without these, inaccessible vendor products create liability for the organization.',
    },
  },
  {
    title: 'Accessibility Governance Framework',
    description: 'Establishing organizational governance structure for accessibility program management.',
    url: 'https://governance.acme-corp.com/accessibility',
    ai_result: {
      summary: 'Governance framework establishing roles, responsibilities, and accountability for organizational accessibility.',
      score: 70,
      policy_type: 'governance_framework',
      findings: [
        { type: 'info', severity: 'info', title: 'Framework established', description: 'Framework defines executive sponsor, accessibility lead, team champions, and reporting structure.', recommendation: 'Secure executive sponsor approval and communicate to all departments.' },
        { type: 'warning', severity: 'major', title: 'Budget allocation needed', description: 'Framework lacks defined budget allocation for accessibility activities.', recommendation: 'Work with finance to establish dedicated accessibility budget.' },
      ],
      recommendations: ['Secure executive sponsorship', 'Allocate dedicated budget', 'Appoint team accessibility champions', 'Establish regular reporting cadence'],
      details: 'An accessibility governance framework ensures sustained organizational commitment. Without clear ownership and accountability, accessibility efforts tend to lose momentum.',
    },
  },
  {
    title: 'Accessibility Training Curriculum',
    description: 'Defining the accessibility training program for all roles including designers, developers, and PMs.',
    url: 'https://training.acme-corp.com/a11y-curriculum',
    ai_result: {
      summary: 'Training curriculum with role-specific tracks for designers, developers, QA, content creators, and managers.',
      score: 76,
      policy_type: 'training_curriculum',
      findings: [
        { type: 'pass', severity: 'info', title: 'Role-specific training tracks', description: 'Curriculum includes specialized content for each role in the product development lifecycle.', recommendation: 'Schedule quarterly training sessions and track completion.' },
      ],
      recommendations: ['Schedule quarterly training sessions', 'Track completion rates by team', 'Include accessibility in new hire onboarding', 'Offer advanced certification path'],
      details: 'Effective accessibility training is role-specific. Designers, developers, and content creators each have different accessibility responsibilities and need targeted training.',
    },
  },
  {
    title: 'Accessibility Bug Triage Policy',
    description: 'Defining how accessibility bugs are prioritized, assigned, and tracked in the development workflow.',
    url: 'https://jira.acme-corp.com/a11y-triage',
    ai_result: {
      summary: 'Triage policy mapping accessibility issue severity to bug priority and SLA for resolution.',
      score: 80,
      policy_type: 'bug_triage',
      findings: [
        { type: 'pass', severity: 'info', title: 'Clear triage criteria', description: 'Policy maps WCAG conformance level and barrier severity to priority levels P1-P4.', recommendation: 'Integrate triage policy into bug tracking workflow.' },
        { type: 'warning', severity: 'minor', title: 'SLAs need enforcement', description: 'Resolution SLAs are defined but no escalation process exists for overdue items.', recommendation: 'Add escalation process for accessibility bugs exceeding SLA.' },
      ],
      recommendations: ['Integrate into bug tracking workflow', 'Add escalation for overdue items', 'Track SLA compliance metrics', 'Report accessibility bug trends monthly'],
      details: 'A clear triage policy ensures accessibility bugs receive appropriate priority alongside other bugs. Without it, accessibility issues are often deprioritized.',
    },
  },
  {
    title: 'Accessible Design System Standards',
    description: 'Defining accessibility standards that all design system components must meet.',
    url: 'https://design.acme-corp.com/a11y-standards',
    ai_result: null,
  },
  {
    title: 'Accessibility Release Gate Policy',
    description: 'Establishing accessibility as a release gate requirement in the deployment pipeline.',
    url: 'https://ci.acme-corp.com/a11y-gate',
    ai_result: null,
  },
  {
    title: 'Disability Inclusion Statement',
    description: 'Corporate statement on disability inclusion covering digital, physical, and employment accessibility.',
    url: 'https://www.acme-corp.com/inclusion',
    ai_result: null,
  },
  {
    title: 'User Feedback and Complaint Process',
    description: 'Defining the process for receiving, tracking, and responding to accessibility feedback and complaints.',
    url: 'https://www.acme-corp.com/accessibility/feedback',
    ai_result: {
      summary: 'Feedback process defined with intake form, response SLAs, and escalation procedures.',
      score: 78,
      policy_type: 'feedback_process',
      findings: [
        { type: 'pass', severity: 'info', title: 'Feedback process documented', description: 'Process covers intake, triage, response, and resolution with defined SLAs.', recommendation: 'Ensure the feedback form itself is fully accessible.' },
        { type: 'warning', severity: 'minor', title: 'Response SLA should be shorter', description: 'Current 10-business-day response SLA may frustrate users with urgent access needs.', recommendation: 'Consider a 2-business-day initial acknowledgment with 10-day resolution target.' },
      ],
      recommendations: ['Implement the feedback process', 'Reduce initial response time', 'Make feedback form accessible', 'Track and report on feedback trends'],
      details: 'An accessible feedback mechanism is both a legal requirement and a valuable source of real-world accessibility testing. User reports identify issues that automated testing misses.',
    },
  },
  {
    title: 'Annual Accessibility Review Policy',
    description: 'Policy requiring annual comprehensive accessibility reviews with third-party auditors.',
    url: 'https://governance.acme-corp.com/annual-review',
    ai_result: null,
  },
  {
    title: 'Accessibility Monitoring and Reporting Policy',
    description: 'Policy for continuous accessibility monitoring, dashboards, and executive reporting.',
    url: 'https://monitoring.acme-corp.com/a11y',
    ai_result: null,
  },
];

// ---------------------------------------------------------------------------
// SEED FUNCTION
// ---------------------------------------------------------------------------

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting database seed...\n');

    // Truncate all tables
    console.log('Truncating existing data...');
    await client.query(`
      TRUNCATE TABLE users,
        website_scans, wcag_checks, alt_texts, color_contrasts,
        screen_reader_optimizations, keyboard_audits, aria_labels,
        accessibility_reports, remediation_plans, legal_assessments,
        pdf_checks, form_analyses, video_captions,
        readability_analyses, accessibility_policies
      RESTART IDENTITY CASCADE;
    `);
    console.log('All tables truncated.\n');

    // Seed demo user
    console.log('Creating demo user...');
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    await client.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
      ['admin@ada-remediator.com', hashedPassword, 'ADA Admin']
    );
    console.log('Demo user created: admin@ada-remediator.com\n');

    // Seed all feature tables
    const tables = [
      { name: 'website_scans', data: websiteScansData },
      { name: 'wcag_checks', data: wcagChecksData },
      { name: 'alt_texts', data: altTextsData },
      { name: 'color_contrasts', data: colorContrastsData },
      { name: 'screen_reader_optimizations', data: screenReaderOptimizationsData },
      { name: 'keyboard_audits', data: keyboardAuditsData },
      { name: 'aria_labels', data: ariaLabelsData },
      { name: 'accessibility_reports', data: accessibilityReportsData },
      { name: 'remediation_plans', data: remediationPlansData },
      { name: 'legal_assessments', data: legalAssessmentsData },
      { name: 'pdf_checks', data: pdfChecksData },
      { name: 'form_analyses', data: formAnalysesData },
      { name: 'video_captions', data: videoCaptionsData },
      { name: 'readability_analyses', data: readabilityAnalysesData },
      { name: 'accessibility_policies', data: accessibilityPoliciesData },
    ];

    for (const table of tables) {
      console.log(`Seeding ${table.name} (${table.data.length} items)...`);
      for (const item of table.data) {
        const status = item.status || randomStatus();
        const createdAt = randomDate();
        const updatedAt = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO ${table.name} (title, description, url, status, ai_result, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            item.title,
            item.description,
            item.url,
            status,
            item.ai_result ? JSON.stringify(item.ai_result) : null,
            createdAt,
            updatedAt,
          ]
        );
      }
      console.log(`  -> ${table.name} seeded successfully.`);
    }

    console.log('\n========================================');
    console.log('Database seeded successfully!');
    console.log('========================================');
    console.log(`Demo user: admin@ada-remediator.com / Admin123!`);
    console.log(`Tables seeded: ${tables.length}`);
    console.log(`Total records: ${tables.reduce((sum, t) => sum + t.data.length, 0) + 1}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\nSeed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
