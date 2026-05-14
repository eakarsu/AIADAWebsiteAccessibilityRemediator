import { useState } from 'react';
import { FiGitBranch, FiLoader, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import JsonView from '../JsonView';

/**
 * A/B Test Fix page — POST /api/ai/ab-test-fix
 * Compares two candidate fixes against the same original HTML and picks a winner.
 */
export default function ABTestFixPage() {
  const [form, setForm] = useState({
    issue_type: '',
    original_html: '',
    candidate_a: '',
    candidate_b: '',
    wcag_criteria: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post('/ai/ab-test-fix', form);
      setResult(r.data);
      toast.success(`A/B winner: ${r.data?.comparison?.winner || 'tie'}`);
    } catch (err) {
      if (err.response?.status === 503) {
        toast.error(`AI not configured. Missing: ${err.response.data?.missing || 'OPENROUTER_API_KEY'}`);
      } else {
        toast.error(err.response?.data?.error || 'A/B test failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const cmp = result?.comparison || result;

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiGitBranch size={28} />
          <div>
            <h1>A/B Test Remediation Fixes</h1>
            <p className="feature-page-desc">
              Compare two candidate fixes against the same original HTML. The AI scores each
              candidate, identifies regressions, and picks a winner with rationale.
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
              placeholder="e.g., missing_alt_text"
              required
            />
          </div>
          <div className="form-group">
            <label>WCAG Criteria</label>
            <input
              className="form-input"
              value={form.wcag_criteria}
              onChange={(e) => setForm({ ...form, wcag_criteria: e.target.value })}
              placeholder="e.g., 1.1.1"
            />
          </div>
          <div className="form-group">
            <label>Original HTML *</label>
            <textarea
              className="form-input"
              rows={6}
              value={form.original_html}
              onChange={(e) => setForm({ ...form, original_html: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Candidate A *</label>
            <textarea
              className="form-input"
              rows={6}
              value={form.candidate_a}
              onChange={(e) => setForm({ ...form, candidate_a: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Candidate B *</label>
            <textarea
              className="form-input"
              rows={6}
              value={form.candidate_b}
              onChange={(e) => setForm({ ...form, candidate_b: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <FiLoader className="spin" /> : <FiCpu />} Run A/B Test
          </button>
        </form>

        {cmp && (
          <div style={{ marginTop: 24 }}>
            <h3>Comparison</h3>
            {cmp.winner !== undefined && (
              <p>
                <strong>Winner:</strong> {String(cmp.winner)}
                {cmp.overall_score !== undefined && (
                  <span style={{ marginLeft: 12 }}>
                    <strong>Confidence Score:</strong> {cmp.overall_score}
                  </span>
                )}
              </p>
            )}
            <JsonView data={cmp} />
          </div>
        )}
      </div>
    </div>
  );
}
