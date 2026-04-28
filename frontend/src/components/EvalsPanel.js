import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import axios from 'axios';
import { BarChart3, Play, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import './EvalsPanel.css';

const API = '';

export default function EvalsPanel() {
  const { state, updateState } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const evals = state.evalResults;

  const runEvals = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/api/run-evals`, {
        trust_center_controls: state.trustCenterControls,
        document_controls: state.documentControls,
        mappings: state.mappings?.mappings || [],
        base_controls: state.baseControls,
      });
      updateState({ evalResults: res.data });
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    }
    setLoading(false);
  };

  const domainData = evals?.domain_distribution
    ? Object.entries(evals.domain_distribution.source || {}).map(([name, count]) => ({
        name: name.length > 15 ? name.slice(0, 13) + '…' : name,
        source: count,
        base: evals.domain_distribution.base?.[name] || 0,
      }))
    : [];

  const radarData = evals ? [
    { subject: 'Extraction', score: evals.extraction?.score || 0 },
    { subject: 'Mapping', score: evals.mapping?.score || 0 },
    { subject: 'Coverage', score: evals.coverage?.score || 0 },
  ] : [];

  return (
    <div className="evals-layout">
      <div className="evals-header">
        <div>
          <h2 className="evals-title">Evaluation Suite</h2>
          <p className="evals-sub">Measure extraction, normalization, and matching quality</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={runEvals}
          disabled={loading || !state.mappings}
        >
          {loading ? <><div className="spinner" /> Running…</> : <><Play size={14} /> Run Evaluations</>}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!state.mappings && (
        <div className="empty-state">
          <BarChart3 size={40} />
          <h2>Run matching first</h2>
          <p>Complete the Ingest step to enable evaluations.</p>
        </div>
      )}

      {evals && (
        <div className="evals-grid fade-in">
          {/* Overall Grade */}
          <div className="eval-hero">
            <div className="grade-display">
              <span className="grade-letter" style={{ color: gradeColor(evals.grade) }}>{evals.grade}</span>
              <div>
                <div className="grade-score">{evals.overall_score}/100</div>
                <div className="grade-label">Overall Score</div>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="eval-card chart-card">
            <div className="eval-card-title">Score Breakdown</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text3)', fontSize: 12 }} />
                <Radar dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Extraction Score */}
          <ScoreCard
            title="Extraction Quality"
            score={evals.extraction?.score}
            notes={evals.extraction?.notes}
            issues={evals.extraction?.issues}
            meta={`${evals.extraction?.sample_count} controls evaluated`}
          />

          {/* Mapping Score */}
          <ScoreCard
            title="Mapping Quality"
            score={evals.mapping?.score}
            notes={evals.mapping?.notes}
            issues={evals.mapping?.issues}
            meta={`${evals.mapping?.total_mappings} mappings evaluated`}
          />

          {/* Coverage */}
          <div className="eval-card">
            <div className="eval-card-title">Coverage Breakdown</div>
            <div className="coverage-grid">
              <CovRow label="Source Coverage" value={evals.coverage?.source_coverage_pct} />
              <CovRow label="Base Coverage" value={evals.coverage?.base_coverage_pct} />
            </div>
            <div className="coverage-counts">
              <span>{evals.coverage?.matched_source}/{evals.coverage?.total_source} source matched</span>
              <span>{evals.coverage?.matched_base}/{evals.coverage?.total_base} base matched</span>
            </div>
          </div>

          {/* Domain Distribution */}
          {domainData.length > 0 && (
            <div className="eval-card span-full chart-card">
              <div className="eval-card-title">Domain Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={domainData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Bar dataKey="source" name="Source" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="base" name="Base" fill="var(--accent4)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ title, score, notes, issues, meta }) {
  return (
    <div className="eval-card">
      <div className="eval-card-title">{title}</div>
      <div className="score-row">
        <span className="score-num" style={{ color: scoreColor(score) }}>{score}</span>
        <span className="score-denom">/100</span>
        <div className="score-bar-wrap">
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${score}%`, background: scoreColor(score) }} />
          </div>
        </div>
      </div>
      {notes && <p className="eval-notes">{notes}</p>}
      {meta && <p className="eval-meta">{meta}</p>}
      {issues && issues.length > 0 && (
        <div className="eval-issues">
          {issues.map((iss, i) => (
            <div key={i} className="issue-item">
              <AlertCircle size={12} />
              <span>{iss}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CovRow({ label, value }) {
  return (
    <div className="cov-row">
      <span className="cov-label">{label}</span>
      <div className="cov-track">
        <div className="cov-fill" style={{ width: `${value}%`, background: value >= 70 ? 'var(--full)' : 'var(--partial)' }} />
      </div>
      <span className="cov-val" style={{ color: value >= 70 ? 'var(--full)' : 'var(--partial)' }}>{value}%</span>
    </div>
  );
}

function gradeColor(g) {
  if (g === 'A') return 'var(--full)';
  if (g === 'B') return '#34d399';
  if (g === 'C') return 'var(--partial)';
  return 'var(--unmatched)';
}

function scoreColor(s) {
  if (!s) return 'var(--text3)';
  if (s >= 80) return 'var(--full)';
  if (s >= 60) return 'var(--partial)';
  return 'var(--unmatched)';
}
