import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getApiPath, getAiFeature } from '../api/slugMap';
import { features } from './Sidebar';
import AIResultDisplay from './AIResultDisplay';
import QuickScanModal from './QuickScanModal';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiTrash2, FiEdit2, FiCpu, FiSave, FiX,
  FiExternalLink, FiClock, FiGlobe, FiDownload, FiZap,
  FiTrendingUp
} from 'react-icons/fi';

export default function FeatureDetail() {
  const { featureSlug, id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', url: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [quickScanOpen, setQuickScanOpen] = useState(false);

  const feature = features.find((f) => f.slug === featureSlug);
  const apiPath = `/${getApiPath(featureSlug)}`;

  useEffect(() => {
    loadItem();
    loadScoreHistory();
  }, [featureSlug, id]);

  const loadItem = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${apiPath}/${id}`);
      const data = res.data.item || res.data;
      setItem(data);
      setEditForm({ title: data.title || '', description: data.description || '', url: data.url || '' });
    } catch (err) {
      if (err.response?.status !== 401) {
        toast.error('Failed to load item');
        navigate(`/features/${featureSlug}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadScoreHistory = async () => {
    try {
      const apiRoute = getApiPath(featureSlug);
      const res = await api.get(`/score-history/${apiRoute}/${id}`);
      setScoreHistory(res.data.data || []);
    } catch {
      // Score history is optional
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`${apiPath}/${id}`);
      toast.success('Item deleted');
      navigate(`/features/${featureSlug}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      const res = await api.put(`${apiPath}/${id}`, editForm);
      const updated = res.data.item || res.data;
      setItem(updated);
      setEditing(false);
      toast.success('Item updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleRunAI = async () => {
    setAnalyzing(true);
    try {
      const aiFeature = getAiFeature(featureSlug);
      const res = await api.post(`/ai/${aiFeature}`, {
        prompt: `Analyze the following for accessibility compliance:\n\nTitle: ${item.title}\nURL: ${item.url || 'N/A'}\nDescription: ${item.description || 'N/A'}\n\nProvide a thorough WCAG 2.1 analysis with specific issues, severity ratings, WCAG criteria references, and actionable recommendations.`,
        itemId: id,
      });
      const aiResult = res.data.ai_result || res.data.result || res.data;
      setItem((prev) => ({ ...prev, ai_result: aiResult, status: 'completed' }));
      // Reload score history to include the new score
      await loadScoreHistory();
      toast.success('AI analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const apiRoute = getApiPath(featureSlug);
      const response = await api.get(`/export/${apiRoute}/${id}`, {
        params: { format },
        responseType: 'blob',
      });
      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${featureSlug}-${id}-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="feature-detail">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const Icon = feature?.icon || FiGlobe;
  const statusClass = `status--${item.status || 'pending'}`;
  const aiResult = item.ai_result || item.aiResult;

  return (
    <div className="feature-detail">
      <button className="btn btn-ghost back-btn" onClick={() => navigate(`/features/${featureSlug}`)}>
        <FiArrowLeft size={18} />
        Back to {feature?.title || 'List'}
      </button>

      <div className="detail-card">
        <div className="detail-header">
          <div className="detail-header-left">
            <Icon size={24} />
            {editing ? (
              <input
                className="detail-title-input"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            ) : (
              <h1>{item.title}</h1>
            )}
            <span className={`status-badge ${statusClass}`}>
              {item.status || 'pending'}
            </span>
            {typeof aiResult?.overall_score === 'number' && (
              <span className="score-pill" style={{
                background: aiResult.overall_score >= 80 ? '#f0fff4' : aiResult.overall_score >= 60 ? '#fffff0' : '#fff5f5',
                color: aiResult.overall_score >= 80 ? '#276749' : aiResult.overall_score >= 60 ? '#744210' : '#c53030',
                padding: '2px 10px', borderRadius: 4, fontWeight: 700, fontSize: 14, marginLeft: 8,
              }}>
                Score: {aiResult.overall_score}/100
              </span>
            )}
          </div>
          <div className="detail-actions">
            {editing ? (
              <>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                  <FiSave size={16} /> Save
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                  <FiX size={16} /> Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" title="Quick HTML Scan" onClick={() => setQuickScanOpen(true)}>
                  <FiZap size={16} /> Quick Scan
                </button>
                {aiResult && (
                  <button className="btn btn-ghost btn-sm" title="Export CSV" onClick={() => handleExport('csv')}>
                    <FiDownload size={16} /> Export
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                  <FiEdit2 size={16} /> Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <FiTrash2 size={16} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-meta">
            <div className="detail-meta-item">
              <FiGlobe size={16} />
              {editing ? (
                <input
                  className="detail-input"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  placeholder="https://example.com"
                />
              ) : (
                item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="detail-url">
                    {item.url} <FiExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-muted">No URL</span>
                )
              )}
            </div>
            <div className="detail-meta-item">
              <FiClock size={16} />
              <span>Created: {new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</span>
            </div>
          </div>

          <div className="detail-description">
            <h3>Description</h3>
            {editing ? (
              <textarea
                className="detail-textarea"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
            ) : (
              <p>{item.description || 'No description provided.'}</p>
            )}
          </div>

          {scoreHistory.length > 1 && (
            <div className="score-history-section" style={{ marginTop: 20 }}>
              <h3><FiTrendingUp size={18} /> Score History ({scoreHistory.length} runs)</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {scoreHistory.map((entry, i) => (
                  <div key={i} style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: entry.score >= 80 ? '#f0fff4' : entry.score >= 60 ? '#fffff0' : '#fff5f5',
                    color: entry.score >= 80 ? '#276749' : entry.score >= 60 ? '#744210' : '#c53030',
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    {new Date(entry.recorded_at).toLocaleDateString()}: {entry.score}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-ai-section">
            <div className="detail-ai-header">
              <h3><FiCpu size={18} /> AI Analysis</h3>
              <button
                className="btn btn-accent"
                onClick={handleRunAI}
                disabled={analyzing}
              >
                <FiCpu size={16} />
                {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            </div>

            {analyzing && (
              <div className="ai-analyzing">
                <div className="loading-spinner" />
                <p>AI is analyzing your content. This may take a moment...</p>
              </div>
            )}

            {aiResult ? (
              <AIResultDisplay result={aiResult} />
            ) : (
              <div className="ai-empty-state" style={{
                padding: '32px', textAlign: 'center', color: 'var(--text-muted)',
                border: '2px dashed var(--border-color)', borderRadius: 8, marginTop: 16,
              }}>
                <FiCpu size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p>No AI analysis yet. Click "Run AI Analysis" to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal--confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete "{item.title}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quickScanOpen && (
        <QuickScanModal onClose={() => setQuickScanOpen(false)} />
      )}
    </div>
  );
}
