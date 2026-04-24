import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getApiPath } from '../api/slugMap';
import { features } from './Sidebar';
import NewItemModal from './NewItemModal';
import { FiPlus, FiChevronLeft, FiChevronRight, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: { label: 'Pending', className: 'status--pending' },
  in_progress: { label: 'In Progress', className: 'status--scanning' },
  scanning: { label: 'Scanning', className: 'status--scanning' },
  completed: { label: 'Completed', className: 'status--completed' },
  failed: { label: 'Failed', className: 'status--failed' },
};

export default function FeaturePage() {
  const { featureSlug } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  const feature = features.find((f) => f.slug === featureSlug);
  const apiPath = `/${getApiPath(featureSlug)}`;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(apiPath);
      const data = Array.isArray(res.data) ? res.data : (res.data.items || res.data.data || []);
      setTotalPages(Math.ceil(data.length / perPage) || 1);
      const start = (page - 1) * perPage;
      setItems(data.slice(start, start + perPage));
    } catch (err) {
      if (err.response?.status !== 401) {
        toast.error('Failed to load items');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, page]);

  useEffect(() => {
    setPage(1);
  }, [featureSlug]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreated = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    loadItems();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (!feature) {
    return (
      <div className="feature-page">
        <div className="feature-page-header">
          <h1>Feature Not Found</h1>
        </div>
      </div>
    );
  }

  const Icon = feature.icon;

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <Icon size={28} />
          <div>
            <h1>{feature.title}</h1>
            <p className="feature-page-desc">Manage and analyze your {feature.title.toLowerCase()} items.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <FiPlus size={18} />
          New Item
        </button>
      </div>

      <div className="feature-table-container">
        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner" />
            <p>Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="table-empty">
            <Icon size={48} />
            <h3>No items yet</h3>
            <p>Create your first item to get started with AI-powered analysis.</p>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <FiPlus size={18} />
              Create First Item
            </button>
          </div>
        ) : (
          <>
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = statusConfig[item.status] || statusConfig.pending;
                  return (
                    <tr
                      key={item.id || item._id}
                      className="feature-table-row"
                      onClick={() => navigate(`/features/${featureSlug}/${item.id || item._id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/features/${featureSlug}/${item.id || item._id}`)}
                    >
                      <td className="td-title">{item.title}</td>
                      <td className="td-url">
                        <span className="url-text">{item.url}</span>
                        <FiExternalLink size={14} />
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="td-date">{formatDate(item.createdAt || item.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <FiChevronLeft size={16} />
                  Previous
                </button>
                <span className="pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <NewItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        apiPath={apiPath}
        onCreated={handleCreated}
      />
    </div>
  );
}
