import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GitBranch, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API = 'http://localhost:8000';

/**
 * GitHub OAuth Callback Page
 * GitHub redirects here after the user authorizes the app.
 * URL will be: /auth/github/callback?code=XXXX
 * We send the code to our backend to exchange for a token.
 */
export default function GitHubCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setStatus('error');
      setError('GitHub authorization was denied or cancelled.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setStatus('error');
      setError('No authorization code received from GitHub.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Exchange code for user profile via backend
    axios.post(`${API}/api/auth/github/callback`, { code })
      .then(res => {
        const user = res.data.user;
        // Store user info in sessionStorage (replace with proper auth state/context)
        sessionStorage.setItem('smart_maint_user', JSON.stringify(user));
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 1500);
      })
      .catch(err => {
        setStatus('error');
        setError(err.response?.data?.detail || 'GitHub authentication failed.');
        setTimeout(() => navigate('/login'), 3000);
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center font-sans">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <p className="text-base font-bold text-white">SMART-MAINT</p>
        </div>

        {/* Status */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-white font-semibold">Completing GitHub sign-in…</p>
            <p className="text-sm text-slate-500">Exchanging authorization code</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-semibold">GitHub sign-in successful!</p>
            <p className="text-sm text-slate-500">Redirecting to dashboard…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white font-semibold">Authentication failed</p>
            <p className="text-sm text-red-400 max-w-sm">{error}</p>
            <p className="text-xs text-slate-600">Redirecting back to login…</p>
          </div>
        )}
      </div>
    </div>
  );
}
