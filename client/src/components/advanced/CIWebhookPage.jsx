import { useEffect, useState } from 'react';
import { FiPlay, FiLoader, FiGitBranch, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { triggerWebhookScan, listWebhookResults } from '../../api/advanced';
import JsonView from '../JsonView';

export default function CIWebhookPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ site_url: '', commit_sha: '', branch: 'main', threshold: 80 });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listWebhookResults({ page: 1, limit: 50 });
      setResults(r.data.data || []);
    } catch (e) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await triggerWebhookScan({ ...form, threshold: parseInt(form.threshold) });
      toast.success(r.data.passed ? 'Build passed accessibility check' : 'Build FAILED accessibility check');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiGitBranch size={28} />
          <div>
            <h1>CI/CD Webhook Integration</h1>
            <p className="feature-page-desc">Trigger accessibility scans on every site deploy; fail builds below threshold.</p>
          </div>
        </div>
      </div>

      <div className="detail-card" style={{ marginBottom: 20 }}>
        <h3>Trigger Manual Webhook Scan</h3>
        <form onSubmit={submit}>
          <div className="form-group"><label>Site URL *</label>
            <input className="form-input" required value={form.site_url}
              onChange={(e) => setForm({ ...form, site_url: e.target.value })} placeholder="https://staging.example.com" /></div>
          <div className="form-group"><label>Commit SHA</label>
            <input className="form-input" value={form.commit_sha}
              onChange={(e) => setForm({ ...form, commit_sha: e.target.value })} /></div>
          <div className="form-group"><label>Branch</label>
            <input className="form-input" value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })} /></div>
          <div className="form-group"><label>Score Threshold (0-100)</label>
            <input type="number" className="form-input" value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: e.target.value })} /></div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <FiLoader className="spin" /> : <FiPlay />} Run Scan
          </button>
        </form>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          External CI integrations can POST to <code>/api/advanced/webhooks/scan</code> with the same payload + Bearer token.
        </p>
      </div>

      <h2>Recent Webhook Results</h2>
      <div className="feature-table-container">
        {loading ? <div className="table-loading"><div className="loading-spinner" /></div>
          : results.length === 0 ? <div className="table-empty"><h3>No results yet</h3></div>
          : (
            <table className="feature-table">
              <thead><tr><th>URL</th><th>Branch</th><th>SHA</th><th>Score</th><th>Threshold</th><th>Result</th><th>When</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="feature-table-row" onClick={() => setSelected(r)}>
                    <td>{r.site_url}</td>
                    <td>{r.branch || '—'}</td>
                    <td>{r.commit_sha ? r.commit_sha.slice(0, 7) : '—'}</td>
                    <td>{r.score ?? '—'}</td>
                    <td>{r.threshold}</td>
                    <td>{r.passed ? <span style={{ color: '#10b981' }}><FiCheckCircle /> Pass</span> : <span style={{ color: '#ef4444' }}><FiXCircle /> Fail</span>}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
            <h2>Scan Detail</h2>
            <p><strong>URL:</strong> {selected.site_url}</p>
            <p><strong>Score:</strong> {selected.score} / Threshold {selected.threshold}</p>
            <h3>AI Result</h3>
            <JsonView data={selected.ai_result} />
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
