import { useState } from 'react';
import { FiCpu, FiLoader, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { remediate } from '../../api/advanced';
import JsonView from '../JsonView';

export default function RemediationCodePage() {
  const [form, setForm] = useState({ issue_type: '', element_html: '', wcag_criteria: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await remediate(form);
      setResult(r.data);
      toast.success('Patch generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadPatch = () => {
    if (!result?.ai_result?.fixed_html) return;
    const blob = new Blob([result.ai_result.fixed_html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `remediation-${Date.now()}.html`;
    a.click();
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiCpu size={28} />
          <div>
            <h1>Auto-Remediation Code Generator</h1>
            <p className="feature-page-desc">Generate ARIA-corrected HTML patches for accessibility issues.</p>
          </div>
        </div>
      </div>

      <div className="detail-card">
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Issue Type *</label>
            <input className="form-input" value={form.issue_type} onChange={(e) => setForm({ ...form, issue_type: e.target.value })} placeholder="e.g., missing_label" required />
          </div>
          <div className="form-group">
            <label>WCAG Criteria</label>
            <input className="form-input" value={form.wcag_criteria} onChange={(e) => setForm({ ...form, wcag_criteria: e.target.value })} placeholder="e.g., 1.3.1, 4.1.2" />
          </div>
          <div className="form-group">
            <label>Original HTML *</label>
            <textarea className="form-input" rows={8} value={form.element_html} onChange={(e) => setForm({ ...form, element_html: e.target.value })} placeholder="<input type='text' />" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <FiLoader className="spin" /> : <FiCpu />} Generate Patch
          </button>
        </form>

        {result && (
          <div style={{ marginTop: 24 }}>
            <h3>Generated Patch</h3>
            {result.ai_result?.fixed_html && (
              <>
                <pre className="json-pre">{result.ai_result.fixed_html}</pre>
                <button className="btn btn-secondary" onClick={downloadPatch}>
                  <FiDownload /> Download HTML
                </button>
              </>
            )}
            <h3 style={{ marginTop: 16 }}>Details</h3>
            <JsonView data={result.ai_result} />
          </div>
        )}
      </div>
    </div>
  );
}
