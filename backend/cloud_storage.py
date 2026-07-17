"""
Sprint 3 — STORY-5: Store analysis reports in cloud (AWS S3 / Firebase)
Saves analysis reports as JSON files to S3 or falls back to local storage.
"""

import json
import os
import datetime
from pathlib import Path

# ── Optional AWS S3 support ──────────────────────────────────────────────────
try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

# ── Config from environment variables ────────────────────────────────────────
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
LOCAL_REPORTS_DIR = Path(os.getenv("LOCAL_REPORTS_DIR", "reports"))


def _timestamp() -> str:
    return datetime.datetime.now(datetime.UTC).strftime("%Y%m%d_%H%M%S")


def _save_local(report_data: dict, filename: str) -> str:
    """Saves report JSON to local reports/ directory as fallback."""
    LOCAL_REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    filepath = LOCAL_REPORTS_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    return str(filepath)


def save_report_to_s3(report_data: dict, project_name: str = "project") -> dict:
    """
    Saves an analysis report to AWS S3.
    Falls back to local storage if S3 is not configured or boto3 is unavailable.

    Returns a dict with:
      - storage_type: "s3" | "local"
      - location: S3 URI or local file path
      - filename: the report filename
      - timestamp: UTC timestamp
    """
    filename = f"report_{project_name}_{_timestamp()}.json"
    timestamp = datetime.datetime.now(datetime.UTC).isoformat()

    # Enrich report with metadata before saving
    enriched = {
        "metadata": {
            "project": project_name,
            "generated_at": timestamp,
            "tool": "SMART-MAINT v2.0",
        },
        **report_data,
    }

    # ── Try S3 first ──────────────────────────────────────────────────────────
    if BOTO3_AVAILABLE and S3_BUCKET:
        try:
            s3 = boto3.client("s3", region_name=AWS_REGION)
            s3_key = f"smart-maint/reports/{filename}"
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=s3_key,
                Body=json.dumps(enriched, indent=2).encode("utf-8"),
                ContentType="application/json",
            )
            location = f"s3://{S3_BUCKET}/{s3_key}"
            return {
                "storage_type": "s3",
                "location": location,
                "filename": filename,
                "timestamp": timestamp,
                "bucket": S3_BUCKET,
                "key": s3_key,
            }
        except (BotoCoreError, ClientError) as e:
            # S3 failed — fall through to local
            print(f"[cloud_storage] S3 upload failed: {e}. Falling back to local.")

    # ── Local fallback ────────────────────────────────────────────────────────
    local_path = _save_local(enriched, filename)
    return {
        "storage_type": "local",
        "location": local_path,
        "filename": filename,
        "timestamp": timestamp,
    }


def list_saved_reports() -> list[dict]:
    """
    Lists all locally saved reports (and optionally S3 reports if configured).
    Returns a list of report metadata dicts.
    """
    reports = []

    # Local reports
    if LOCAL_REPORTS_DIR.exists():
        for f in sorted(LOCAL_REPORTS_DIR.glob("report_*.json"), reverse=True):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                reports.append({
                    "filename": f.name,
                    "storage_type": "local",
                    "location": str(f),
                    "generated_at": data.get("metadata", {}).get("generated_at", ""),
                    "project": data.get("metadata", {}).get("project", ""),
                    "total_files": data.get("summary", {}).get("total_files", 0),
                    "high_risk_count": data.get("summary", {}).get("high_risk_count", 0),
                })
            except Exception:
                pass

    # S3 reports (list only, no download)
    if BOTO3_AVAILABLE and S3_BUCKET:
        try:
            s3 = boto3.client("s3", region_name=AWS_REGION)
            response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix="smart-maint/reports/")
            for obj in response.get("Contents", []):
                reports.append({
                    "filename": obj["Key"].split("/")[-1],
                    "storage_type": "s3",
                    "location": f"s3://{S3_BUCKET}/{obj['Key']}",
                    "generated_at": obj["LastModified"].isoformat(),
                    "size_bytes": obj["Size"],
                })
        except Exception:
            pass

    return reports
