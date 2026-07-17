from fastapi import FastAPI, HTTPException, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import os
import hmac
import hashlib

from scanner import scan_directory
from scoring import generate_risk_report, generate_ai_recommendations
from traffic import generate_scaling_recommendation
from chatbot import get_chatbot_response
from cloud_storage import save_report_to_s3, list_saved_reports
from github_analyzer import analyze_github_repo
from pdf_report import generate_pdf_report
from auth import verify_google_token, exchange_github_code, GITHUB_CLIENT_ID, FRONTEND_URL

app = FastAPI(title="SMART-MAINT API", version="2.0.0")

# Setup CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    directory_path: str
    project_name: str = "project"
    save_report: bool = True

class GitHubAnalyzeRequest(BaseModel):
    repo_url: str
    project_name: str = "github-project"
    save_report: bool = True

class TrafficRequest(BaseModel):
    current_users: int
    growth_rate_percent: float
    months: int = 12

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

class GitHubWebhookPayload(BaseModel):
    ref: Optional[str] = None
    repository: Optional[dict] = None
    commits: Optional[list] = None

# STORY-5: Query params for analytics filtering
from fastapi import Query


# ---------------------------------------------------------------------------
# Sprint 1 & 2 — Code Analysis & Maintenance Prediction
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
def analyze_project(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Scans a project directory, computes code metrics, and returns a
    maintenance effort report with risk classification.
    STORY-5: Optionally saves the report to cloud/local storage in the background.
    """
    if not os.path.exists(req.directory_path) or not os.path.isdir(req.directory_path):
        raise HTTPException(status_code=400, detail="Invalid directory path provided.")

    raw_metrics = scan_directory(req.directory_path)

    if not raw_metrics:
        raise HTTPException(
            status_code=404,
            detail="No supported source files found in the directory."
        )

    report = generate_risk_report(raw_metrics)

    total_files = len(report)
    total_loc = sum(m["loc"] for m in report)
    avg_complexity = round(sum(m["complexity"] for m in report) / total_files, 2)
    avg_score = round(sum(m["score"] for m in report) / total_files, 2)
    high_risk_files = [m for m in report if m["is_high_risk"]]
    low_risk = [m for m in report if m["score"] <= 40]
    medium_risk = [m for m in report if 40 < m["score"] <= 70]

    result = {
        "summary": {
            "total_files": total_files,
            "total_loc": total_loc,
            "average_complexity": avg_complexity,
            "average_maintenance_score": avg_score,
            "high_risk_count": len(high_risk_files),
            "medium_risk_count": len(medium_risk),
            "low_risk_count": len(low_risk),
        },
        "details": report,
        "high_risk_files": high_risk_files,
        "top_risk_files": report[:10],
        "recommendations": generate_ai_recommendations(report),
    }

    # Save report to cloud/local in background (non-blocking)
    if req.save_report:
        background_tasks.add_task(save_report_to_s3, result, req.project_name)

    return result


# ---------------------------------------------------------------------------
# GitHub Repository Analyzer
# ---------------------------------------------------------------------------

@app.post("/api/analyze/github")
def analyze_github(req: GitHubAnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Clones a public GitHub repository and runs the full analysis on it.
    Accepts a GitHub URL like: https://github.com/owner/repo
    """
    try:
        result = analyze_github_repo(req.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)[:200]}")

    # Add AI recommendations
    result["recommendations"] = generate_ai_recommendations(result["details"])

    if req.save_report:
        background_tasks.add_task(save_report_to_s3, result, result.get("repo_name", req.project_name))

    return result


# ---------------------------------------------------------------------------
# PDF Report Generation
# ---------------------------------------------------------------------------

@app.post("/api/analyze/pdf")
def export_pdf(req: AnalyzeRequest):
    """
    Runs analysis and returns a downloadable PDF report.
    """
    from fastapi.responses import Response

    if not os.path.exists(req.directory_path) or not os.path.isdir(req.directory_path):
        raise HTTPException(status_code=400, detail="Invalid directory path provided.")

    raw_metrics = scan_directory(req.directory_path)
    if not raw_metrics:
        raise HTTPException(status_code=404, detail="No supported source files found.")

    report = generate_risk_report(raw_metrics)
    total_files = len(report)
    total_loc = sum(m["loc"] for m in report)
    avg_complexity = round(sum(m["complexity"] for m in report) / total_files, 2)
    avg_score = round(sum(m["score"] for m in report) / total_files, 2)
    high_risk_files = [m for m in report if m["is_high_risk"]]
    low_risk = [m for m in report if m["score"] <= 40]
    medium_risk = [m for m in report if 40 < m["score"] <= 70]

    analysis_data = {
        "summary": {
            "total_files": total_files,
            "total_loc": total_loc,
            "average_complexity": avg_complexity,
            "average_maintenance_score": avg_score,
            "high_risk_count": len(high_risk_files),
            "medium_risk_count": len(medium_risk),
            "low_risk_count": len(low_risk),
        },
        "details": report,
        "recommendations": generate_ai_recommendations(report),
    }

    try:
        pdf_bytes = generate_pdf_report(analysis_data, req.project_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=smart_maint_{req.project_name}.pdf"},
    )


@app.post("/api/analyze/github/pdf")
def export_github_pdf(req: GitHubAnalyzeRequest):
    """Clones a GitHub repo, analyzes it, and returns a PDF report."""
    from fastapi.responses import Response

    try:
        result = analyze_github_repo(req.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result["recommendations"] = generate_ai_recommendations(result["details"])

    try:
        pdf_bytes = generate_pdf_report(result, result.get("repo_name", "github-project"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    repo_name = result.get("repo_name", "report")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=smart_maint_{repo_name}.pdf"},
    )


# ---------------------------------------------------------------------------
# STORY-5: Backend API refinement for analytics data
# ---------------------------------------------------------------------------

@app.get("/api/reports")
def get_saved_reports():
    """Lists all previously saved analysis reports (local + S3)."""
    return {"reports": list_saved_reports()}


@app.post("/api/analyze/filter")
def filter_analysis(
    req: AnalyzeRequest,
    risk_level: str = Query("all", description="Filter: all | high | medium | low"),
    sort_by: str = Query("score", description="Sort field: score | loc | complexity | coupling | file"),
    sort_order: str = Query("desc", description="Sort order: asc | desc"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
):
    """
    STORY-5: Refined analytics endpoint with filtering, sorting, and pagination.
    Supports risk-level filtering, multi-field sorting, and page-based results.
    """
    if not os.path.exists(req.directory_path) or not os.path.isdir(req.directory_path):
        raise HTTPException(status_code=400, detail="Invalid directory path provided.")

    raw_metrics = scan_directory(req.directory_path)
    if not raw_metrics:
        raise HTTPException(status_code=404, detail="No supported source files found.")

    report = generate_risk_report(raw_metrics)

    # ── Filter by risk level ──────────────────────────────────────────────────
    if risk_level == "high":
        filtered = [m for m in report if m["score"] > 70]
    elif risk_level == "medium":
        filtered = [m for m in report if 40 < m["score"] <= 70]
    elif risk_level == "low":
        filtered = [m for m in report if m["score"] <= 40]
    else:
        filtered = report

    # ── Sort ──────────────────────────────────────────────────────────────────
    valid_sort_fields = {"score", "loc", "complexity", "coupling", "file", "change_frequency"}
    if sort_by not in valid_sort_fields:
        sort_by = "score"
    reverse = sort_order != "asc"
    filtered = sorted(filtered, key=lambda x: x.get(sort_by, 0), reverse=reverse)

    # ── Paginate ──────────────────────────────────────────────────────────────
    total = len(filtered)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = filtered[start:end]

    return {
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_results": total,
            "total_pages": total_pages,
        },
        "filters": {"risk_level": risk_level, "sort_by": sort_by, "sort_order": sort_order},
        "results": page_data,
    }


@app.post("/api/analyze/export")
def export_analysis(
    req: AnalyzeRequest,
    format: str = Query("json", description="Export format: json | csv"),
):
    """
    STORY-5: Export full analysis report as JSON or CSV download.
    """
    from fastapi.responses import StreamingResponse, JSONResponse
    import csv
    import io

    if not os.path.exists(req.directory_path) or not os.path.isdir(req.directory_path):
        raise HTTPException(status_code=400, detail="Invalid directory path provided.")

    raw_metrics = scan_directory(req.directory_path)
    if not raw_metrics:
        raise HTTPException(status_code=404, detail="No supported source files found.")

    report = generate_risk_report(raw_metrics)

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "file", "loc", "complexity", "coupling", "change_frequency", "score", "is_high_risk"
        ])
        writer.writeheader()
        writer.writerows(report)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=smart_maint_report.csv"},
        )

    # Default: JSON download
    import json as _json
    content = _json.dumps({"project": req.project_name, "results": report}, indent=2)
    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=smart_maint_report.json"},
    )


# ---------------------------------------------------------------------------
# STORY-7: GitHub Webhook — auto-trigger analysis on code push
# ---------------------------------------------------------------------------

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")
WEBHOOK_SCAN_PATH = os.getenv("WEBHOOK_SCAN_PATH", "")  # path to scan when webhook fires

@app.post("/api/webhook/github")
async def github_webhook(
    payload: dict,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Optional[str] = Header(None),
    x_github_event: Optional[str] = Header(None),
):
    """
    STORY-7: Receives GitHub push webhooks and auto-triggers code analysis.
    Set GITHUB_WEBHOOK_SECRET and WEBHOOK_SCAN_PATH env vars to activate.

    GitHub webhook setup:
      - Payload URL: https://your-backend/api/webhook/github
      - Content type: application/json
      - Secret: value of GITHUB_WEBHOOK_SECRET
      - Events: Just the push event
    """
    # Verify HMAC signature if secret is configured
    if WEBHOOK_SECRET and x_hub_signature_256:
        import json
        body_bytes = json.dumps(payload).encode("utf-8")
        expected = "sha256=" + hmac.new(
            WEBHOOK_SECRET.encode("utf-8"), body_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    # Only act on push events to main/master
    ref = payload.get("ref", "")
    if x_github_event == "push" and ref in ("refs/heads/main", "refs/heads/master"):
        repo_name = payload.get("repository", {}).get("name", "repo")
        scan_path = WEBHOOK_SCAN_PATH or os.getcwd()

        def _run_analysis():
            try:
                raw = scan_directory(scan_path)
                if raw:
                    report = generate_risk_report(raw)
                    total = len(report)
                    high = [m for m in report if m["is_high_risk"]]
                    save_report_to_s3(
                        {
                            "summary": {
                                "total_files": total,
                                "high_risk_count": len(high),
                                "average_maintenance_score": round(
                                    sum(m["score"] for m in report) / total, 2
                                ) if total else 0,
                            },
                            "details": report,
                        },
                        project_name=repo_name,
                    )
                    print(f"[webhook] Auto-analysis complete for {repo_name}: {total} files, {len(high)} high-risk")
            except Exception as e:
                print(f"[webhook] Auto-analysis failed: {e}")

        background_tasks.add_task(_run_analysis)
        return {"status": "analysis_triggered", "repo": repo_name, "ref": ref}

    return {"status": "ignored", "reason": "Not a push to main/master"}


# ---------------------------------------------------------------------------
# Sprint 4 — Traffic Simulation & Server Capacity Estimation
# ---------------------------------------------------------------------------

@app.post("/api/traffic")
def simulate_traffic(req: TrafficRequest):
    """
    Simulates user traffic growth and estimates required server capacity
    over the specified number of months.
    """
    if req.current_users <= 0:
        raise HTTPException(status_code=400, detail="current_users must be greater than 0.")
    if not (0 < req.growth_rate_percent <= 500):
        raise HTTPException(status_code=400, detail="growth_rate_percent must be between 1 and 500.")
    if not (1 <= req.months <= 36):
        raise HTTPException(status_code=400, detail="months must be between 1 and 36.")

    result = generate_scaling_recommendation(
        current_users=req.current_users,
        growth_rate_percent=req.growth_rate_percent,
        months=req.months,
    )
    return result


# ---------------------------------------------------------------------------
# Sprint 5 — Domain-Specific Performance Chatbot
# ---------------------------------------------------------------------------

@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    Accepts a plain-English question and returns a domain-specific answer
    about maintenance, risk, traffic, or infrastructure.
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    result = get_chatbot_response(req.message, context=req.context)
    return result


# ---------------------------------------------------------------------------
# OAuth Authentication Endpoints
# ---------------------------------------------------------------------------

class GoogleTokenRequest(BaseModel):
    token: str  # Google ID token from frontend

class GitHubCodeRequest(BaseModel):
    code: str   # GitHub authorization code from redirect

@app.post("/api/auth/google")
async def google_auth(req: GoogleTokenRequest):
    """
    Verifies a Google ID token sent from the frontend after Google sign-in.
    Returns user profile info on success.
    """
    try:
        user = await verify_google_token(req.token)
        return {"status": "ok", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/auth/github")
def github_auth_redirect():
    """
    Redirects the browser to GitHub's OAuth authorization page.
    The frontend calls this URL directly (window.location.href).
    """
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="GitHub OAuth is not configured on this server. Set GITHUB_CLIENT_ID env var."
        )
    redirect_uri = f"{FRONTEND_URL}/auth/github/callback"
    scope = "read:user user:email"
    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
    )
    return RedirectResponse(url=github_url)


@app.post("/api/auth/github/callback")
async def github_callback(req: GitHubCodeRequest):
    """
    Exchanges the GitHub authorization code (sent from frontend callback page)
    for an access token and returns the user's profile.
    """
    try:
        user = await exchange_github_code(req.code)
        return {"status": "ok", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
