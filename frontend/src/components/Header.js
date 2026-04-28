import React from 'react';
import { Shield, GitMerge, BarChart3 } from 'lucide-react';
import './Header.css';

const tabs = [
  { id: 'ingest', label: 'Ingest', icon: Shield },
  { id: 'results', label: 'Results', icon: GitMerge },
  { id: 'evals', label: 'Evaluations', icon: BarChart3 },
];

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-icon">
            <Shield size={16} />
          </div>
          <span className="brand-name">ControlMapper</span>
          <span className="brand-tag">v1.0</span>
        </div>
        <nav className="header-nav">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
