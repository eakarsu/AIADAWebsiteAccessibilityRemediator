import { useState } from 'react';
import {
  FiAlertTriangle, FiAlertCircle, FiInfo, FiCheckCircle,
  FiChevronDown, FiChevronUp, FiCpu, FiAward
} from 'react-icons/fi';

function SeverityBadge({ severity }) {
  const config = {
    critical: { color: '#e53e3e', bg: '#fff5f5', icon: FiAlertTriangle, label: 'Critical' },
    major: { color: '#dd6b20', bg: '#fffaf0', icon: FiAlertCircle, label: 'Major' },
    minor: { color: '#d69e2e', bg: '#fffff0', icon: FiInfo, label: 'Minor' },
    pass: { color: '#38a169', bg: '#f0fff4', icon: FiCheckCircle, label: 'Pass' },
    info: { color: '#3182ce', bg: '#ebf8ff', icon: FiInfo, label: 'Info' },
  };
  const c = config[severity] || config.info;
  const Icon = c.icon;
  return (
    <span className="severity-badge" style={{ color: c.color, backgroundColor: c.bg }}>
      <Icon size={14} />
      {c.label}
    </span>
  );
}

function ScoreBar({ score, label, maxScore = 100 }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const color = pct >= 80 ? '#38a169' : pct >= 50 ? '#d69e2e' : '#e53e3e';
  return (
    <div className="score-bar-wrapper">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color }}>{score}/{maxScore}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ExpandableCard({ title, severity, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ai-card ai-card--${severity || 'info'}`}>
      <button className="ai-card-header" onClick={() => setOpen(!open)}>
        <div className="ai-card-header-left">
          {severity && <SeverityBadge severity={severity} />}
          <h4 className="ai-card-title">{title}</h4>
        </div>
        {open ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>
      {open && <div className="ai-card-body">{children}</div>}
    </div>
  );
}

function renderValue(value, depth = 0) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const lines = value.split('\n');
    if (lines.length > 1) {
      return (
        <div className="ai-text-block">
          {lines.map((line, i) => {
            if (line.startsWith('# ')) return <h3 key={i} className="ai-heading">{line.slice(2)}</h3>;
            if (line.startsWith('## ')) return <h4 key={i} className="ai-subheading">{line.slice(3)}</h4>;
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return <li key={i} className="ai-list-item">{line.slice(2)}</li>;
            }
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="ai-paragraph">{line}</p>;
          })}
        </div>
      );
    }
    return <p className="ai-paragraph">{value}</p>;
  }

  if (typeof value === 'number') {
    return <span className="ai-number">{value}</span>;
  }

  if (typeof value === 'boolean') {
    return value ? (
      <span className="ai-bool ai-bool--true"><FiCheckCircle size={14} /> Yes</span>
    ) : (
      <span className="ai-bool ai-bool--false"><FiAlertCircle size={14} /> No</span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="ai-empty">No items</p>;

    if (typeof value[0] === 'string') {
      return (
        <ul className="ai-list">
          {value.map((item, i) => (
            <li key={i} className="ai-list-item">{item}</li>
          ))}
        </ul>
      );
    }

    return (
      <div className="ai-array">
        {value.map((item, i) => {
          if (typeof item === 'object' && item !== null) {
            const title = item.title || item.name || item.rule || item.issue || `Item ${i + 1}`;
            const severity = item.severity || item.level || item.impact;
            return (
              <ExpandableCard key={i} title={title} severity={severity} defaultOpen={i < 3}>
                {renderObject(item, depth + 1)}
              </ExpandableCard>
            );
          }
          return <div key={i} className="ai-array-item">{renderValue(item, depth + 1)}</div>;
        })}
      </div>
    );
  }

  if (typeof value === 'object') {
    return renderObject(value, depth + 1);
  }

  return <span>{String(value)}</span>;
}

function renderObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return null;

  const entries = Object.entries(obj).filter(
    ([key]) => !['id', '_id', '__v', 'createdAt', 'updatedAt'].includes(key)
  );

  const scoreEntries = entries.filter(
    ([key, val]) => typeof val === 'number' && (key.includes('score') || key.includes('Score') || key.includes('rating'))
  );
  const otherEntries = entries.filter(
    ([key, val]) => !(typeof val === 'number' && (key.includes('score') || key.includes('Score') || key.includes('rating')))
  );

  return (
    <div className="ai-object" style={{ paddingLeft: depth > 0 ? '0' : '0' }}>
      {scoreEntries.length > 0 && (
        <div className="ai-scores">
          {scoreEntries.map(([key, val]) => (
            <ScoreBar key={key} label={formatKey(key)} score={val} />
          ))}
        </div>
      )}
      {otherEntries.map(([key, val]) => {
        if (val === null || val === undefined) return null;
        const isComplex = typeof val === 'object';
        return (
          <div key={key} className={`ai-field ${isComplex ? 'ai-field--complex' : ''}`}>
            <span className="ai-field-label">{formatKey(key)}</span>
            <div className="ai-field-value">{renderValue(val, depth)}</div>
          </div>
        );
      })}
    </div>
  );
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export default function AIResultDisplay({ result }) {
  if (!result) return null;

  const data = typeof result === 'string' ? tryParseJSON(result) : result;

  return (
    <div className="ai-result-display animate-fade-in">
      <div className="ai-result-header">
        <FiCpu size={20} />
        <h3>AI Analysis Results</h3>
        <FiAward size={20} />
      </div>
      <div className="ai-result-body">
        {typeof data === 'string' ? (
          <div className="ai-text-block">
            {data.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h3 key={i} className="ai-heading">{line.slice(2)}</h3>;
              if (line.startsWith('## ')) return <h4 key={i} className="ai-subheading">{line.slice(3)}</h4>;
              if (line.startsWith('### ')) return <h5 key={i}>{line.slice(4)}</h5>;
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={i} className="ai-list-item">{line.slice(2)}</li>;
              }
              if (line.trim() === '') return <br key={i} />;
              return <p key={i} className="ai-paragraph">{line}</p>;
            })}
          </div>
        ) : (
          renderObject(data)
        )}
      </div>
    </div>
  );
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
