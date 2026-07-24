import { useEffect, useState } from 'react';
import { FiBook, FiSearch, FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getWcagKb } from '../../api/advanced';

const levelColors = {
  A: { bg: '#ebf8ff', color: '#2b6cb0', label: 'Level A' },
  AA: { bg: '#f0fff4', color: '#276749', label: 'Level AA' },
  AAA: { bg: '#faf5ff', color: '#553c9a', label: 'Level AAA' },
};

function CriterionCard({ item }) {
  const [open, setOpen] = useState(false);
  const lc = levelColors[item.level] || levelColors.A;

  return (
    <div className="detail-card" style={{ marginBottom: 12 }}>
      <button
        className="ai-card-header"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: lc.bg, color: lc.color, padding: '2px 8px',
            borderRadius: 4, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          }}>{item.criterion} · {lc.label}</span>
          <span style={{ fontWeight: 600, textAlign: 'left' }}>{item.title}</span>
        </div>
        {open ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>
      {open && (
        <div style={{ marginTop: 16 }}>
          {item.description && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Description</div>
              <p style={{ margin: 0 }}>{item.description}</p>
            </div>
          )}
          {item.techniques && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Techniques</div>
              <p style={{ margin: 0 }}>{item.techniques}</p>
            </div>
          )}
          {item.failure_examples && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#c53030', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Common Failures</div>
              <p style={{ margin: 0, color: '#c53030' }}>{item.failure_examples}</p>
            </div>
          )}
          {item.code_fix_template && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#276749', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Fix Template</div>
              <pre style={{
                background: '#f7f7f7', padding: '12px', borderRadius: 6,
                fontFamily: 'monospace', fontSize: 13, overflow: 'auto', margin: 0,
              }}>{item.code_fix_template}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WcagKnowledgeBasePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await getWcagKb({ page, limit: 20, q: search || undefined, level: level || undefined });
      setItems(r.data.data || []);
      setTotalPages(r.data.pagination?.totalPages || 1);
      setTotal(r.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search, level]);
  useEffect(() => { load(); }, [page, search, level]);

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiBook size={28} />
          <div>
            <h1>WCAG 2.1 Knowledge Base</h1>
            <p className="feature-page-desc">Browse success criteria, techniques, and code fix templates.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36, margin: 0 }}
            placeholder="Search criteria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ width: 140, margin: 0 }}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="A">Level A</option>
          <option value="AA">Level AA</option>
          <option value="AAA">Level AAA</option>
        </select>
      </div>

      {loading ? (
        <div className="table-loading"><div className="loading-spinner" /><p>Loading...</p></div>
      ) : items.length === 0 ? (
        <div className="table-empty">
          <FiBook size={48} />
          <h3>No criteria found</h3>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13 }}>{total} criteria</p>
          {items.map((item) => (
            <CriterionCard key={item.id} item={item} />
          ))}
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
  );
}
