import React, { useState } from 'react';
import Header from './components/Header';
import IngestPanel from './components/IngestPanel';
import ResultsPanel from './components/ResultsPanel';
import EvalsPanel from './components/EvalsPanel';
import './App.css';

export const AppContext = React.createContext(null);

export default function App() {
  const [activeTab, setActiveTab] = useState('ingest');
  const [state, setState] = useState({
    trustCenterControls: [],
    documentControls: [],
    baseControls: [],
    mappings: [],
    evalResults: null,
    loading: false,
    error: null,
  });

  const updateState = (patch) => setState(prev => ({ ...prev, ...patch }));

  return (
    <AppContext.Provider value={{ state, updateState }}>
      <div className="app-shell">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="app-main">
          {activeTab === 'ingest' && <IngestPanel onComplete={() => setActiveTab('results')} />}
          {activeTab === 'results' && <ResultsPanel />}
          {activeTab === 'evals' && <EvalsPanel />}
        </main>
      </div>
    </AppContext.Provider>
  );
}
