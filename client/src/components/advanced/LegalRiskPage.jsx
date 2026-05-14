import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiLoader, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getLegalRisk } from '../../api/advanced';

export default function LegalRiskPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getLegalRisk();
      setData(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="loading-screen"><FiLoader className="spin" /></div>;

  const riskColor = data?.litigation_risk_score >= 70 ? '#ef4444' : data?.litigation_risk_score >= 40 ? '#f59e0b' : '#10b981';

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <FiAlertTriangle size={28} />
          <div>
            <h1>Legal Risk Dashboard</h1>
            <p className="feature-page-desc">ADA litigation risk score across all your audited sites.</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={load}><FiRefreshCw /> Refresh</button>
      </div>

      <div className="stats-grid" style={{ marginTop: 16 }}>
        <div className="stat-card" style={{ borderLeft: `4px solid ${riskColor}` }}>
          <div className="stat-info">
            <span className="stat-value" style={{ color: riskColor }}>{data?.litigation_risk_score ?? 0}</span>
            <span className="stat-label">Litigation Risk Score (0-100)</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-value">{data?.total_pages_audited ?? 0}</span>
            <span className="stat-label">Total Pages Audited</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-value">{data?.total_critical_issues ?? 0}</span>
            <span className="stat-label">Total Critical Issues</span>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Top Risk Sites</h2>
      <div className="feature-table-container">
        {(!data?.top_risk_sites || data.top_risk_sites.length === 0) ? (
          <div className="table-empty"><p>No risk data yet — run some site audits first.</p></div>
        ) : (
          <table className="feature-table">
            <thead>
              <tr><th>Title</th><th>URL</th><th>Critical Issues</th><th>Total Issues</th><th>Risk Score</th></tr>
            </thead>
            <tbody>
              {data.top_risk_sites.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></td>
                  <td>{s.critical_issues}</td>
                  <td>{s.total_issues}</td>
                  <td><strong style={{ color: s.risk_score >= 70 ? '#ef4444' : s.risk_score >= 40 ? '#f59e0b' : '#10b981' }}>{s.risk_score}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
