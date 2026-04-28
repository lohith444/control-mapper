from __future__ import annotations
from sentence_transformers import SentenceTransformer, util
import torch

model = SentenceTransformer("all-MiniLM-L6-v2")

async def normalize_and_match(
    trust_center_controls: list,
    document_controls: list,
    base_controls: list,
    domain_filter: str = None,
) -> dict:
    # Domain filtering (same as before)
    if domain_filter and domain_filter.lower() != "all":
        trust_center_controls = [
            c for c in trust_center_controls
            if c.get("domain", "").lower() == domain_filter.lower()
        ]
        document_controls = [
            c for c in document_controls
            if c.get("domain", "").lower() == domain_filter.lower()
        ]
        base_controls = [
            c for c in base_controls
            if c.get("domain", "").lower() == domain_filter.lower()
        ]
    # Merge sources
    all_source = []
    for c in trust_center_controls:
        all_source.append({**c, "source": "trust_center"})
    for c in document_controls:
        all_source.append({**c, "source": "document"})

    if not all_source or not base_controls:
        return {
            "mappings": [],
            "unmatched_source": [c["control_id"] for c in all_source],
            "unmatched_base": [c["control_id"] for c in base_controls],
            "domains": _get_domains(trust_center_controls, document_controls, base_controls),
            "stats": _compute_stats([], all_source, base_controls),
        }

    # 🔥 EMBEDDINGS
    source_texts = [c["text"] for c in all_source]
    base_texts = [c["text"] for c in base_controls]
    source_embeddings = model.encode(source_texts, convert_to_tensor=True)
    base_embeddings = model.encode(base_texts, convert_to_tensor=True)

    # Compute similarity matrix
    similarity_matrix = util.cos_sim(source_embeddings, base_embeddings)
    mappings = []
    matched_source_ids = set()
    matched_base_ids = set()
    threshold = 0.65
    full_match_threshold = 0.80
    for i, sc in enumerate(all_source):
        scores = similarity_matrix[i]
        # Get all matches above threshold
        top_matches = torch.where(scores >= threshold)[0]
        # No match found
        if len(top_matches) == 0:
            continue
        # Sort by similarity descending
        sorted_matches = sorted(
            top_matches.tolist(),
            key=lambda idx: scores[idx].item(),
            reverse=True
        )[:3]
        base_ids = []
        similarity_scores = []
        for idx in sorted_matches:
            base_ids.append(base_controls[idx]["control_id"])
            similarity_scores.append(scores[idx].item())
            matched_base_ids.add(base_controls[idx]["control_id"])
        matched_source_ids.add(sc["control_id"])
        best_score = max(similarity_scores)
        match_type = ("full" if best_score >= full_match_threshold else "partial")
        mappings.append({
            "source_control_ids": [sc["control_id"]],
            "base_control_ids": base_ids,
            "match_type": match_type,
            "rationale": f"Semantic similarity match (max cosine similarity: {best_score:.2f})"
        })
    # Unmatched
    unmatched_source = [
        c["control_id"] for c in all_source if c["control_id"] not in matched_source_ids
    ]
    unmatched_base = [
        c["control_id"] for c in base_controls if c["control_id"] not in matched_base_ids
    ]
    # Enrich mappings
    source_map = {c["control_id"]: c for c in all_source}
    base_map = {c["control_id"]: c for c in base_controls}
    enriched_mappings = []
    for m in mappings:
        enriched = {
            **m,
            "source_controls": [source_map[cid] for cid in m["source_control_ids"]],
            "base_controls": [base_map[cid] for cid in m["base_control_ids"]],
        }
        enriched_mappings.append(enriched)
    domains = _get_domains(trust_center_controls, document_controls, base_controls)
    stats = _compute_stats(enriched_mappings, all_source, base_controls)
    return {
        "mappings": enriched_mappings,
        "unmatched_source": unmatched_source,
        "unmatched_base": unmatched_base,
        "domains": domains,
        "stats": stats,
    }


def _get_domains(tc_controls, doc_controls, base_controls) -> list:
    domains = set()
    for c in tc_controls + doc_controls + base_controls:
        d = c.get("domain")
        if d:
            domains.add(d)
    return sorted(domains)


def _compute_stats(mappings, source_controls, base_controls) -> dict:
    total_source = len(source_controls)
    total_base = len(base_controls)
    matched_source = set()
    matched_base = set()
    full_count = 0
    partial_count = 0

    for m in mappings:
        for cid in m.get("source_control_ids", []):
            matched_source.add(cid)
        for cid in m.get("base_control_ids", []):
            matched_base.add(cid)
        if m.get("match_type") == "full":
            full_count += 1
        else:
            partial_count += 1

    return {
        "total_source": total_source,
        "total_base": total_base,
        "matched_source": len(matched_source),
        "matched_base": len(matched_base),
        "full_matches": full_count,
        "partial_matches": partial_count,
        "coverage_pct": round(len(matched_base) / total_base * 100, 1) if total_base else 0,
    }
