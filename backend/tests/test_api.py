"""
Basic smoke tests for the SMART-MAINT API.
Run with: pytest tests/ -v
"""
import sys
import os
import pytest

# Make sure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Health check ─────────────────────────────────────────────────────────────

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── Scoring module ────────────────────────────────────────────────────────────

def test_calculate_score_low():
    from scoring import calculate_score
    score = calculate_score(complexity=5, coupling=2, loc=100, change_frequency=1)
    assert 0 <= score <= 40, f"Expected low score, got {score}"


def test_calculate_score_high():
    from scoring import calculate_score
    score = calculate_score(complexity=50, coupling=20, loc=1000, change_frequency=50)
    assert score >= 70, f"Expected high score, got {score}"


def test_generate_risk_report():
    from scoring import generate_risk_report
    metrics = [
        {"file": "a.py", "loc": 50, "complexity": 5, "coupling": 2, "change_frequency": 1},
        {"file": "b.py", "loc": 900, "complexity": 45, "coupling": 18, "change_frequency": 40},
    ]
    report = generate_risk_report(metrics)
    assert len(report) == 2
    # Sorted by score descending
    assert report[0]["score"] >= report[1]["score"]
    assert report[0]["is_high_risk"] is True


# ── Traffic module ────────────────────────────────────────────────────────────

def test_traffic_simulation():
    from traffic import simulate_traffic_growth
    data = simulate_traffic_growth(current_users=100, growth_rate_percent=10, months=3)
    assert len(data) == 4  # month 0 + 3 months
    assert data[0]["avg_concurrent_users"] == 100
    assert data[3]["avg_concurrent_users"] > 100


def test_capacity_estimation():
    from traffic import estimate_server_capacity
    cap = estimate_server_capacity(concurrent_users=500)
    assert cap["cpu_cores"] >= 1
    assert cap["ram_gb"] >= 2
    assert cap["tier"] == "Growth"


def test_traffic_api_endpoint():
    res = client.post("/api/traffic", json={
        "current_users": 200,
        "growth_rate_percent": 20,
        "months": 6,
    })
    assert res.status_code == 200
    body = res.json()
    assert "traffic_timeline" in body
    assert "scaling_recommendations" in body
    assert len(body["traffic_timeline"]) == 7  # month 0..6


def test_traffic_api_invalid():
    res = client.post("/api/traffic", json={
        "current_users": -1,
        "growth_rate_percent": 10,
        "months": 6,
    })
    assert res.status_code == 400


# ── Chatbot module ────────────────────────────────────────────────────────────

def test_chatbot_greeting():
    from chatbot import get_chatbot_response
    result = get_chatbot_response("hello")
    assert result["intent"] == "greeting"
    assert len(result["response"]) > 0


def test_chatbot_maintenance_score():
    from chatbot import get_chatbot_response
    result = get_chatbot_response("what is the maintenance score?")
    assert result["intent"] == "maintenance_score"


def test_chatbot_high_risk():
    from chatbot import get_chatbot_response
    result = get_chatbot_response("which modules are high risk?")
    assert result["intent"] == "high_risk"


def test_chatbot_traffic():
    from chatbot import get_chatbot_response
    result = get_chatbot_response("how does traffic simulation work?")
    assert result["intent"] == "traffic"


def test_chatbot_unknown():
    from chatbot import get_chatbot_response
    result = get_chatbot_response("what is the weather today?")
    assert result["intent"] == "unknown"


def test_chat_api_endpoint():
    res = client.post("/api/chat", json={"message": "explain high risk modules"})
    assert res.status_code == 200
    body = res.json()
    assert "response" in body
    assert "intent" in body


def test_chat_api_empty_message():
    res = client.post("/api/chat", json={"message": ""})
    assert res.status_code == 400


# ── Analyze endpoint (invalid path) ──────────────────────────────────────────

def test_analyze_invalid_path():
    res = client.post("/api/analyze", json={"directory_path": "/nonexistent/path/xyz"})
    assert res.status_code == 400


def test_analyze_valid_path():
    """Analyze the backend folder itself as a smoke test."""
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    res = client.post("/api/analyze", json={"directory_path": backend_dir})
    assert res.status_code == 200
    body = res.json()
    assert body["summary"]["total_files"] > 0
    assert "details" in body


# ── STORY-5: Cloud storage / reports ─────────────────────────────────────────

def test_get_reports_endpoint():
    """GET /api/reports should return a list (may be empty)."""
    res = client.get("/api/reports")
    assert res.status_code == 200
    assert "reports" in res.json()


def test_analyze_saves_report():
    """Analyze should trigger background save; reports list should grow."""
    import time
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    res = client.post("/api/analyze", json={
        "directory_path": backend_dir,
        "project_name": "test_project",
        "save_report": True,
    })
    assert res.status_code == 200
    # Give background task a moment
    time.sleep(0.5)
    reports_res = client.get("/api/reports")
    assert reports_res.status_code == 200
    reports = reports_res.json()["reports"]
    assert len(reports) >= 1


# ── STORY-7: GitHub webhook ───────────────────────────────────────────────────

def test_webhook_push_to_main():
    """Webhook with push to main should trigger analysis."""
    payload = {
        "ref": "refs/heads/main",
        "repository": {"name": "test-repo"},
        "commits": [{"id": "abc123"}],
    }
    res = client.post("/api/webhook/github", json=payload,
                      headers={"x-github-event": "push"})
    assert res.status_code == 200
    assert res.json()["status"] == "analysis_triggered"


def test_webhook_push_to_feature_branch():
    """Webhook push to non-main branch should be ignored."""
    payload = {
        "ref": "refs/heads/feature/my-feature",
        "repository": {"name": "test-repo"},
    }
    res = client.post("/api/webhook/github", json=payload,
                      headers={"x-github-event": "push"})
    assert res.status_code == 200
    assert res.json()["status"] == "ignored"
