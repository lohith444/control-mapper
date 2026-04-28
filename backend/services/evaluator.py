from __future__ import annotations
from sentence_transformers import SentenceTransformer, util
import torch

model = SentenceTransformer("all-MiniLM-L6-v2")

async def run_evals(
    trust_center_controls: list,
    document_controls: list,
    mappings: list,
    base_controls: list,
) -> dict:
    """Run evaluation suite."""
    all_source = trust_center_controls + document_controls
    results = {}

    # 1. Extraction Quality
    results["extraction"] = await _eval_extraction(all_source)

    # 2. Mapping Quality
    results["mapping"] = await _eval_mappings(mappings, base_controls)

    # 3. Coverage Stats
    results["coverage"] = _eval_coverage(mappings, all_source, base_controls)

    # 4. Domain Distribution
    results["domain_distribution"] = _eval_domains(all_source, base_controls)

    # 5. Overall Score
    ext_score = results["extraction"].get("score", 0)
    map_score = results["mapping"].get("score", 0)
    cov_score = results["coverage"].get("score", 0)
    results["overall_score"] = round((ext_score + map_score + cov_score) / 3, 1)
    results["grade"] = _score_to_grade(results["overall_score"])

    return results


async def _eval_extraction(controls: list[dict]) -> dict:

    if not controls:
        return {
            "score": 0,
            "issues": ["No controls extracted"],
            "sample_count": 0
        }

    security_keywords = [
        "access", "authentication", "authorization",
        "encrypt", "logging", "monitoring",
        "incident", "vulnerability", "backup",
        "compliance", "security", "data"
    ]

    valid_controls = 0
    unclear_controls = []

    for c in controls:

        text = c.get("text", "").lower()

        keyword_hits = sum(
            1 for k in security_keywords if k in text
        )

        if keyword_hits >= 1:
            valid_controls += 1
        else:
            unclear_controls.append(c.get("control_id"))

    relevance_score = (
        valid_controls / len(controls)
    ) * 100

    return {
        "score": round(relevance_score, 1),
        "issues": (
            ["Some extracted items may not be security controls"]
            if unclear_controls else []
        ),
        "notes": "Keyword-based extraction quality evaluation",
        "sample_count": len(controls),
        "low_confidence_controls": unclear_controls[:10]
    }


async def _eval_mappings(
    mappings: list[dict],
    base_controls: list[dict]
) -> dict:

    if not mappings:
        return {
            "score": 0,
            "issues": ["No mappings produced"],
            "total_mappings": 0
        }

    similarity_scores = []
    weak_mappings = []

    for m in mappings:

        source_texts = [
            c.get("text", "")
            for c in m.get("source_controls", [])
        ]

        base_texts = [
            c.get("text", "")
            for c in m.get("base_controls", [])
        ]

        if not source_texts or not base_texts:
            continue

        source_embedding = model.encode(
            " ".join(source_texts),
            convert_to_tensor=True
        )

        base_embedding = model.encode(
            " ".join(base_texts),
            convert_to_tensor=True
        )

        score = util.cos_sim(
            source_embedding,
            base_embedding
        ).item()

        similarity_scores.append(score)

        if score < 0.60:
            weak_mappings.append({
                "source_ids": m.get("source_control_ids", []),
                "base_ids": m.get("base_control_ids", []),
                "score": round(score, 2)
            })

    avg_score = (
        sum(similarity_scores) / len(similarity_scores)
        if similarity_scores else 0
    )

    final_score = round(avg_score * 100, 1)

    return {
        "score": final_score,
        "issues": (
            ["Some mappings have weak semantic similarity"]
            if weak_mappings else []
        ),
        "notes": "Embedding cosine similarity evaluation",
        "total_mappings": len(mappings),
        "average_similarity": round(avg_score, 2),
        "weak_mappings": weak_mappings[:5]
    }


def _eval_coverage(mappings, source_controls, base_controls) -> dict:
    matched_source = set()
    matched_base = set()
    for m in mappings:
        for cid in m.get("source_control_ids", []):
            matched_source.add(cid)
        for cid in m.get("base_control_ids", []):
            matched_base.add(cid)

    source_cov = len(matched_source) / len(source_controls) * 100 if source_controls else 0
    base_cov = len(matched_base) / len(base_controls) * 100 if base_controls else 0
    score = round((source_cov + base_cov) / 2, 1)

    return {
        "score": score,
        "source_coverage_pct": round(source_cov, 1),
        "base_coverage_pct": round(base_cov, 1),
        "matched_source": len(matched_source),
        "total_source": len(source_controls),
        "matched_base": len(matched_base),
        "total_base": len(base_controls),
    }


def _eval_domains(source_controls, base_controls) -> dict:
    source_domains = {}
    for c in source_controls:
        d = c.get("domain", "Unknown")
        source_domains[d] = source_domains.get(d, 0) + 1

    base_domains = {}
    for c in base_controls:
        d = c.get("domain", "Unknown")
        base_domains[d] = base_domains.get(d, 0) + 1

    return {
        "source": source_domains,
        "base": base_domains,
    }


def _score_to_grade(score: float) -> str:
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"
