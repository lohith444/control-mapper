# ControlMapper — Control Normalization & Cross-Source Matching

A full-stack application that ingests security controls from a Trust Center URL and a compliance document (PDF), normalizes them against a base control library, and identifies overlap using local parsing and heuristic-based analysis.

---

## Architecture

```
control-mapper/
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # API routes
│   ├── config.py                     # Application settings
│   └── services/
│       ├── extractor.py              # Trust center scraping + PDF parsing + local control extraction
│       ├── extraction_constants.py   # Shared extraction keywords, domain mappings, and filtering heuristics
│       ├── normalizer.py             # Semantic normalization + cross-source matching
│       ├── evaluator.py              # Evaluation suite
│       └── parsers/
│           ├── control_loader.py     # File-type routing and control ingestion
│           ├── csv_parser.py         # Flexible CSV parser with schema auto-detection
│           ├── json_parser.py        # Flexible JSON parser with schema normalization
│           ├── parser_constants.py   # Shared parser field mappings
│           └── parser_utils.py       # Shared parser helper utilities
├── frontend/                         # React frontend
│   └── src/
│       ├── components/               # IngestPanel, ResultsPanel, EvalsPanel, StatsBar
│       └── utils/                    # Sample base controls
├── evals/
│   ├── eval_script.py                # CLI evaluation runner
│   └── eval_dataset.json             # Sample evaluation dataset
└── sample_data/
    └── common_controls_sample1.csv   # Sample base control CSV (control_id, control_description)
    └── common_controls_sample2.csv   # Sample base control CSV (control_id, domain, text)
```

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone and configure

```bash
git clone <repo>
cd control-mapper
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`.

---

## Usage

### Step 1 — Ingest Trust Center
Enter a trust center URL (e.g. `https://trust.oneleet.com/novoflow?tab=securityControls`) and click **Extract Controls**. The application uses Playwright for dynamic page rendering and local semantic parsing to identify and extract security controls from trust center content.

### Step 2 — Ingest Document
Upload a SOC 2/compliance PDF or DOCX document (or any compliance document) and click **Extract Controls**.

### Step 3 — Base Control Library
Use the built-in sample NCC controls or upload your own CSV/JSON control library.

The ingestion pipeline supports flexible schemas and automatically maps common field names such as:
- `control_id`, `id`, `Control ID`
- `text`, `description`, `requirement`, `Control Description`
- `domain`, `category`, `family`

#### Example CSV formats

```csv
control_id,domain,text
NCC-1,Access Control,Multi-factor authentication is required for privileged access.
```

```csv
Control ID,Control Description
CC 6.1,Logical access to systems is restricted to authorized users.
```

```csv
ID,Category,Requirement
AC-1,Access Control,Privileged access requires MFA.
```

#### Example JSON formats

```json
[
  {
    "control_id": "NCC-1",
    "domain": "Access Control",
    "text": "Multi-factor authentication is required."
  }
]
```

```json
{
  "controls": [
    {
      "id": "CC 6.1",
      "description": "Logical access is restricted."
    }
  ]
}
```

### Step 4 — Run Analysis
Click **Run Normalization & Matching** to map controls across sources.

### Step 5 — View Results
- Filter by **domain**
- See matched controls with **full / partial** status and rationale
- Inspect unmatched source and base controls

### Step 6 — Evaluations
Click **Run Evaluations** to score extraction, mapping, and coverage quality.

---

## Running Evals (CLI)

```bash
cd evals
python eval_script.py --dataset eval_dataset.json --output results.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/extract-url` | Scrape trust center + extract controls |
| POST | `/api/extract-document` | Parse PDF + extract controls |
| POST | `/api/upload-controls` | Load base control CSV/JSON |
| POST | `/api/normalize-and-match` | Normalize and cross-match all sources |
| POST | `/api/run-evals` | Run evaluation suite |

---

## Approach

### Extraction
- **Trust Center**: Playwright and `httpx` are used to fetch and render trust center pages. `BeautifulSoup` removes non-relevant content (navigation, footer, scripts, etc.), and local heuristic/NLP-based parsing extracts structured controls with control ID, text, domain, and specificity.
- **PDF**: `pdfplumber` extracts raw text from compliance documents, followed by local semantic parsing and rule-based extraction to identify and structure controls.
- **Flexible schema ingestion**: The parser layer automatically maps heterogeneous CSV/JSON field names into a normalized internal schema. This improves usability and real-world compatibility, though highly inconsistent or ambiguous files may still require manual column mapping in future iterations.

### Normalization & Matching
Semantic normalization and matching are powered using `sentence-transformers` embeddings (`all-MiniLM-L6-v2`) with cosine similarity scoring.
The matching pipeline:
- Matches controls based on **semantic intent**, not exact keywords
- Supports **1:1, 1:many, many:1, and many:many** mappings
- Classifies mappings as **full** or **partial** based on similarity thresholds
- Generates lightweight rationale using similarity scores

### Evaluation
Evaluation is performed locally using semantic similarity and heuristic scoring across three dimensions:
- **Extraction quality**: evaluates whether extracted items resemble valid security/compliance controls
- **Mapping quality**: measures semantic similarity between mapped source and base controls
- **Coverage**: calculates source and base control coverage percentages

---

## Tradeoffs & Limitations

### Tradeoffs
- **Local semantic matching vs LLM reasoning**: The application uses `sentence-transformers` embeddings for normalization and matching, providing fast, deterministic, and cost-free semantic similarity. While this improves reliability and removes external dependencies, embedding-based matching may miss nuanced reasoning that large language models can sometimes capture.
- **Heuristic-based extraction**: Control extraction relies on local parsing, keyword heuristics, and semantic filtering. This approach is lightweight and reproducible but may occasionally extract noisy or non-control text from complex compliance documents.
- **In-memory state management**: Results are stored in React state only; refreshing the page clears extracted controls and mappings. Adding persistent storage (SQLite/Postgres) would enable saved sessions and historical analysis.
- **Similarity threshold tuning**: Full vs partial match classification is based on cosine similarity thresholds. Thresholds work well for common controls but may require tuning for different datasets or domains.
- **Flexible schema ingestion**: The parser layer automatically maps heterogeneous CSV/JSON field names into a normalized internal schema. This improves usability and real-world compatibility, though highly inconsistent or ambiguous files may still require manual column mapping in future iterations.

### Limitations
- Trust center scraping is best-effort. Some heavily JavaScript-rendered or authenticated trust portals may not expose all content consistently even with Playwright rendering.
- PDF extraction quality depends on document formatting. Scanned/image-based PDFs without embedded text are not currently supported.
- Legacy `.doc` files are not currently supported; only `.pdf` and `.docx` formats are supported.
- Embedding-based semantic matching can occasionally produce false positives for controls with overlapping terminology but different intent.
- Domain classification currently uses lightweight heuristics and keyword mapping; more advanced NLP classification could improve accuracy.
- Evaluation scores are heuristic and embedding-based rather than human-labeled benchmark scores, so they should be treated as directional quality indicators rather than absolute accuracy measurements.

### Next Improvements
1. **Advanced Playwright crawling** — improve support for complex SPA-based trust centers, lazy-loaded content, authenticated portals, and dynamic navigation flows.

2. **Embedding cache & vector indexing** — pre-compute embeddings for base controls and store them in a lightweight vector index (FAISS/Chroma) for faster large-scale semantic matching.

3. **Persistent sessions** — add SQLite/Postgres support to save extraction runs, mappings, evaluation history, and comparison snapshots over time.

4. **Bulk ingestion pipeline** — support ingesting multiple trust centers, PDFs, or control libraries in a single execution workflow.

5. **Confidence scoring** — expose normalized semantic similarity scores and configurable confidence thresholds alongside full/partial classification.

6. **Export & reporting** — generate downloadable CSV, JSON, and PDF reports containing mappings, coverage metrics, unmatched controls, and evaluation summaries.

7. **Human-in-the-loop review** — add workflows for analysts to review, approve, reject, or edit low-confidence mappings.

8. **Hybrid matching pipeline** — combine heuristic filtering, embeddings, and optional LLM refinement for ambiguous or low-confidence matches.

9. **Improved domain classification** — replace keyword-based domain assignment with ML/NLP-based multi-label classification models.

10. **OCR support for scanned PDFs** — integrate OCR (Tesseract/Azure OCR) to support image-based SOC 2 and compliance reports.

11. **Control deduplication & clustering** — cluster semantically similar controls to reduce redundancy and improve normalization quality.

12. **Streaming & async processing** — support progressive extraction and matching for very large compliance datasets.

13. **Observability & metrics** — add structured logging, tracing, and pipeline metrics for extraction accuracy, matching quality, and performance monitoring.

14. **Fine-tuned security models** — experiment with domain-specific cybersecurity embeddings/models for improved semantic matching accuracy.

15. **Interactive visualization UI** — graph-based relationship view for matched, partial, and unmatched controls across sources.

16. **Benchmark datasets & regression testing** — maintain labeled datasets and automated evaluation pipelines to measure matching quality over time.

17. **Role-based access & multi-tenancy** — support enterprise usage with authentication, user roles, and organization-level data isolation.

18. **Incremental matching workflows** — avoid recomputing embeddings/mappings for previously processed controls and only process deltas.

19. **Interactive column mapping UI** — allow users to manually map CSV/JSON fields when automatic schema detection is ambiguous.
