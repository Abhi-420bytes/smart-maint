"""
Feature: GitHub Repository Analyzer
Clones a public GitHub repo to a temp folder, scans it, then cleans up.
"""

import os
import shutil
import tempfile
import subprocess
import re
from scanner import scan_directory
from scoring import generate_risk_report


def _is_valid_github_url(url: str) -> bool:
    """Validates that the URL looks like a GitHub repo."""
    pattern = r'^https?://github\.com/[\w\-\.]+/[\w\-\.]+(?:\.git)?/?$'
    return bool(re.match(pattern, url.strip()))


def _normalize_url(url: str) -> str:
    """Ensures URL ends with .git for cloning."""
    url = url.strip().rstrip('/')
    if not url.endswith('.git'):
        url += '.git'
    return url


def analyze_github_repo(repo_url: str) -> dict:
    """
    Clones a public GitHub repository to a temp directory,
    runs the full analysis, then deletes the temp directory.

    Returns the same structure as /api/analyze.
    Raises ValueError for invalid URLs or clone failures.
    """
    if not _is_valid_github_url(repo_url):
        raise ValueError(
            "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
        )

    clone_url = _normalize_url(repo_url)

    # Extract repo name for display
    repo_name = clone_url.rstrip('/').rstrip('.git').split('/')[-1]

    # Create a temporary directory
    tmp_dir = tempfile.mkdtemp(prefix="smart_maint_")

    try:
        # Clone the repository (shallow clone for speed, no interactive prompts)
        result = subprocess.run(
            ['git', 'clone', '--depth', '1',
             '-c', 'core.askPass=echo',          # disable password prompts
             '-c', 'credential.helper=',          # disable credential helpers
             clone_url, tmp_dir],
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'},  # never prompt
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip()
            if 'not found' in error_msg.lower() or '404' in error_msg:
                raise ValueError(
                    f"Repository not found or is private: {repo_url}\n"
                    "SMART-MAINT can only analyze public GitHub repositories."
                )
            if 'authentication' in error_msg.lower() or 'credential' in error_msg.lower() or 'could not read' in error_msg.lower():
                raise ValueError(
                    f"This repository is private and requires authentication.\n"
                    "SMART-MAINT can only analyze public GitHub repositories.\n"
                    "Please use a public repo URL, e.g. https://github.com/facebook/react"
                )
            raise ValueError(f"Git clone failed: {error_msg[:300]}")

        # Run the analysis on the cloned repo
        raw_metrics = scan_directory(tmp_dir)

        if not raw_metrics:
            # List what files ARE in the repo to give a helpful error
            all_files = []
            for root, dirs, files in os.walk(tmp_dir):
                dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '__pycache__')]
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext:
                        all_files.append(ext)

            from collections import Counter
            ext_counts = Counter(all_files)
            top_exts = ', '.join(f"{e} ({n})" for e, n in ext_counts.most_common(5))

            if ext_counts:
                raise ValueError(
                    f"No supported source files found in this repository. "
                    f"Files found: {top_exts}. "
                    f"SMART-MAINT supports: .py, .js, .ts, .java, .c, .cpp, .cs, .go, .rb, .php, .r, .sql, .ipynb and more."
                )
            else:
                raise ValueError(
                    "Repository appears to be empty or contains only binary files."
                )

        report = generate_risk_report(raw_metrics)

        total_files = len(report)
        total_loc = sum(m["loc"] for m in report)
        avg_complexity = round(sum(m["complexity"] for m in report) / total_files, 2)
        avg_score = round(sum(m["score"] for m in report) / total_files, 2)
        high_risk_files = [m for m in report if m["is_high_risk"]]
        low_risk = [m for m in report if m["score"] <= 40]
        medium_risk = [m for m in report if 40 < m["score"] <= 70]

        return {
            "repo_url": repo_url,
            "repo_name": repo_name,
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
        }

    finally:
        # Always clean up the temp directory
        shutil.rmtree(tmp_dir, ignore_errors=True)
