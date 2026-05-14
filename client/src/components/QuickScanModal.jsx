import { useState } from 'react';
import { FiZap, FiX, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import AIResultDisplay from './AIResultDisplay';

export default function QuickScanModal({ onClose }) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!html.trim()) {
      toast.error('Please paste some HTML to scan.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/quick-scan', { html });
      setResult(res.data.ai_result);
      toast.success('Quick scan complete!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Quick scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--large"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FiZap size={22} /> Quick HTML Scan
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
          Paste HTML code for an instant accessibility check. Results are not saved — use "Run AI Analysis" on an item to persist results.
        </p>

        <form onSubmit={handleScan}>
          <div className="form-group">
            <label>HTML Snippet *</label>
            <textarea
              className="form-input"
              rows={10}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder={'<form>\n  <input type="text" />\n  <button>Submit</button>\n</form>'}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
            <small style={{ color: 'var(--text-muted)' }}>Max 50,000 characters</small>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <FiLoader className="spin" /> : <FiZap size={16} />}
              {loading ? 'Scanning...' : 'Scan Now'}
            </button>
          </div>
        </form>

        {result && (
          <div style={{ marginTop: 24 }}>
            <h3>Results</h3>
            <AIResultDisplay result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
