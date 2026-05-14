import { useState, useEffect } from 'react';
import { FiPlus, FiCpu, FiLoader, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { createComparison, listComparisons, getComparison, deleteComparison } from '../../api/advanced';
import AIResultDisplay from '../AIResultDisplay';

export default function ComparisonReportsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url_a: '', url_b: '', label_a: '', label_b: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const r = await listComparisons({ page: p, limit: 20 });
      setItems(r.data.data || []);
      setTotalPages(r.data.pagination?.totalPages || 1);
      setTotal(r.data.pagination?.total || 0);
    } catch (e) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.url_a.trim() || !form.url_b.trim()) {
      toast.error('Both URLs are required');
      return;
    }
    setSubmitting(true);
    try {
      const r = await createComparison(form);
      toast.success('Comparison report generated');
      setShowForm(false);
      setForm({ url_a: '', url_b: '', label_a: '', label_b: '' });
      setSelected(r.data);
      setPage(1);
      load(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const open = async (id) => {
    try {
      const r = await getComparison(id);
      setSelected(r.data);
    } catch {
      toast.error('Failed to load comparison');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this comparison?')) return;
    try {
      await deleteComparison(id);
      toast.success('Deleted');
      load(page);
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiCpu size={28} />
          <div>
            <h1>Accessibility Comparison Reports</h1>
            <p className="feature-page-desc">Compare WCAG compliance gaps between two websites side-by-side. ({total} total)</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><FiPlus /> New Comparison</button>
      </div>

      <div className="feature-table-container">
        {loading ? <div className="table-loading"><div className="loading-spinner" /></div>
          : items.length === 0 ? <div className="table-empty"><h3>No comparisons yet</h3><p>Compare two sites to get started.</p></div>
          : (
            <>
              <table className="feature-table">
                <thead><tr><th>Site A</th><th>Site B</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="feature-table-row" onClick={() => open(it.id)}>
                      <td>{it.label_a || it.url_a}</td>
                      <td>{it.label_b || it.url_b}</td>
                      <td>{new Date(it.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(it.id, e)}>
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <span className="pagination-info">Page {page} of {totalPages}</span>
                  <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next <FiChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Compare Two Sites</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
              AI will analyze both sites and produce a side-by-side WCAG compliance comparison.
            </p>
            <form onSubmit={submit}>
              <div className="form-group"><label>Site A URL *</label>
                <input className="form-input" value={form.url_a} onChange={(e) => setForm({ ...form, url_a: e.target.value })} placeholder="https://example.com" required /></div>
              <div className="form-group"><label>Site A Label (optional)</label>
                <input className="form-input" value={form.label_a} onChange={(e) => setForm({ ...form, label_a: e.target.value })} placeholder="Production" /></div>
              <div className="form-group"><label>Site B URL *</label>
                <input className="form-input" value={form.url_b} onChange={(e) => setForm({ ...form, url_b: e.target.value })} placeholder="https://staging.example.com" required /></div>
              <div className="form-group"><label>Site B Label (optional)</label>
                <input className="form-input" value={form.label_b} onChange={(e) => setForm({ ...form, label_b: e.target.value })} placeholder="Staging" /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><FiLoader className="spin" /> Analyzing...</> : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal--large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h2>
              {selected.label_a || selected.url_a} <span style={{ color: 'var(--text-muted)' }}>vs</span> {selected.label_b || selected.url_b}
            </h2>
            {selected.ai_result ? (
              <AIResultDisplay result={selected.ai_result} />
            ) : (
              <p>No AI result available.</p>
            )}
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
