import { useState, useEffect } from 'react';
import { FiPlus, FiShare2, FiX, FiCopy, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { createInvite, listInvites, revokeInvite } from '../../api/advanced';

const REPORT_TYPES = ['website_scan', 'accessibility_report', 'legal_assessment', 'remediation_plan'];

export default function InvitationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ auditor_email: '', report_type: 'website_scan', report_id: '', expires_in_days: 14 });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listInvites({ page: 1, limit: 50 });
      setItems(r.data.data || []);
    } catch {
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
      const r = await createInvite({ ...form, report_id: parseInt(form.report_id) });
      toast.success('Invitation created');
      setShowForm(false);
      setForm({ auditor_email: '', report_type: 'website_scan', report_id: '', expires_in_days: 14 });
      load();
      const link = `${window.location.origin}${r.data.share_link}`;
      navigator.clipboard.writeText(link).catch(() => {});
      toast.success('Share link copied to clipboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/api/advanced/invites/access/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this invitation?')) return;
    await revokeInvite(id);
    toast.success('Revoked');
    load();
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiShare2 size={28} />
          <div>
            <h1>Third-Party Auditor Invitations</h1>
            <p className="feature-page-desc">Share read-only access to reports via secure tokens.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><FiPlus /> New Invitation</button>
      </div>

      <div className="feature-table-container">
        {loading ? <div className="table-loading"><div className="loading-spinner" /></div>
          : items.length === 0 ? <div className="table-empty"><h3>No invitations yet</h3></div>
          : (
            <table className="feature-table">
              <thead><tr><th>Auditor</th><th>Report Type</th><th>Report ID</th><th>Expires</th><th>Status</th><th>Accesses</th><th></th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.auditor_email}</td>
                    <td>{it.report_type}</td>
                    <td>{it.report_id}</td>
                    <td>{it.expires_at ? new Date(it.expires_at).toLocaleDateString() : 'Never'}</td>
                    <td>{it.revoked ? <span className="status-badge status--failed">Revoked</span> : <span className="status-badge status--completed">Active</span>}</td>
                    <td>{it.access_count}</td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => copyLink(it.access_token)}><FiCopy /></button>
                      {!it.revoked && <button className="btn btn-sm btn-danger" onClick={() => revoke(it.id)}><FiX /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Invitation</h2>
            <form onSubmit={submit}>
              <div className="form-group"><label>Auditor Email *</label>
                <input type="email" className="form-input" required value={form.auditor_email}
                  onChange={(e) => setForm({ ...form, auditor_email: e.target.value })} /></div>
              <div className="form-group"><label>Report Type *</label>
                <select className="form-input" value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })}>
                  {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="form-group"><label>Report ID *</label>
                <input type="number" className="form-input" required value={form.report_id}
                  onChange={(e) => setForm({ ...form, report_id: e.target.value })} /></div>
              <div className="form-group"><label>Expires in (days)</label>
                <input type="number" className="form-input" value={form.expires_in_days}
                  onChange={(e) => setForm({ ...form, expires_in_days: parseInt(e.target.value) || 14 })} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <FiLoader className="spin" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
