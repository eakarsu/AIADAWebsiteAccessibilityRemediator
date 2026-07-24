import { useState, useEffect } from 'react';
import { FiPlus, FiClock, FiLoader, FiRefreshCw, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { createBatchJob, listBatchJobs, getBatchJob, deleteBatchJob } from '../../api/advanced';
import JsonView from '../JsonView';

export default function BatchJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [digestEmail, setDigestEmail] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const r = await listBatchJobs({ page: p, limit: 20 });
      setJobs(r.data.data || []);
      setTotalPages(r.data.pagination?.totalPages || 1);
      setTotal(r.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load batch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const urls = urlsText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast.error('Provide at least one URL');
      return;
    }
    if (urls.length > 100) {
      toast.error('Maximum 100 URLs per batch job');
      return;
    }
    setSubmitting(true);
    try {
      await createBatchJob({
        name,
        urls,
        digest_email: digestEmail || undefined,
        scheduled_for: scheduledFor || undefined,
      });
      toast.success('Batch job queued');
      setShowForm(false);
      setName(''); setUrlsText(''); setDigestEmail(''); setScheduledFor('');
      setPage(1);
      load(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshJob = async (id, e) => {
    e.stopPropagation();
    try {
      const r = await getBatchJob(id);
      setSelected(r.data);
      setJobs((prev) => prev.map((j) => (j.id === id ? r.data : j)));
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this batch job?')) return;
    try {
      await deleteBatchJob(id);
      toast.success('Deleted');
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiClock size={28} />
          <div>
            <h1>Batch Analysis Jobs</h1>
            <p className="feature-page-desc">Queue multiple website URLs for batch processing. Results saved to Website Scanner. ({total} total)</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <FiPlus size={18} /> New Batch Job
        </button>
      </div>

      <div className="feature-table-container">
        {loading ? (
          <div className="table-loading"><div className="loading-spinner" /><p>Loading...</p></div>
        ) : jobs.length === 0 ? (
          <div className="table-empty"><FiClock size={48} /><h3>No batch jobs</h3><p>Create one to get started.</p></div>
        ) : (
          <>
            <table className="feature-table">
              <thead>
                <tr><th>Name</th><th>URLs</th><th>Status</th><th>Scheduled</th><th>Created</th><th>Completed</th><th></th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="feature-table-row" onClick={() => { getBatchJob(j.id).then(r => setSelected(r.data)); }}>
                    <td>{j.name}</td>
                    <td>{Array.isArray(j.urls) ? j.urls.length : 0} URLs</td>
                    <td>
                      <span className={`status-badge status--${j.status === 'completed' ? 'completed' : j.status === 'failed' ? 'failed' : j.status === 'running' ? 'scanning' : 'pending'}`}>
                        {j.status}
                      </span>
                    </td>
                    <td>{j.scheduled_for ? new Date(j.scheduled_for).toLocaleString() : 'Immediate'}</td>
                    <td>{new Date(j.created_at).toLocaleDateString()}</td>
                    <td>{j.completed_at ? new Date(j.completed_at).toLocaleString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-ghost" title="Refresh" onClick={(e) => refreshJob(j.id, e)}>
                          <FiRefreshCw size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Delete" onClick={(e) => handleDelete(j.id, e)}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
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
            <h2>New Batch Analysis Job</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Job Name</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional name" />
              </div>
              <div className="form-group">
                <label>URLs (one per line) * (max 100)</label>
                <textarea className="form-input" value={urlsText} onChange={(e) => setUrlsText(e.target.value)} rows={6} placeholder="https://example.com&#10;https://other.com" required />
              </div>
              <div className="form-group">
                <label>Digest Email (optional)</label>
                <input type="email" className="form-input" value={digestEmail} onChange={(e) => setDigestEmail(e.target.value)} placeholder="notify@example.com" />
              </div>
              <div className="form-group">
                <label>Schedule For (optional — leave blank to run immediately)</label>
                <input type="datetime-local" className="form-input" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <FiLoader className="spin" /> : <FiPlus />} Queue Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal--large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h2>Job: {selected.name}</h2>
            <p><strong>Status:</strong> <span className={`status-badge status--${selected.status === 'completed' ? 'completed' : selected.status === 'failed' ? 'failed' : 'pending'}`}>{selected.status}</span></p>
            <p><strong>URLs queued:</strong> {Array.isArray(selected.urls) ? selected.urls.length : 0}</p>
            {selected.completed_at && <p><strong>Completed:</strong> {new Date(selected.completed_at).toLocaleString()}</p>}
            <h3>Results</h3>
            {selected.results ? <JsonView data={selected.results} /> : <p>No results yet. The job may still be processing.</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
