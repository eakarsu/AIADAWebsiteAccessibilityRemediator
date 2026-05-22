import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import FeaturePage from './components/FeaturePage';
import FeatureDetail from './components/FeatureDetail';
import ProtectedRoute from './components/ProtectedRoute';
import BatchJobsPage from './components/advanced/BatchJobsPage';
import ComparisonReportsPage from './components/advanced/ComparisonReportsPage';
import RemediationCodePage from './components/advanced/RemediationCodePage';
import LegalRiskPage from './components/advanced/LegalRiskPage';
import InvitationsPage from './components/advanced/InvitationsPage';
import CIWebhookPage from './components/advanced/CIWebhookPage';
import SkillMatrixPage from './components/advanced/SkillMatrixPage';
import PortfolioPage from './components/advanced/PortfolioPage';
import UserProfilePage from './components/advanced/UserProfilePage';
import WcagKnowledgeBasePage from './components/advanced/WcagKnowledgeBasePage';
import ValidateFixPage from './components/advanced/ValidateFixPage';
import BulkRemediatePage from './components/advanced/BulkRemediatePage';
import ABTestFixPage from './components/advanced/ABTestFixPage';
import RemediationEvidencePack from './pages/RemediationEvidencePack';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/features/:featureSlug" element={<FeaturePage />} />
        <Route path="/features/:featureSlug/:id" element={<FeatureDetail />} />
        {/* Advanced Custom Non-CRUD features */}
        <Route path="/advanced/batch-jobs" element={<BatchJobsPage />} />
        <Route path="/advanced/comparisons" element={<ComparisonReportsPage />} />
        <Route path="/advanced/remediation-code" element={<RemediationCodePage />} />
        <Route path="/advanced/legal-risk" element={<LegalRiskPage />} />
        <Route path="/advanced/invitations" element={<InvitationsPage />} />
        <Route path="/advanced/ci-webhook" element={<CIWebhookPage />} />
        <Route path="/advanced/skills" element={<SkillMatrixPage />} />
        <Route path="/advanced/portfolio" element={<PortfolioPage />} />
        {/* New pages */}
        <Route path="/advanced/profile" element={<UserProfilePage />} />
        <Route path="/advanced/wcag-kb" element={<WcagKnowledgeBasePage />} />
        <Route path="/advanced/validate-fix" element={<ValidateFixPage />} />
        <Route path="/advanced/bulk-remediate" element={<BulkRemediatePage />} />
        <Route path="/advanced/ab-test-fix" element={<ABTestFixPage />} />
        <Route path="/advanced/remediation-evidence-pack" element={<RemediationEvidencePack />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
