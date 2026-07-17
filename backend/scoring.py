def calculate_score(complexity, coupling, loc, change_frequency):
    """
    Calculates the Maintenance Effort Score utilizing the updated formula:
    Score = 0.4 * normalized_complexity + 0.2 * normalized_coupling + 0.1 * normalized_loc + 0.3 * normalized_change_frequency
    """
    # Define normalization ceilings to map to a 100-point scale
    MAX_COMPLEXITY = 50.0
    MAX_COUPLING = 20.0
    MAX_LOC = 1000.0
    MAX_CHANGES = 50.0

    # Calculate percentages (capped at 100%)
    normalized_complexity = min((complexity / MAX_COMPLEXITY), 1.0) * 100
    normalized_coupling = min((coupling / MAX_COUPLING), 1.0) * 100
    normalized_loc = min((loc / MAX_LOC), 1.0) * 100
    normalized_change_frequency = min((change_frequency / MAX_CHANGES), 1.0) * 100

    # Apply the weighted formula
    score = (0.4 * normalized_complexity) + (0.2 * normalized_coupling) + (0.1 * normalized_loc) + (0.3 * normalized_change_frequency)
    
    # Round to 2 decimal places
    return round(score, 2)

def generate_risk_report(file_metrics):
    """
    Processes a list of file metrics, assigns a Maintenance Effort Score, 
    and determines the high-risk status.
    """
    report = []
    
    for metrics in file_metrics:
        change_frequency = metrics.get('change_frequency', 0)
        score = calculate_score(metrics['complexity'], metrics['coupling'], metrics['loc'], change_frequency)
        
        # Files with score > 70 are marked as high-risk
        is_high_risk = score > 70
        
        report.append({
            "file": metrics["file"],
            "loc": metrics["loc"],
            "complexity": metrics["complexity"],
            "coupling": metrics["coupling"],
            "change_frequency": change_frequency,
            "score": score,
            "is_high_risk": is_high_risk
        })
        
    # Sort by highest score first
    report = sorted(report, key=lambda x: x['score'], reverse=True)
    return report


# ── AI Recommendations ────────────────────────────────────────────────────────

def generate_ai_recommendations(report: list) -> list:
    """
    Generates specific, actionable AI recommendations for each high-risk file.
    Uses rule-based logic on the metrics — no external API needed.
    Returns a list of recommendation dicts sorted by priority.
    """
    recommendations = []

    for file in report:
        score = file["score"]
        complexity = file["complexity"]
        coupling = file["coupling"]
        loc = file["loc"]
        change_freq = file.get("change_frequency", 0)
        filename = file["file"]
        name = filename.split("\\")[-1].split("/")[-1]  # basename

        # Only recommend for medium and high risk files
        if score < 30:
            continue

        actions = []
        priority = "low"

        # Complexity-driven recommendations
        if complexity > 40:
            actions.append(f"Break down complex logic in `{name}` — cyclomatic complexity is critically high ({complexity}). Split into smaller functions.")
            priority = "critical"
        elif complexity > 20:
            actions.append(f"Reduce branching in `{name}` (complexity: {complexity}). Replace nested if-else with early returns or strategy pattern.")
            priority = "high"
        elif complexity > 10:
            actions.append(f"Simplify conditional logic in `{name}` (complexity: {complexity}).")
            if priority == "low":
                priority = "medium"

        # Coupling-driven recommendations
        if coupling > 15:
            actions.append(f"`{name}` has too many dependencies ({coupling} imports). Apply dependency injection and interface abstractions.")
            if priority not in ("critical",):
                priority = "high"
        elif coupling > 8:
            actions.append(f"Reduce coupling in `{name}` ({coupling} imports). Move shared utilities to a common module.")
            if priority == "low":
                priority = "medium"

        # LOC-driven recommendations
        if loc > 800:
            actions.append(f"`{name}` is very large ({loc} lines). Split into multiple focused modules following Single Responsibility Principle.")
            if priority not in ("critical", "high"):
                priority = "high"
        elif loc > 400:
            actions.append(f"Consider splitting `{name}` ({loc} lines) into smaller, focused files.")

        # Change frequency recommendations
        if change_freq > 30:
            actions.append(f"`{name}` changes very frequently ({change_freq} commits). Add unit tests before next modification to prevent regressions.")
            if priority not in ("critical",):
                priority = "high"
        elif change_freq > 15:
            actions.append(f"`{name}` is frequently modified ({change_freq} commits). Ensure adequate test coverage.")

        # Keyword-based specific recommendations
        name_lower = name.lower()
        if any(k in name_lower for k in ["auth", "login", "password", "token", "session"]):
            actions.append(f"Security-sensitive file detected: `{name}`. Conduct a security review and ensure input validation.")
            priority = "critical"
        elif any(k in name_lower for k in ["db", "database", "model", "schema", "migration"]):
            actions.append(f"Database layer file `{name}` — ensure all queries are parameterized to prevent SQL injection.")
        elif any(k in name_lower for k in ["api", "route", "endpoint", "controller", "handler"]):
            actions.append(f"API layer file `{name}` — verify input validation and error handling on all endpoints.")
        elif any(k in name_lower for k in ["util", "helper", "common", "shared"]):
            actions.append(f"Shared utility `{name}` is used widely — changes here have high blast radius. Add comprehensive tests.")

        if actions:
            recommendations.append({
                "file": filename,
                "score": score,
                "priority": priority,
                "actions": actions,
            })

    # Sort: critical first, then high, medium, low
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda x: (priority_order.get(x["priority"], 4), -x["score"]))

    return recommendations[:15]  # Return top 15 recommendations
