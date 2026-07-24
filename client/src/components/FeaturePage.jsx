import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getApiPath } from '../api/slugMap';
import { features } from './Sidebar';
import NewItemModal from './NewItemModal';
import { FiPlus, FiChevronLeft, FiChevronRight, FiExternalLink, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

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
  const [total, setTotal] = useState(0);

  const feature = features.find((f) => f.slug === featureSlug);
  const apiPath = `/${getApiPath(featureSlug)}`;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(apiPath, { params: { page, limit: PAGE_SIZE } });
      // Server returns { data: [...], pagination: { page, limit, total, totalPages } }
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const pagination = res.data.pagination || {};
      setItems(data);
      setTotalPages(pagination.totalPages || 1);
      setTotal(pagination.total || data.length);
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

  const handleCreated = () => {
    // Go to page 1 to see the new item (it will be at the top)
    setPage(1);
    loadItems();
  };

  const handleExport = async (item, e) => {
    e.stopPropagation();
    try {
      const apiRoute = getApiPath(featureSlug);
      const response = await api.get(`/export/${apiRoute}/${item.id}`, {
        params: { format: 'csv' },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${featureSlug}-${item.id}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
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
            <p className="feature-page-desc">
              Manage and analyze your {feature.title.toLowerCase()} items.
              {total > 0 && <span className="item-count"> ({total} total)</span>}
            </p>
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
                  <th>Score</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = statusConfig[item.status] || statusConfig.pending;
                  const score = item.ai_result?.overall_score;
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
                        {item.url && <FiExternalLink size={14} />}
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        {typeof score === 'number' ? (
                          <span className="score-pill" style={{
                            background: score >= 80 ? '#f0fff4' : score >= 60 ? '#fffff0' : '#fff5f5',
                            color: score >= 80 ? '#276749' : score >= 60 ? '#744210' : '#c53030',
                            padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 13,
                          }}>
                            {score}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td className="td-date">{formatDate(item.createdAt || item.created_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {item.ai_result && (
                          <button
                            className="btn btn-sm btn-ghost"
                            title="Export CSV"
                            onClick={(e) => handleExport(item, e)}
                          >
                            <FiDownload size={14} />
                          </button>
                        )}
                      </td>
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
