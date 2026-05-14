import { useState } from 'react';
import { FiCheckCircle, FiLoader, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import JsonView from '../JsonView';

/**
 * Page for the new POST /api/ai/validate-fix endpoint.
 * Compares an original HTML snippet to a proposed fixed snippet and reports
 * validity, regressions, WCAG addressed/missed, and a rollback recommendation.
 */
export default function ValidateFixPage() {
  const [form, setForm] = useState({
    issue_type: '',
    original_html: '',
    fixed_html: '',
    wcag_criteria: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post('/ai/validate-fix', form);
      setResult(r.data);
      toast.success('Fix validated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const ai = result?.ai_result || result;

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiCheckCircle size={28} />
          <div>
            <h1>Validate Remediation Fix</h1>
            <p className="feature-page-desc">
              Verify a proposed accessibility fix is correct before applying. Returns validity,
              regressions, WCAG addressed/missed, overall score, and a rollback recommendation.
            </p>
          </div>
        </div>
      </div>

      <div className="detail-card">
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Issue Type *</label>
            <input
              className="form-input"
              value={form.issue_type}
              onChange={(e) => setForm({ ...form, issue_type: e.target.value })}
              placeholder="e.g., missing_alt_text, missing_label"
              required
            />
          </div>
          <div className="form-group">
            <label>WCAG Criteria</label>
            <input
              className="form-input"
              value={form.wcag_criteria}
              onChange={(e) => setForm({ ...form, wcag_criteria: e.target.value })}
              placeholder="e.g., 1.1.1, 1.3.1"
            />
          </div>
          <div className="form-group">
            <label>Original HTML *</label>
            <textarea
              className="form-input"
              rows={8}
              value={form.original_html}
              onChange={(e) => setForm({ ...form, original_html: e.target.value })}
              placeholder="<img src='banner.png' />"
              required
            />
          </div>
          <div className="form-group">
            <label>Fixed HTML *</label>
            <textarea
              className="form-input"
              rows={8}
              value={form.fixed_html}
              onChange={(e) => setForm({ ...form, fixed_html: e.target.value })}
              placeholder="<img src='banner.png' alt='Q4 product launch' />"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <FiLoader className="spin" /> : <FiCpu />} Validate Fix
          </button>
        </form>

        {ai && (
          <div style={{ marginTop: 24 }}>
            <h3>Validation Result</h3>
            {ai.overall_score !== undefined && (
              <p>
                <strong>Overall Score:</strong> {ai.overall_score}
                {ai.is_valid !== undefined && (
                  <span style={{ marginLeft: 12 }}>
                    <strong>Valid:</strong> {String(ai.is_valid)}
                  </span>
                )}
                {ai.rollback_recommended !== undefined && (
                  <span style={{ marginLeft: 12 }}>
                    <strong>Rollback Recommended:</strong> {String(ai.rollback_recommended)}
                  </span>
                )}
              </p>
            )}
            <JsonView data={ai} />
          </div>
        )}
      </div>
    </div>
  );
}
