import React, { useState, useContext, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Globe, FileText, Database, ChevronRight, CheckCircle, Loader, Upload, X, Zap } from 'lucide-react';
import axios from 'axios';
import { AppContext } from '../App';
import { SAMPLE_BASE_CONTROLS } from '../utils/sampleData';
import './IngestPanel.css';

const API = 'http://localhost:8000';

export default function IngestPanel({ onComplete }) {
  const { state, updateState } = useContext(AppContext);
  const [trustUrl, setTrustUrl] = useState('https://trust.oneleet.com/novoflow?tab=securityControls');
  const [docFile, setDocFile] = useState(null);
  const [baseFile, setBaseFile] = useState(null);
  const [useSampleBase, setUseSampleBase] = useState(true);

  const [urlStatus, setUrlStatus] = useState(null);   // null | 'loading' | 'done' | 'error'
  const [docStatus, setDocStatus] = useState(null);
  const [matchStatus, setMatchStatus] = useState(null);
  const [urlError, setUrlError] = useState('');
  const [docError, setDocError] = useState('');
  const [matchError, setMatchError] = useState('');

  const onDropDoc = useCallback(files => { if (files[0]) setDocFile(files[0]); }, []);
  const onDropBase = useCallback(files => { if (files[0]) setBaseFile(files[0]); }, []);

  const {
    getRootProps: getDocProps,
    getInputProps: getDocInput,
    isDragActive: isDocDrag
  } = useDropzone({
    onDrop: onDropDoc,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    onDropRejected: () => {
      alert("Only PDF and DOCX files are supported.");
    }
  });

  const { getRootProps: getBaseProps, getInputProps: getBaseInput, isDragActive: isBaseDrag } = useDropzone({
    onDrop: onDropBase, accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] }, maxFiles: 1
  });

  const extractUrl = async () => {
    if (!trustUrl.trim()) return;
    setUrlStatus('loading'); setUrlError('');
    try {
      const res = await axios.post(`${API}/api/extract-url`, { url: trustUrl });
      updateState({ trustCenterControls: res.data.controls });
      setUrlStatus('done');
    } catch (e) {
      setUrlError(e.response?.data?.detail || e.message);
      setUrlStatus('error');
    }
  };

  const extractDoc = async () => {
    if (!docFile) return;
    setDocStatus('loading'); setDocError('');
    const form = new FormData();
    form.append('file', docFile);
    try {
      const res = await axios.post(`${API}/api/extract-document`, form);
      updateState({ documentControls: res.data.controls });
      setDocStatus('done');
    } catch (e) {
      setDocError(e.response?.data?.detail || e.message);
      setDocStatus('error');
    }
  };

  const runMatch = async () => {
    setMatchStatus('loading'); setMatchError('');
    let baseControls = state.baseControls;

    if (useSampleBase) {
      baseControls = SAMPLE_BASE_CONTROLS;
      updateState({ baseControls });
    } else if (baseFile) {
      const form = new FormData();
      form.append('file', baseFile);
      try {
        const res = await axios.post(`${API}/api/upload-controls`, form);
        baseControls = res.data.controls;
        updateState({ baseControls });
      } catch (e) {
        setMatchError('Failed to load base controls: ' + (e.response?.data?.detail || e.message));
        setMatchStatus('error');
        return;
      }
    }

    try {
      const res = await axios.post(`${API}/api/normalize-and-match`, {
        trust_center_controls: state.trustCenterControls,
        document_controls: state.documentControls,
        base_controls: baseControls,
      });
      updateState({ mappings: res.data });
      setMatchStatus('done');
      setTimeout(onComplete, 600);
    } catch (e) {
      setMatchError(e.response?.data?.detail || e.message);
      setMatchStatus('error');
    }
  };

  const hasTrustControls = (state.trustCenterControls?.length || 0) > 0;
  const hasDocControls = (state.documentControls?.length || 0) > 0;
  const hasBaseControls = useSampleBase || !!baseFile;

  const canMatch =
    hasTrustControls &&
    hasDocControls &&
    hasBaseControls;

  return (
    <div className="ingest-layout">
      <div className="ingest-intro">
        <h1 className="ingest-title">Control Normalization<br />&amp; Cross-Source Matching</h1>
        <p className="ingest-subtitle">Ingest controls from multiple sources, normalize semantically, and identify overlap.</p>
      </div>

      <div className="ingest-grid">
        {/* Step 1: Trust Center */}
        <div className="ingest-card">
          <div className="ingest-card-header">
            <div className="step-num">01</div>
            <Globe size={16} className="step-icon" />
            <span className="step-label">Trust Center URL</span>
            {urlStatus === 'done' && <CheckCircle size={14} className="status-done" />}
          </div>
          <div className="ingest-card-body">
            <label className="label">Trust Center URL</label>
            <input
              className="input-field"
              value={trustUrl}
              onChange={e => setTrustUrl(e.target.value)}
              placeholder="https://trust.example.com/controls"
            />
            {urlStatus === 'done' && (
              <div className="success-box mt-12">
                ✓ Extracted {state.trustCenterControls.length} controls
              </div>
            )}
            {urlError && <div className="error-box mt-12">{urlError}</div>}
          </div>
          <div className="ingest-card-footer">
            <button
              className="btn btn-primary"
              onClick={extractUrl}
              disabled={urlStatus === 'loading' || !trustUrl.trim()}
            >
              {urlStatus === 'loading' ? <><div className="spinner" /> Extracting…</> : <>Extract Controls</>}
            </button>
          </div>
        </div>

        {/* Step 2: Document */}
        <div className="ingest-card">
          <div className="ingest-card-header">
            <div className="step-num">02</div>
            <FileText size={16} className="step-icon" />
            <span className="step-label">SOC 2 / Compliance Document</span>
            {docStatus === 'done' && <CheckCircle size={14} className="status-done" />}
          </div>
          <div className="ingest-card-body">
            <label className="label">Upload PDF or DOCX</label>
            <div {...getDocProps()} className={`dropzone ${isDocDrag ? 'drag' : ''} ${docFile ? 'has-file' : ''}`}>
              <input {...getDocInput()} />
              {docFile ? (
                <div className="dropzone-file">
                  <FileText size={16} />
                  <span>{docFile.name}</span>
                  <button className="remove-file" onClick={e => { e.stopPropagation(); setDocFile(null); setDocStatus(null); }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="dropzone-empty">
                  <Upload size={20} />
                  <span>Drop PDF / DOCX here or click to browse</span>
                </div>
              )}
            </div>
            {docStatus === 'done' && (
              <div className="success-box mt-12">
                ✓ Extracted {state.documentControls.length} controls
              </div>
            )}
            {docError && <div className="error-box mt-12">{docError}</div>}
          </div>
          <div className="ingest-card-footer">
            <button
              className="btn btn-primary"
              onClick={extractDoc}
              disabled={docStatus === 'loading' || !docFile}
            >
              {docStatus === 'loading' ? <><div className="spinner" /> Extracting…</> : <>Extract Controls</>}
            </button>
          </div>
        </div>

        {/* Step 3: Base Controls */}
        <div className="ingest-card">
          <div className="ingest-card-header">
            <div className="step-num">03</div>
            <Database size={16} className="step-icon" />
            <span className="step-label">Base Control Library</span>
          </div>
          <div className="ingest-card-body">
            <div className="toggle-row">
              <button
                className={`toggle-btn ${useSampleBase ? 'active' : ''}`}
                onClick={() => setUseSampleBase(true)}
              >
                Use Built-in (20 NCC controls)
              </button>
              <button
                className={`toggle-btn ${!useSampleBase ? 'active' : ''}`}
                onClick={() => setUseSampleBase(false)}
              >
                Upload Custom
              </button>
            </div>
            {!useSampleBase && (
              <div className="mt-12">
                <label className="label">Upload CSV or JSON</label>
                <div {...getBaseProps()} className={`dropzone ${isBaseDrag ? 'drag' : ''} ${baseFile ? 'has-file' : ''}`}>
                  <input {...getBaseInput()} />
                  {baseFile ? (
                    <div className="dropzone-file">
                      <Database size={16} />
                      <span>{baseFile.name}</span>
                      <button className="remove-file" onClick={e => { e.stopPropagation(); setBaseFile(null); }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-empty">
                      <Upload size={20} />
                      <span>Drop CSV/JSON here</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {useSampleBase && (
              <div className="sample-controls-info">
                <div className="sample-domains">
                  {['Access Control','Encryption','Logging','Vulnerability Mgmt','Incident Response','+ 5 more'].map(d => (
                    <span key={d} className="domain-chip">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Run Analysis */}
      <div className="run-section">
        {matchError && <div className="error-box mb-16">{matchError}</div>}
        <button
          className="btn btn-run"
          onClick={runMatch}
          disabled={!canMatch || matchStatus === 'loading'}
        >
          {matchStatus === 'loading' ? (
            <><div className="spinner" /> Normalizing &amp; Matching…</>
          ) : matchStatus === 'done' ? (
            <><CheckCircle size={16} /> Done! Loading results…</>
          ) : (
            <><Zap size={16} /> Run Normalization &amp; Matching<ChevronRight size={16} /></>
          )}
        </button>
        {!canMatch && (
          <p className="run-hint">Complete steps 01 and 02 first to enable matching</p>
        )}
      </div>
    </div>
  );
}
