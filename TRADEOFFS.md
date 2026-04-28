# Tradeoffs, Limitations & Next Improvements

## Design Decisions

### Why sentence-transformers for semantic matching?
Control normalization and matching is fundamentally a semantic understanding problem. Controls such as "Admins must use MFA" and "Privileged access requires a second factor" may use very different wording while representing the same security intent.

The application uses lightweight transformer embeddings (`sentence-transformers`, `all-MiniLM-L6-v2`) with cosine similarity scoring to perform deterministic semantic normalization locally without external APIs. This approach provides:
- fast execution
- deterministic results
- no API cost or rate limits
- fully offline execution

The tradeoff is that embedding-based similarity may miss deeper contextual reasoning that large language models can sometimes capture for highly nuanced controls.

### Local heuristic and parser-based extraction
Control extraction uses Playwright/httpx scraping, PDF parsing, and local heuristic/NLP-based filtering to identify likely security and compliance controls. This keeps the system simple, reproducible, and inexpensive to run.

The downside is that heuristic extraction may occasionally:
- extract noisy/legal text
- miss implicitly stated controls
- struggle with poorly formatted PDFs

More advanced NLP classification or hybrid extraction pipelines could improve precision and recall.

### Flexible schema ingestion
Compliance control libraries often come in inconsistent CSV/JSON formats with varying field names such as "Control ID", "Requirement", "Description", or "Category".

To improve interoperability, the ingestion layer performs lightweight schema normalization and automatic field detection across uploaded CSV and JSON files. This enables the application to support heterogeneous customer control libraries without requiring strict formatting.

The tradeoff is that highly ambiguous or inconsistent schemas may still require manual field mapping in future iterations.

### In-memory React state (no database)
Keeping all session state in React memory makes the application lightweight and zero-configuration — no database setup is required.

The downside is that results are lost on page refresh or restart. A lightweight SQLite/Postgres backend would enable:
- saved sessions
- historical comparisons
- audit trails
- multi-user workflows

---

## Limitations

### JavaScript-heavy trust centers
The application uses Playwright for rendering dynamic pages and `BeautifulSoup` for HTML parsing. While this works well for most trust centers, some highly dynamic or authenticated portals may still expose incomplete content.

### Heuristic extraction quality
The current extraction pipeline relies on keyword heuristics and semantic filtering. Some extracted text may not represent true security controls, especially in large legal/compliance documents with disclaimers or audit boilerplate.

### Embedding similarity limitations
Embedding-based semantic matching can occasionally generate:
- false positives for controls with overlapping terminology
- false negatives for highly domain-specific language

Threshold tuning improves quality but cannot fully eliminate ambiguity.

### No OCR support
The current PDF parser supports text-based PDFs only. Scanned/image-based SOC 2 reports are not currently supported.

### No confidence calibration
Mappings are classified as "full" or "partial" using cosine similarity thresholds, but similarity scores are not yet calibrated against a human-labeled benchmark dataset.

### Large document scaling
Very large compliance documents may increase processing time due to embedding generation and semantic similarity computations. Incremental chunking and vector indexing would improve scalability.

### Automatic schema detection ambiguity
The parser layer uses heuristic-based field detection to infer control ID, description, and domain fields from uploaded CSV/JSON files. While this works well for common compliance exports, highly customized schemas may occasionally map fields incorrectly.

---

## Next Improvements (Prioritized)

### High impact, low effort
1. **Improved Playwright crawling** — Add support for lazy loading, pagination, and authenticated trust portals.
2. **Confidence scores** — Expose normalized semantic similarity scores alongside full/partial classification.
3. **Export support** — Allow exporting mappings and evaluation results as CSV, JSON, or PDF.
4. **Better filtering heuristics** — Reduce noisy extraction from legal disclaimers and audit boilerplate.
5. **Interactive field mapping UI** — Allow users to manually map CSV/JSON fields when automatic schema detection is ambiguous.

### High impact, moderate effort
5. **Vector indexing (FAISS/Chroma)** — Pre-compute and cache embeddings for faster large-scale matching.
6. **Persistent storage with SQLite/Postgres** — Save extraction runs, mappings, evaluations, and historical snapshots.
7. **Human-in-the-loop review workflow** — Flag low-confidence mappings for manual analyst review and correction.
8. **OCR support** — Add Tesseract/Azure OCR support for scanned compliance reports.

### Longer term
9. **Hybrid semantic pipeline** — Combine embeddings with optional LLM refinement for ambiguous mappings.
10. **Structured control ontology** — Map controls to frameworks such as NIST CSF, ISO 27001, and SOC 2 criteria.
11. **Bulk ingestion & benchmarking** — Process multiple trust centers simultaneously and compare control coverage across vendors.
12. **Change detection** — Re-scan trust centers periodically and identify added, removed, or modified controls.
13. **Interactive graph visualization** — Visualize relationships between normalized controls, mappings, and domains.
14. **Benchmark datasets & regression testing** — Maintain labeled datasets for measuring extraction and matching quality over time.