#!/usr/bin/env python3
"""
Evaluation script for Control Normalization & Cross-Source Matching.
Usage: python eval_script.py --dataset eval_dataset.json
"""
import argparse
import json
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../backend")

from services.evaluator import run_evals


def load_dataset(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


async def main(dataset_path: str, output_path: str | None = None):
    print(f"Loading eval dataset from: {dataset_path}")
    data = load_dataset(dataset_path)

    cases = data.get("test_cases", [data])  # support single or multi-case datasets

    all_results = []
    for i, case in enumerate(cases):
        print(f"\n[Case {i+1}/{len(cases)}] {case.get('name', 'Unnamed')}")

        result = await run_evals(
            trust_center_controls=case.get("trust_center_controls", []),
            document_controls=case.get("document_controls", []),
            mappings=case.get("mappings", []),
            base_controls=case.get("base_controls", []),
        )

        print(f"  Overall Score: {result['overall_score']}/100  Grade: {result['grade']}")
        print(f"  Extraction:  {result['extraction'].get('score', 'N/A')}/100")
        print(f"  Mapping:     {result['mapping'].get('score', 'N/A')}/100")
        print(f"  Coverage:    {result['coverage'].get('score', 'N/A')}/100")
        print(f"  Source coverage: {result['coverage'].get('source_coverage_pct', 'N/A')}%")
        print(f"  Base coverage:   {result['coverage'].get('base_coverage_pct', 'N/A')}%")

        if result["extraction"].get("issues"):
            print(f"  Extraction issues: {result['extraction']['issues']}")
        if result["mapping"].get("issues"):
            print(f"  Mapping issues: {result['mapping']['issues']}")

        all_results.append({"case": case.get("name", f"case_{i+1}"), "result": result})

    # Summary
    if len(all_results) > 1:
        avg_score = sum(r["result"]["overall_score"] for r in all_results) / len(all_results)
        print(f"\n{'='*50}")
        print(f"SUMMARY: {len(all_results)} cases evaluated")
        print(f"Average Overall Score: {avg_score:.1f}/100")

    if output_path:
        with open(output_path, "w") as f:
            json.dump(all_results, f, indent=2)
        print(f"\nResults written to: {output_path}")

    return all_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run control mapper evaluations")
    parser.add_argument("--dataset", required=True, help="Path to eval dataset JSON")
    parser.add_argument("--output", default=None, help="Path to write results JSON")
    args = parser.parse_args()
    asyncio.run(main(args.dataset, args.output))
