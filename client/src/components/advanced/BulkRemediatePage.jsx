import { useState } from 'react';
import { FiLayers, FiLoader, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import JsonView from '../JsonView';

/**
 * Bulk Remediation page — POST /api/ai/bulk-remediate
 * PRODUCT-DECISION (server): cap at 25 issues per batch.
 * Issues are entered as JSON array. Each entry: { issue_type, element_html, wcag_criteria? }.
 */
export default function BulkRemediatePage() {
  const [issuesJson, setIssuesJson] = useState(
    JSON.stringify(
      [
        { issue_type: 'missing_alt_text', element_html: '<img src="hero.png" />', wcag_criteria: '1.1.1' },
        { issue_type: 'missing_label', element_html: '<input type="email" />', wcag_criteria: '3.3.2' },
      ],
      null,
      2
    )
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    let issues;
    try {
      issues = JSON.parse(issuesJson);
    } catch (err) {
      toast.error('Issues must be valid JSON array.');
      setLoading(false);
      return;
    }
    try {
      const r = await api.post('/ai/bulk-remediate', { issues });
      setResult(r.data);
      toast.success(`Bulk: ${r.data.success}/${r.data.total} ok`);
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error(`AI not configured. Missing: ${err.response.data?.missing || 'OPENROUTER_API_KEY'}`);
      } else {
        toast.error(err.response?.data?.error || 'Bulk remediation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiLayers size={28} />
          <div>
            <h1>Bulk Remediation</h1>
            <p className="feature-page-desc">
              Apply AI-generated WCAG fixes to up to 25 accessibility issues in a single request.
              Each issue is processed independently; failures do not abort the batch.
            </p>
          </div>
        </div>
      </div>

      <div className="detail-card">
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Issues (JSON array, max 25)</label>
            <textarea
              className="form-input"
              rows={16}
              value={issuesJson}
              onChange={(e) => setIssuesJson(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <FiLoader className="spin" /> : <FiCpu />} Run Bulk Remediation
          </button>
        </form>

        {result && (
          <div style={{ marginTop: 24 }}>
            <h3>
              Results: {result.success}/{result.total} succeeded
              {result.failed > 0 ? ` (${result.failed} failed)` : ''}
            </h3>
            <JsonView data={result} />
          </div>
        )}
      </div>
    </div>
  );
}
