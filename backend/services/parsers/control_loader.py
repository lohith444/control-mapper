import os
import tempfile

from fastapi import HTTPException

from services.parsers.csv_parser import parse_controls_csv
from services.parsers.json_parser import parse_controls_json


def load_controls_file(content: bytes, filename: str):

    ext = os.path.splitext(filename)[1].lower()

    if ext == ".csv":

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".csv"
        ) as tmp:

            tmp.write(content)
            tmp_path = tmp.name

        return parse_controls_csv(tmp_path)

    elif ext == ".json":

        return parse_controls_json(content)

    else:

        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}"
        )

def get_sample_common_controls() -> list[dict]:
    """Built-in sample common controls for demo/testing."""
    return [
        {"control_id": "NCC-1", "domain": "Access Control", "text": "Multi-factor authentication is required for privileged and remote access."},
        {"control_id": "NCC-2", "domain": "Access Control", "text": "Access to systems is provisioned based on least privilege and role-based access control."},
        {"control_id": "NCC-3", "domain": "Access Control", "text": "User access reviews are conducted at least annually."},
        {"control_id": "NCC-4", "domain": "Encryption", "text": "Sensitive customer data is encrypted at rest using AES-256 or equivalent."},
        {"control_id": "NCC-5", "domain": "Encryption", "text": "Data in transit is encrypted using TLS 1.2 or higher."},
        {"control_id": "NCC-6", "domain": "Logging", "text": "Security-relevant events are logged and retained for at least 90 days."},
        {"control_id": "NCC-7", "domain": "Logging", "text": "Logs are protected from unauthorized modification or deletion."},
        {"control_id": "NCC-8", "domain": "Vulnerability Management", "text": "Vulnerability scans are conducted at least quarterly on all systems."},
        {"control_id": "NCC-9", "domain": "Vulnerability Management", "text": "Critical vulnerabilities are remediated within 30 days of discovery."},
        {"control_id": "NCC-10", "domain": "Incident Response", "text": "A formal incident response plan is documented and tested annually."},
        {"control_id": "NCC-11", "domain": "Incident Response", "text": "Security incidents are investigated, contained, and documented."},
        {"control_id": "NCC-12", "domain": "Change Management", "text": "Changes to production systems require approval and testing prior to deployment."},
        {"control_id": "NCC-13", "domain": "HR Security", "text": "Background checks are performed on all employees with access to sensitive data."},
        {"control_id": "NCC-14", "domain": "HR Security", "text": "Security awareness training is provided to all employees at least annually."},
        {"control_id": "NCC-15", "domain": "Physical Security", "text": "Physical access to data centers is restricted and monitored."},
        {"control_id": "NCC-16", "domain": "Business Continuity", "text": "Business continuity and disaster recovery plans are documented and tested."},
        {"control_id": "NCC-17", "domain": "Vendor Management", "text": "Third-party vendors are assessed for security risk prior to engagement."},
        {"control_id": "NCC-18", "domain": "Data Protection", "text": "A data classification policy defines handling requirements for sensitive data."},
        {"control_id": "NCC-19", "domain": "Network Security", "text": "Network access is controlled via firewalls, segmentation, and intrusion detection."},
        {"control_id": "NCC-20", "domain": "Application Security", "text": "Applications undergo security testing (SAST/DAST/penetration testing) before release."},
    ]