import csv

from services.parsers.parser_constants import (
    ID_CANDIDATES,
    TEXT_CANDIDATES,
    DOMAIN_CANDIDATES,
)


def normalize_header(h):
    return h.strip().lower().replace(" ", "_")


def parse_controls_csv(file_path):

    controls = []

    with open(file_path, newline="", encoding="utf-8") as f:

        reader = csv.DictReader(f)

        headers = {
            normalize_header(h): h
            for h in reader.fieldnames
        }

        id_col = next(
            (headers[h] for h in headers if h in ID_CANDIDATES),
            None
        )

        text_col = next(
            (headers[h] for h in headers if h in TEXT_CANDIDATES),
            None
        )

        domain_col = next(
            (headers[h] for h in headers if h in DOMAIN_CANDIDATES),
            None
        )

        if not id_col or not text_col:
            raise ValueError(
                "Could not identify control ID or description columns"
            )

        for row in reader:

            controls.append({
                "control_id": row[id_col].strip(),
                "domain": (
                    row[domain_col].strip()
                    if domain_col and row.get(domain_col)
                    else "General"
                ),
                "text": row[text_col].strip(),
            })

    return controls