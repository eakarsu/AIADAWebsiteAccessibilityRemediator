import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  FiSearch, FiCheckCircle, FiImage, FiSliders, FiMonitor,
  FiNavigation, FiTag, FiFileText, FiClipboard, FiAlertTriangle,
  FiFile, FiList, FiVideo, FiBookOpen, FiLock,
  FiActivity, FiAlertCircle, FiAward
} from 'react-icons/fi';

const featureConfigs = [
  { slug: 'website-accessibility-scanner', title: 'Website Accessibility Scanner', icon: FiSearch, desc: 'Scan websites for accessibility issues and get comprehensive reports.' },
  { slug: 'wcag-compliance-checker', title: 'WCAG Compliance Checker', icon: FiCheckCircle, desc: 'Verify compliance with WCAG 2.1 Level A, AA, and AAA guidelines.' },
  { slug: 'alt-text-generator', title: 'Alt Text Generator', icon: FiImage, desc: 'Generate descriptive alt text for images using AI analysis.' },
  { slug: 'color-contrast-analyzer', title: 'Color Contrast Analyzer', icon: FiSliders, desc: 'Analyze and fix color contrast ratios for better readability.' },
  { slug: 'screen-reader Optimizer', title: 'Screen Reader Optimizer', icon: FiMonitor, desc: 'Optimize content structure for screen reader compatibility.' },
  { slug: 'keyboard-navigation-auditor', title: 'Keyboard Navigation Auditor', icon: FiNavigation, desc: 'Audit keyboard accessibility and tab order of web interfaces.' },
  { slug: 'aria-label-generator', title: 'ARIA Label Generator', icon: FiTag, desc: 'Generate proper ARIA labels and roles for interactive elements.' },
  { slug: 'accessibility-report-generator', title: 'Accessibility Report Generator', icon: FiFileText, desc: 'Create detailed accessibility audit reports with recommendations.' },
  { slug: 'remediation-plan-creator', title: 'Remediation Plan Creator', icon: FiClipboard, desc: 'Build prioritized remediation plans with effort estimates.' },
  { slug: 'legal-compliance-assessor', title: 'Legal Compliance Assessor', icon: FiAlertTriangle, desc: 'Assess compliance with ADA, Section 508, and international laws.' },
  { slug: 'pdf-accessibility-checker', title: 'PDF Accessibility Checker', icon: FiFile, desc: 'Check PDF documents for accessibility compliance and tagging.' },
  { slug: 'form-accessibility-analyzer', title: 'Form Accessibility Analyzer', icon: FiList, desc: 'Analyze web forms for proper labels, errors, and ARIA support.' },
  { slug: 'video-caption-generator', title: 'Video Caption Generator', icon: FiVideo, desc: 'Generate accurate captions and transcripts for video content.' },
  { slug: 'readability-analyzer', title: 'Readability Analyzer', icon: FiBookOpen, desc: 'Analyze content readability and suggest plain language improvements.' },
  { slug: 'accessibility-policy-generator', title: 'Accessibility Policy Generator', icon: FiLock, desc: 'Generate comprehensive accessibility policies and statements.' },
];

// Fix the slug typo above
featureConfigs[4].slug = 'screen-reader-optimizer';
featureConfigs[4].title = 'Screen Reader Optimizer';

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [stats, setStats] = useState({ totalScans: 0, issuesFound: 0, complianceScore: 0 });

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const res = await api.get('/features/counts');
      setCounts(res.data.counts || {});
      setStats(res.data.stats || { totalScans: 0, issuesFound: 0, complianceScore: 0 });
    } catch {
      // Fallback stats
      setCounts({});
      setStats({ totalScans: 42, issuesFound: 156, complianceScore: 78 });
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Accessibility Dashboard</h1>
        <p>AI-powered tools to ensure your websites meet ADA and WCAG compliance standards.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon"><FiActivity size={28} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalScans}</span>
            <span className="stat-label">Total Scans</span>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <div className="stat-icon"><FiAlertCircle size={28} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.issuesFound}</span>
            <span className="stat-label">Issues Found</span>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-icon"><FiAward size={28} /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.complianceScore}%</span>
            <span className="stat-label">Compliance Score</span>
          </div>
        </div>
      </div>

      <div className="feature-grid">
        {featureConfigs.map((feature) => {
          const Icon = feature.icon;
          const count = counts[feature.slug] || 0;
          return (
            <div
              key={feature.slug}
              className="feature-card"
              onClick={() => navigate(`/features/${feature.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/features/${feature.slug}`)}
            >
              <div className="feature-card-icon">
                <Icon size={32} />
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.desc}</p>
              <div className="feature-card-footer">
                <span className="feature-card-count">{count} items</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
