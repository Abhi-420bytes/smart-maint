"""
OAuth Authentication Module
Handles Google OAuth token verification and GitHub OAuth code exchange.
"""

import os
import httpx
from typing import Optional

# ── Config from environment variables ────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")


async def verify_google_token(token: str) -> dict:
    """
    Verifies a Google ID token by calling Google's tokeninfo endpoint.
    Returns user info dict on success, raises ValueError on failure.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": token},
            timeout=10,
        )

    if resp.status_code != 200:
        raise ValueError("Invalid Google token.")

    data = resp.json()

    # Verify the token was issued for our app
    if GOOGLE_CLIENT_ID and data.get("aud") != GOOGLE_CLIENT_ID:
        raise ValueError("Google token audience mismatch.")

    return {
        "provider":  "google",
        "email":     data.get("email", ""),
        "name":      data.get("name", ""),
        "picture":   data.get("picture", ""),
        "sub":       data.get("sub", ""),
        "verified":  data.get("email_verified") == "true",
    }


async def exchange_github_code(code: str) -> dict:
    """
    Exchanges a GitHub OAuth authorization code for an access token,
    then fetches the user's profile and primary email.
    Returns user info dict on success, raises ValueError on failure.
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise ValueError(
            "GitHub OAuth is not configured. "
            "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables."
        )

    async with httpx.AsyncClient() as client:
        # Step 1: Exchange code for access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id":     GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code":          code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if token_resp.status_code != 200:
            raise ValueError("Failed to exchange GitHub code for token.")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        if not access_token:
            error = token_data.get("error_description", "Unknown error")
            raise ValueError(f"GitHub OAuth error: {error}")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        # Step 2: Fetch user profile
        user_resp = await client.get(
            "https://api.github.com/user",
            headers=headers,
            timeout=10,
        )
        user_data = user_resp.json()

        # Step 3: Fetch primary email (may not be public on profile)
        email_resp = await client.get(
            "https://api.github.com/user/emails",
            headers=headers,
            timeout=10,
        )
        emails = email_resp.json() if email_resp.status_code == 200 else []
        primary_email = next(
            (e["email"] for e in emails if isinstance(e, dict) and e.get("primary")),
            user_data.get("email", ""),
        )

    return {
        "provider": "github",
        "email":    primary_email or "",
        "name":     user_data.get("name") or user_data.get("login", ""),
        "picture":  user_data.get("avatar_url", ""),
        "sub":      str(user_data.get("id", "")),
        "login":    user_data.get("login", ""),
        "verified": True,
    }
