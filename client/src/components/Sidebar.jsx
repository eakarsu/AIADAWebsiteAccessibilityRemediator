import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiShield, FiGrid, FiLogOut, FiSearch, FiCheckCircle,
  FiImage, FiSliders, FiMonitor, FiNavigation, FiTag,
  FiFileText, FiClipboard, FiAlertTriangle, FiFile,
  FiList, FiVideo, FiBookOpen, FiLock, FiCpu, FiMenu, FiX,
  FiClock, FiShare2, FiGitBranch, FiUsers, FiUser, FiBook
} from 'react-icons/fi';

const advancedItems = [
  { slug: 'batch-jobs', title: 'Batch Analysis Jobs', icon: FiClock, path: '/advanced/batch-jobs' },
  { slug: 'comparisons', title: 'Comparison Reports', icon: FiCheckCircle, path: '/advanced/comparisons' },
  { slug: 'remediation-code', title: 'Auto-Remediation Code', icon: FiCpu, path: '/advanced/remediation-code' },
  { slug: 'legal-risk', title: 'Legal Risk Dashboard', icon: FiAlertTriangle, path: '/advanced/legal-risk' },
  { slug: 'invitations', title: 'Auditor Invitations', icon: FiShare2, path: '/advanced/invitations' },
  { slug: 'ci-webhook', title: 'CI/CD Webhook', icon: FiGitBranch, path: '/advanced/ci-webhook' },
  { slug: 'skills', title: 'Skill Matrix', icon: FiUsers, path: '/advanced/skills' },
  { slug: 'portfolio', title: 'Portfolio Scorecard', icon: FiGrid, path: '/advanced/portfolio' },
  { slug: 'wcag-kb', title: 'WCAG Knowledge Base', icon: FiBook, path: '/advanced/wcag-kb' },
  { slug: 'validate-fix', title: 'Validate Remediation Fix', icon: FiCheckCircle, path: '/advanced/validate-fix' },
  { slug: 'bulk-remediate', title: 'Bulk Remediation', icon: FiCpu, path: '/advanced/bulk-remediate' },
  { slug: 'ab-test-fix', title: 'A/B Test Fixes', icon: FiGitBranch, path: '/advanced/ab-test-fix' },
  { slug: 'profile', title: 'My Profile', icon: FiUser, path: '/advanced/profile' },
];

export { advancedItems };
import { useState } from 'react';

const features = [
  { slug: 'website-accessibility-scanner', title: 'Website Accessibility Scanner', icon: FiSearch },
  { slug: 'wcag-compliance-checker', title: 'WCAG Compliance Checker', icon: FiCheckCircle },
  { slug: 'alt-text-generator', title: 'Alt Text Generator', icon: FiImage },
  { slug: 'color-contrast-analyzer', title: 'Color Contrast Analyzer', icon: FiSliders },
  { slug: 'screen-reader-optimizer', title: 'Screen Reader Optimizer', icon: FiMonitor },
  { slug: 'keyboard-navigation-auditor', title: 'Keyboard Navigation Auditor', icon: FiNavigation },
  { slug: 'aria-label-generator', title: 'ARIA Label Generator', icon: FiTag },
  { slug: 'accessibility-report-generator', title: 'Accessibility Report Generator', icon: FiFileText },
  { slug: 'remediation-plan-creator', title: 'Remediation Plan Creator', icon: FiClipboard },
  { slug: 'legal-compliance-assessor', title: 'Legal Compliance Assessor', icon: FiAlertTriangle },
  { slug: 'pdf-accessibility-checker', title: 'PDF Accessibility Checker', icon: FiFile },
  { slug: 'form-accessibility-analyzer', title: 'Form Accessibility Analyzer', icon: FiList },
  { slug: 'video-caption-generator', title: 'Video Caption Generator', icon: FiVideo },
  { slug: 'readability-analyzer', title: 'Readability Analyzer', icon: FiBookOpen },
  { slug: 'accessibility-policy-generator', title: 'Accessibility Policy Generator', icon: FiLock },
];

const sections = [
  {
    title: 'Scanning & Analysis',
    items: [features[0], features[1]],
  },
  {
    title: 'Content Accessibility',
    items: [features[2], features[3], features[12], features[13]],
  },
  {
    title: 'Technical Accessibility',
    items: [features[4], features[5], features[6], features[7]],
  },
  {
    title: 'Compliance & Legal',
    items: [features[8], features[9], features[14]],
  },
  {
    title: 'Document & Form',
    items: [features[10], features[11]],
  },
];

export { features };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiCenterOpen, setAiCenterOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      <div className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`} onClick={closeMobile} />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <FiShield size={28} />
          <h2>ADA Remediator</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="sidebar-link" onClick={closeMobile}>
            <FiGrid size={18} />
            <span>Dashboard</span>
          </NavLink>

          {sections.map((section) => (
            <div key={section.title} className="sidebar-section">
              <h3 className="sidebar-section-title">{section.title}</h3>
              {section.items.map((item) => (
                <NavLink
                  key={item.slug}
                  to={`/features/${item.slug}`}
                  className="sidebar-link"
                  onClick={closeMobile}
                >
                  <item.icon size={16} />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </div>
          ))}

          <div className="sidebar-section sidebar-section--ai">
            <button
              className="sidebar-section-title sidebar-section-title--toggle"
              onClick={() => setAiCenterOpen(!aiCenterOpen)}
            >
              <FiCpu size={16} />
              <span>AI Center</span>
              <span className={`toggle-arrow ${aiCenterOpen ? 'open' : ''}`}>&#9654;</span>
            </button>
            {aiCenterOpen && (
              <div className="ai-center-list">
                {features.map((item) => (
                  <NavLink
                    key={`ai-${item.slug}`}
                    to={`/features/${item.slug}`}
                    className="sidebar-link sidebar-link--ai"
                    onClick={closeMobile}
                  >
                    <FiCpu size={14} />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Advanced Tools (NEW)</h3>
            {advancedItems.map((item) => (
              <NavLink
                key={item.slug}
                to={item.path}
                className="sidebar-link"
                onClick={closeMobile}
              >
                <item.icon size={16} />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className="sidebar-user-email">{user?.email || ''}</span>
            </div>
          </div>
          <button className="btn-icon sidebar-logout" onClick={handleLogout} title="Logout">
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
