// Recursive JSON viewer used by advanced pages

function fmt(k) {
  return String(k).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function JsonView({ data, level = 0 }) {
  if (data === null || data === undefined) return <span className="json-null">—</span>;
  if (typeof data === 'string') {
    if (data.length > 200) {
      return <pre className="json-pre">{data}</pre>;
    }
    return <span className="json-string">{data}</span>;
  }
  if (typeof data === 'number') return <span className="json-number">{data}</span>;
  if (typeof data === 'boolean') {
    return (
      <span className={`json-bool ${data ? 'json-bool-true' : 'json-bool-false'}`}>
        {data ? 'Yes' : 'No'}
      </span>
    );
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="json-empty">Empty list</span>;
    return (
      <div className="json-array">
        {data.map((item, i) => (
          <div key={i} className="json-array-item">
            <span className="json-index">[{i}]</span>
            <JsonView data={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof data === 'object') {
    return (
      <div className="json-object" style={{ paddingLeft: level === 0 ? 0 : 12 }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="json-prop">
            <span className="json-key">{fmt(key)}:</span>
            <span className="json-value">
              <JsonView data={value} level={level + 1} />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(data)}</span>;
}
