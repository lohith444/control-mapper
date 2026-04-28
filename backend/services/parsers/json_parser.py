import json

from services.parsers.parser_constants import (
    ID_CANDIDATES,
    TEXT_CANDIDATES,
    DOMAIN_CANDIDATES,
)


def get_first_match(data, candidates, default=None):

    for c in candidates:
        if c in data and data[c]:
            return data[c]

    return default


def parse_controls_json(content: bytes):

    raw = json.loads(content.decode("utf-8"))

    # Support:
    # { "controls": [...] }
    # OR plain array [...]
    if isinstance(raw, dict):
        controls_data = raw.get("controls", [])
    else:
        controls_data = raw

    controls = []

    for item in controls_data:

        control_id = get_first_match(item, ID_CANDIDATES)
        text = get_first_match(item, TEXT_CANDIDATES)
        domain = get_first_match(
            item,
            DOMAIN_CANDIDATES,
            "General"
        )

        if not control_id or not text:
            continue

        controls.append({
            "control_id": str(control_id).strip(),
            "domain": str(domain).strip(),
            "text": str(text).strip(),
        })

    return controls