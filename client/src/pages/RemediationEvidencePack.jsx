import { useEffect, useState } from 'react';

export default function RemediationEvidencePack() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/remediation-evidence-pack')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="page">
      <h1>Remediation Evidence Pack</h1>
      <p>Assemble WCAG evidence, verification proofs, and reviewer-ready remediation records.</p>
      <div className="grid">
        {data && Object.entries(data.summary).map(([key, value]) => (
          <div className="card" key={key}>
            <h3>{key.replaceAll('_', ' ')}</h3>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="card">
        {(data?.evidence || []).map((item) => (
          <div key={`${item.page}-${item.wcag}`} style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
            <strong>{item.page}</strong>
            <div>{item.issue} - {item.wcag} - {item.proof} - {item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
