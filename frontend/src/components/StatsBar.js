import React from 'react';
import './StatsBar.css';

export default function StatsBar({ stats }) {
  if (!stats) return null;
  const {
    total_source, total_base, matched_source, matched_base,
    full_matches, partial_matches, coverage_pct
  } = stats;

  const tiles = [
    { label: 'Source Controls', value: total_source, sub: `${matched_source} matched` },
    { label: 'Base Controls', value: total_base, sub: `${matched_base} matched` },
    { label: 'Full Matches', value: full_matches, color: 'var(--full)' },
    { label: 'Partial Matches', value: partial_matches, color: 'var(--partial)' },
    { label: 'Coverage', value: `${coverage_pct}%`, color: coverage_pct >= 70 ? 'var(--full)' : 'var(--partial)', big: true },
  ];

  return (
    <div className="stats-bar">
      {tiles.map((t, i) => (
        <div key={i} className="stat-tile">
          <div className="stat-value" style={t.color ? { color: t.color } : {}}>
            {t.value}
          </div>
          <div className="stat-label">{t.label}</div>
          {t.sub && <div className="stat-sub">{t.sub}</div>}
        </div>
      ))}
      <div className="stat-tile coverage-bar-tile">
        <div className="stat-label" style={{ marginBottom: 8 }}>Base Control Coverage</div>
        <div className="coverage-track">
          <div
            className="coverage-fill"
            style={{ width: `${Math.min(coverage_pct, 100)}%`, background: coverage_pct >= 70 ? 'var(--full)' : 'var(--partial)' }}
          />
        </div>
        <div className="stat-sub">{matched_base} of {total_base} base controls matched</div>
      </div>
    </div>
  );
}
