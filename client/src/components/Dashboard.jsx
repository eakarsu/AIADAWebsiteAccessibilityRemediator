import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  FiSearch, FiCheckCircle, FiImage, FiSliders, FiMonitor,
  FiNavigation, FiTag, FiFileText, FiClipboard, FiAlertTriangle,
  FiFile, FiList, FiVideo, FiBookOpen, FiLock,
  FiActivity, FiAlertCircle, FiAward, FiClock, FiShare2,
  FiGitBranch, FiUsers, FiGrid, FiCpu, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const advancedFeatures = [
  { path: '/advanced/batch-jobs', title: 'Batch Analysis Jobs', icon: FiClock, desc: 'Queue multiple URLs for overnight processing.' },
  { path: '/advanced/comparisons', title: 'Comparison Reports', icon: FiCheckCircle, desc: 'Side-by-side WCAG compliance comparisons.' },
  { path: '/advanced/remediation-code', title: 'Auto-Remediation Code', icon: FiCpu, desc: 'Generate ARIA-corrected HTML patches.' },
  { path: '/advanced/legal-risk', title: 'Legal Risk Dashboard', icon: FiAlertTriangle, desc: 'ADA litigation risk score across sites.' },
  { path: '/advanced/invitations', title: 'Auditor Invitations', icon: FiShare2, desc: 'Share read-only report access via tokens.' },
  { path: '/advanced/ci-webhook', title: 'CI/CD Webhook', icon: FiGitBranch, desc: 'Block deploys below accessibility threshold.' },
  { path: '/advanced/skills', title: 'Skill Matrix', icon: FiUsers, desc: 'Track team WCAG/ADA training & certifications.' },
  { path: '/advanced/portfolio', title: 'Portfolio Scorecard', icon: FiGrid, desc: 'Multi-site health scorecard with alerts.' },
];

const featureConfigs = [
  { slug: 'website-accessibility-scanner', title: 'Website Accessibility Scanner', icon: FiSearch, desc: 'Scan websites for accessibility issues and get comprehensive reports.' },
  { slug: 'wcag-compliance-checker', title: 'WCAG Compliance Checker', icon: FiCheckCircle, desc: 'Verify compliance with WCAG 2.1 Level A, AA, and AAA guidelines.' },
  { slug: 'alt-text-generator', title: 'Alt Text Generator', icon: FiImage, desc: 'Generate descriptive alt text for images using AI analysis.' },
  { slug: 'color-contrast-analyzer', title: 'Color Contrast Analyzer', icon: FiSliders, desc: 'Analyze and fix color contrast ratios for better readability.' },
  { slug: 'screen-reader-optimizer', title: 'Screen Reader Optimizer', icon: FiMonitor, desc: 'Optimize content structure for screen reader compatibility.' },
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [stats, setStats] = useState({ totalScans: 0, issuesFound: 0, complianceScore: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const res = await api.get('/features/counts');
      setCounts(res.data.counts || {});
      setStats(res.data.stats || { totalScans: 0, issuesFound: 0, complianceScore: null });
    } catch {
      setCounts({});
      setStats({ totalScans: 0, issuesFound: 0, complianceScore: null });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.get('/search', { params: { q: searchQuery, limit: 20 } });
      setSearchResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Accessibility Dashboard</h1>
        <p>AI-powered tools to ensure your websites meet ADA and WCAG compliance standards.</p>
      </div>

      {/* Global Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36, margin: 0 }}
            placeholder="Search across all features..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) clearSearch(); }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={searching || !searchQuery.trim()}>
          {searching ? 'Searching...' : 'Search'}
        </button>
        {searchResults && (
          <button type="button" className="btn btn-secondary" onClick={clearSearch}>
            <FiX size={16} /> Clear
          </button>
        )}
      </form>

      {/* Search Results */}
      {searchResults && (
        <div className="feature-table-container" style={{ marginBottom: 32 }}>
          <h2 style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
            Search Results ({searchResults.pagination?.total || 0} found for "{searchResults.query}")
          </h2>
          {searchResults.data.length === 0 ? (
            <div className="table-empty"><p>No results found.</p></div>
          ) : (
            <table className="feature-table">
              <thead>
                <tr><th>Title</th><th>Type</th><th>URL</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {searchResults.data.map((item) => (
                  <tr
                    key={`${item.feature_type}-${item.id}`}
                    className="feature-table-row"
                    onClick={() => navigate(`/features/${item.feature_type}/${item.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/features/${item.feature_type}/${item.id}`)}
                  >
                    <td className="td-title">{item.title}</td>
                    <td><span className="status-badge status--pending" style={{ fontSize: 11 }}>{item.feature_type.replace(/-/g, ' ')}</span></td>
                    <td className="td-url"><span className="url-text">{item.url}</span></td>
                    <td><span className={`status-badge status--${item.status}`}>{item.status}</span></td>
                    <td className="td-date">{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
            <span className="stat-value">
              {stats.complianceScore !== null ? `${stats.complianceScore}%` : '—'}
            </span>
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
                <span className="feature-card-count">{count} item{count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      <h2 style={{ margin: '32px 0 16px', fontSize: 20, fontWeight: 700 }}>
        Advanced Tools
      </h2>
      <div className="feature-grid">
        {advancedFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.path}
              className="feature-card"
              onClick={() => navigate(feature.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(feature.path)}
            >
              <div className="feature-card-icon">
                <Icon size={32} />
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
