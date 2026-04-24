import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getApiPath, getAiFeature } from '../api/slugMap';
import { features } from './Sidebar';
import AIResultDisplay from './AIResultDisplay';
import toast from 'react-hot-toast';
import {
  FiArrowLeft, FiTrash2, FiEdit2, FiCpu, FiSave, FiX,
  FiExternalLink, FiClock, FiGlobe
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

  const feature = features.find((f) => f.slug === featureSlug);
  const apiPath = `/${getApiPath(featureSlug)}`;

  useEffect(() => {
    loadItem();
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
        prompt: `Analyze the following: Title: ${item.title}. URL: ${item.url}. Description: ${item.description || 'N/A'}`,
        itemId: id,
      });
      const aiResult = res.data.ai_result || res.data.result || res.data;
      setItem((prev) => ({ ...prev, ai_result: aiResult, status: 'completed' }));
      toast.success('AI analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
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
                />
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="detail-url">
                  {item.url} <FiExternalLink size={14} />
                </a>
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

            {item.aiResult && <AIResultDisplay result={item.aiResult} />}
            {item.ai_result && !item.aiResult && <AIResultDisplay result={item.ai_result} />}
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
    </div>
  );
}
