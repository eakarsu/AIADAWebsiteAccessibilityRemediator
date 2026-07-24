import { useEffect, useState } from 'react';
import { FiUsers, FiPlus, FiCpu, FiLoader, FiTrash2, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { listSkills, createSkill, updateSkill, deleteSkill, suggestSkills } from '../../api/advanced';
import JsonView from '../JsonView';

export default function SkillMatrixPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ member_name: '', member_email: '', role: '', certifications: '', training_completed: '', proficiency_score: 0 });
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listSkills({ page: 1, limit: 100 });
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
    const payload = {
      member_name: form.member_name,
      member_email: form.member_email,
      role: form.role,
      certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
      training_completed: form.training_completed.split(',').map(s => s.trim()).filter(Boolean),
      proficiency_score: parseInt(form.proficiency_score) || 0,
    };
    try {
      if (editing) {
        await updateSkill(editing.id, payload);
        toast.success('Updated');
      } else {
        await createSkill(payload);
        toast.success('Created');
      }
      setShowForm(false); setEditing(null);
      setForm({ member_name: '', member_email: '', role: '', certifications: '', training_completed: '', proficiency_score: 0 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openEdit = (it) => {
    setEditing(it);
    setForm({
      member_name: it.member_name || '',
      member_email: it.member_email || '',
      role: it.role || '',
      certifications: Array.isArray(it.certifications) ? it.certifications.join(', ') : '',
      training_completed: Array.isArray(it.training_completed) ? it.training_completed.join(', ') : '',
      proficiency_score: it.proficiency_score || 0,
    });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this team member?')) return;
    await deleteSkill(id);
    load();
  };

  const runSuggest = async () => {
    setSuggestLoading(true);
    try {
      const r = await suggestSkills();
      setSuggestions(r.data.result);
    } catch {
      toast.error('Failed');
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiUsers size={28} />
          <div>
            <h1>Accessibility Skill Matrix</h1>
            <p className="feature-page-desc">Track which team members hold WCAG/ADA training; get role-based recommendations.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={runSuggest} disabled={suggestLoading}>
            {suggestLoading ? <FiLoader className="spin" /> : <FiCpu />} AI Suggestions
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <FiPlus /> Add Member
          </button>
        </div>
      </div>

      <div className="feature-table-container">
        {loading ? <div className="table-loading"><div className="loading-spinner" /></div>
          : items.length === 0 ? <div className="table-empty"><h3>No team members</h3></div>
          : (
            <table className="feature-table">
              <thead><tr><th>Name</th><th>Role</th><th>Certifications</th><th>Trainings</th><th>Score</th><th></th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td><strong>{it.member_name}</strong><br /><small>{it.member_email}</small></td>
                    <td>{it.role}</td>
                    <td>{Array.isArray(it.certifications) ? it.certifications.join(', ') : '—'}</td>
                    <td>{Array.isArray(it.training_completed) ? it.training_completed.length : 0}</td>
                    <td><strong>{it.proficiency_score}/100</strong></td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(it)}><FiEdit2 /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(it.id)}><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {suggestions && (
        <div className="detail-card" style={{ marginTop: 24 }}>
          <h2>AI-Suggested Trainings</h2>
          <JsonView data={suggestions} />
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Member' : 'Add Member'}</h2>
            <form onSubmit={submit}>
              <div className="form-group"><label>Name *</label>
                <input className="form-input" required value={form.member_name} onChange={(e) => setForm({ ...form, member_name: e.target.value })} /></div>
              <div className="form-group"><label>Email</label>
                <input type="email" className="form-input" value={form.member_email} onChange={(e) => setForm({ ...form, member_email: e.target.value })} /></div>
              <div className="form-group"><label>Role</label>
                <input className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g., Developer, Designer, QA" /></div>
              <div className="form-group"><label>Certifications (comma-separated)</label>
                <input className="form-input" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="CPACC, WAS, IAAP-WAS" /></div>
              <div className="form-group"><label>Trainings Completed (comma-separated)</label>
                <input className="form-input" value={form.training_completed} onChange={(e) => setForm({ ...form, training_completed: e.target.value })} placeholder="WCAG 2.1, ARIA Patterns" /></div>
              <div className="form-group"><label>Proficiency Score (0-100)</label>
                <input type="number" className="form-input" value={form.proficiency_score} onChange={(e) => setForm({ ...form, proficiency_score: e.target.value })} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
