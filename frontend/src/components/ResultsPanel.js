import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Filter, ArrowRight, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, GitMerge } from 'lucide-react';
import StatsBar from './StatsBar';
import './ResultsPanel.css';

export default function ResultsPanel() {
  const { state } = useContext(AppContext);
  const [domain, setDomain] = useState('All');
  const [expanded, setExpanded] = useState({});

  if (!state.mappings) {
    return (
      <div className="empty-state">
        <GitMerge size={40} />
        <h2>No results yet</h2>
        <p>Go to the Ingest tab to extract and match controls.</p>
      </div>
    );
  }

  const { mappings, unmatched_source, unmatched_base, domains, stats } = state.mappings;

  const allDomains = ['All', ...(domains || [])];

  const filteredMappings = domain === 'All'
    ? mappings
    : mappings.filter(m =>
        m.source_controls?.some(c => c.domain === domain) ||
        m.base_controls?.some(c => c.domain === domain)
      );

  const filteredUnmatchedSource = domain === 'All'
    ? unmatched_source
    : unmatched_source.filter(id => {
        const c = [...state.trustCenterControls, ...state.documentControls].find(x => x.control_id === id);
        return c?.domain === domain;
      });

  const filteredUnmatchedBase = domain === 'All'
    ? unmatched_base
    : unmatched_base.filter(id => {
        const c = state.baseControls.find(x => x.control_id === id);
        return c?.domain === domain;
      });

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="results-layout">
      <StatsBar stats={stats} />

      {/* Domain Filter */}
      <div className="domain-filter-row">
        <Filter size={13} className="filter-icon" />
        <span className="filter-label">Domain:</span>
        <div className="domain-pills">
          {allDomains.map(d => (
            <button
              key={d}
              className={`domain-pill ${domain === d ? 'active' : ''}`}
              onClick={() => setDomain(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Mappings */}
      <section className="results-section">
        <div className="section-header">
          <span className="section-title">Matched Controls</span>
          <span className="section-count">{filteredMappings.length}</span>
        </div>

        {filteredMappings.length === 0 ? (
          <div className="empty-section">No matched controls for this domain</div>
        ) : (
          <div className="mapping-list">
            {filteredMappings.map((m, i) => {
              const key = `m-${i}`;
              const isOpen = expanded[key];
              return (
                <div key={key} className={`mapping-card match-${m.match_type}`}>
                  <button className="mapping-header" onClick={() => toggle(key)}>
                    <div className="mapping-ids">
                      <span className="id-list source-ids">
                        {m.source_control_ids?.map(id => (
                          <span key={id} className={`id-chip ${id.startsWith('TC') ? 'tc' : 'doc'}`}>{id}</span>
                        ))}
                      </span>
                      <ArrowRight size={14} className="arrow" />
                      <span className="id-list base-ids">
                        {m.base_control_ids?.map(id => (
                          <span key={id} className="id-chip base">{id}</span>
                        ))}
                      </span>
                    </div>
                    <div className="mapping-meta">
                      <span className={`badge badge-${m.match_type}`}>
                        {m.match_type === 'full' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                        {m.match_type}
                      </span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mapping-detail fade-in">
                      <div className="detail-grid">
                        <div className="detail-col">
                          <div className="detail-col-label">Source Controls</div>
                          {m.source_controls?.map(c => (
                            <div key={c.control_id} className="control-card">
                              <div className="control-card-header">
                                <span className={`badge badge-${c.source === 'trust_center' ? 'tc' : 'doc'}`}>
                                  {c.source === 'trust_center' ? 'Trust Center' : 'Document'}
                                </span>
                                <span className="ctrl-id">{c.control_id}</span>
                                {c.domain && <span className="ctrl-domain">{c.domain}</span>}
                              </div>
                              <p className="control-text">{c.text}</p>
                            </div>
                          ))}
                        </div>
                        <div className="detail-divider" />
                        <div className="detail-col">
                          <div className="detail-col-label">Normalized Common Controls</div>
                          {m.base_controls?.map(c => (
                            <div key={c.control_id} className="control-card base-card">
                              <div className="control-card-header">
                                <span className="badge" style={{background:'rgba(255,255,255,0.06)',color:'var(--text2)',border:'1px solid var(--border)'}}>Base</span>
                                <span className="ctrl-id">{c.control_id}</span>
                                {c.domain && <span className="ctrl-domain">{c.domain}</span>}
                              </div>
                              <p className="control-text">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rationale-box">
                        <span className="rationale-label">Rationale</span>
                        <p>{m.rationale}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unmatched Source */}
      {filteredUnmatchedSource.length > 0 && (
        <section className="results-section">
          <div className="section-header">
            <span className="section-title">Unmatched Source Controls</span>
            <span className="section-count unmatched">{filteredUnmatchedSource.length}</span>
          </div>
          <div className="unmatched-grid">
            {filteredUnmatchedSource.map(id => {
              const c = [...state.trustCenterControls, ...state.documentControls].find(x => x.control_id === id);
              return (
                <div key={id} className="unmatched-card">
                  <div className="unmatched-card-header">
                    <span className={`badge badge-${c?.source === 'trust_center' ? 'tc' : 'doc'}`}>
                      {c?.source === 'trust_center' ? 'Trust Center' : 'Document'}
                    </span>
                    <span className="ctrl-id">{id}</span>
                    <span className="badge badge-unmatched">unmatched</span>
                  </div>
                  <p className="control-text">{c?.text || id}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Unmatched Base */}
      {filteredUnmatchedBase.length > 0 && (
        <section className="results-section">
          <div className="section-header">
            <span className="section-title">Unmatched Base Controls</span>
            <span className="section-count unmatched">{filteredUnmatchedBase.length}</span>
          </div>
          <div className="unmatched-grid">
            {filteredUnmatchedBase.map(id => {
              const c = state.baseControls.find(x => x.control_id === id);
              return (
                <div key={id} className="unmatched-card base-unmatched">
                  <div className="unmatched-card-header">
                    <span className="ctrl-id">{id}</span>
                    <span className="badge badge-unmatched">no source match</span>
                  </div>
                  <p className="control-text">{c?.text || id}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
