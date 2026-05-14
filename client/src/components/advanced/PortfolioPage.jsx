import { useEffect, useState } from 'react';
import { FiGrid, FiAlertTriangle, FiAward, FiLoader, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getPortfolio } from '../../api/advanced';

const bandColor = (band) => ({
  AAA: '#10b981', AA: '#22c55e', A: '#f59e0b', below_A: '#ef4444', unknown: '#94a3b8',
}[band] || '#94a3b8');

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getPortfolio();
      setData(r.data);
    } catch (e) {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-screen"><FiLoader className="spin" /></div>;

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiGrid size={28} />
          <div>
            <h1>Multi-Site Portfolio Scorecard</h1>
            <p className="feature-page-desc">Monitor all your audited sites; alerts when any drops below AA compliance.</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={load}><FiRefreshCw /> Refresh</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon"><FiGrid size={28} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.total_sites ?? 0}</span>
            <span className="stat-label">Total Sites</span>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-icon"><FiAward size={28} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.average_score ?? '—'}</span>
            <span className="stat-label">Average Score</span>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <div className="stat-icon"><FiAlertTriangle size={28} /></div>
          <div className="stat-info">
            <span className="stat-value">{data?.below_aa_count ?? 0}</span>
            <span className="stat-label">Sites Below AA</span>
          </div>
        </div>
      </div>

      {data?.alerts?.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>Alerts</h2>
          <div className="feature-table-container">
            <table className="feature-table">
              <thead><tr><th>Title</th><th>URL</th><th>Score</th><th>Message</th></tr></thead>
              <tbody>
                {data.alerts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.url}</td>
                    <td><strong style={{ color: '#ef4444' }}>{a.score}</strong></td>
                    <td>{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ marginTop: 32 }}>All Sites</h2>
      <div className="feature-table-container">
        {(!data?.sites || data.sites.length === 0) ? (
          <div className="table-empty"><h3>No sites audited yet</h3></div>
        ) : (
          <table className="feature-table">
            <thead><tr><th>Title</th><th>URL</th><th>Band</th><th>Score</th><th>Issues</th><th>Critical</th><th>Last Scan</th></tr></thead>
            <tbody>
              {data.sites.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></td>
                  <td><span className="status-badge" style={{ background: `${bandColor(s.band)}22`, color: bandColor(s.band) }}>{s.band}</span></td>
                  <td><strong>{s.score ?? '—'}</strong></td>
                  <td>{s.issues}</td>
                  <td>{s.critical}</td>
                  <td>{new Date(s.last_scanned).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
