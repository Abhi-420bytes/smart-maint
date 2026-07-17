import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import {
  GitBranch, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, CheckCircle, AlertCircle, Loader2,
  Shield, BarChart2, TrendingUp, Sparkles,
} from 'lucide-react';

const API = 'http://localhost:8000';

// ── Replace with your real Google Client ID from console.cloud.google.com ────
// Steps: APIs & Services → Credentials → Create OAuth 2.0 Client ID
// Authorized JS origins: http://localhost:5173
// Authorized redirect URIs: http://localhost:5173
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ── Replace with your real GitHub Client ID from github.com/settings/apps ───
// Steps: Settings → Developer settings → OAuth Apps → New OAuth App
// Homepage URL: http://localhost:5173
// Callback URL: http://localhost:5173/auth/github/callback
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

// ── Feature highlights shown on the left panel ───────────────────────────────
const FEATURES = [
  { icon: BarChart2,  title: 'Code Analysis',       desc: 'Scan any project for complexity, coupling, and maintenance risk' },
  { icon: TrendingUp, title: 'Traffic Simulation',   desc: 'Forecast user growth and estimate server capacity requirements' },
  { icon: Shield,     title: 'Risk Detection',       desc: 'Identify high-risk modules before they become expensive problems' },
  { icon: Sparkles,   title: 'AI Assistant',         desc: 'Ask questions in plain English and get actionable insights' },
];

// ── Reusable input field ──────────────────────────────────────────────────────
function InputField({ label, type, value, onChange, placeholder, icon: Icon, error, rightElement }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-slate-500" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-slate-900/80 border rounded-xl text-slate-200 placeholder-slate-600 text-sm transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-11' : 'pr-4'} py-3
            ${error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
              : 'border-slate-700/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15'
            }`}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

// ── Sign In form ──────────────────────────────────────────────────────────────
function SignInForm({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.email.trim())                          e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))      e.email    = 'Enter a valid email address';
    if (!form.password)                              e.password = 'Password is required';
    else if (form.password.length < 6)               e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setApiError(''); setLoading(true);

    // Simulate auth — replace with real API call e.g. axios.post('/api/auth/login', form)
    await new Promise(r => setTimeout(r, 1200));

    // Demo: accept any valid-format credentials
    if (form.email && form.password.length >= 6) {
      setLoading(false);
      // Sign-in doesn't know the role — default to 'developer'
      // In a real app the backend would return the user's role
      sessionStorage.setItem('smart_maint_user', JSON.stringify({
        email: form.email,
        name: form.email.split('@')[0],
        role: 'developer',
        provider: 'email',
      }));
      onSuccess(form.email);
    } else {
      setLoading(false);
      setApiError('Invalid email or password. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Email Address"
        type="email"
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        placeholder="you@example.com"
        icon={Mail}
        error={errors.email}
      />
      <InputField
        label="Password"
        type={showPwd ? 'text' : 'password'}
        value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        placeholder="Enter your password"
        icon={Lock}
        error={errors.password}
        rightElement={
          <button type="button" onClick={() => setShowPwd(v => !v)}
            className="text-slate-500 hover:text-slate-300 transition-colors">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-indigo-500" />
          <span className="text-xs text-slate-400">Remember me</span>
        </label>
        <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          Forgot password?
        </button>
      </div>

      {apiError && (
        <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{apiError}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: loading ? '#4338ca' : 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)' }}>
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in…</span></>
          : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
        }
      </button>
    </form>
  );
}

// ── Sign Up form ──────────────────────────────────────────────────────────────
function SignUpForm({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'developer' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name.trim())                           e.name     = 'Full name is required';
    else if (form.name.trim().length < 2)            e.name     = 'Name must be at least 2 characters';
    if (!form.email.trim())                          e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))      e.email    = 'Enter a valid email address';
    if (!form.password)                              e.password = 'Password is required';
    else if (form.password.length < 8)               e.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password))           e.password = 'Include at least one uppercase letter';
    else if (!/[0-9]/.test(form.password))           e.password = 'Include at least one number';
    if (!form.confirm)                               e.confirm  = 'Please confirm your password';
    else if (form.confirm !== form.password)         e.confirm  = 'Passwords do not match';
    return e;
  };

  // Password strength
  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)          s++;
    if (/[A-Z]/.test(p))        s++;
    if (/[0-9]/.test(p))        s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#f87171', '#fbbf24', '#34d399', '#6366f1'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setApiError(''); setLoading(true);

    // Simulate registration — replace with real API call
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    // Save user with selected role to sessionStorage
    sessionStorage.setItem('smart_maint_user', JSON.stringify({
      email: form.email,
      name: form.name,
      role: form.role,
      provider: 'email',
    }));
    onSuccess(form.email);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Full Name"
        type="text"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="John Doe"
        icon={User}
        error={errors.name}
      />
      <InputField
        label="Email Address"
        type="email"
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        placeholder="you@example.com"
        icon={Mail}
        error={errors.email}
      />

      {/* Role selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'developer',  label: 'Developer' },
            { id: 'devops',     label: 'DevOps' },
            { id: 'manager',    label: 'Manager' },
          ].map(r => (
            <button key={r.id} type="button" onClick={() => setForm(f => ({ ...f, role: r.id }))}
              className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                form.role === r.id
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:text-slate-300'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Password */}
      <div>
        <InputField
          label="Password"
          type={showPwd ? 'text' : 'password'}
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder="Min. 8 characters"
          icon={Lock}
          error={errors.password}
          rightElement={
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="text-slate-500 hover:text-slate-300 transition-colors">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        {/* Strength bar */}
        {form.password && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= strength ? strengthColor : '#1e293b' }} />
              ))}
            </div>
            <p className="text-[10px]" style={{ color: strengthColor }}>{strengthLabel} password</p>
          </div>
        )}
      </div>

      <InputField
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        value={form.confirm}
        onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
        placeholder="Re-enter your password"
        icon={Lock}
        error={errors.confirm}
        rightElement={
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="text-slate-500 hover:text-slate-300 transition-colors">
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {/* Terms */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input type="checkbox" required className="mt-0.5 w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-indigo-500 flex-shrink-0" />
        <span className="text-xs text-slate-400 leading-relaxed">
          I agree to the{' '}
          <button type="button" className="text-indigo-400 hover:text-indigo-300 transition-colors">Terms of Service</button>
          {' '}and{' '}
          <button type="button" className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</button>
        </span>
      </label>

      {apiError && (
        <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{apiError}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: loading ? '#4338ca' : 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)' }}>
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating account…</span></>
          : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
        }
      </button>
    </form>
  );
}

// ── OAuth Buttons ─────────────────────────────────────────────────────────────

function OAuthButtons({ onSuccess, onError }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  // Google OAuth — opens Google's account picker popup
  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        // Get user info directly from Google using the access token
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const user = {
          provider: 'google',
          email:    userInfo.data.email,
          name:     userInfo.data.name,
          picture:  userInfo.data.picture,
        };
        sessionStorage.setItem('smart_maint_user', JSON.stringify(user));
        onSuccess(user.email);
      } catch {
        onError('Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      onError('Google sign-in was cancelled or failed.');
      setGoogleLoading(false);
    },
  });

  // GitHub OAuth — redirects to GitHub authorization page
  const handleGitHub = () => {
    if (!GITHUB_CLIENT_ID) {
      onError(
        'GitHub OAuth is not configured. Add VITE_GITHUB_CLIENT_ID to your .env file. ' +
        'See the setup instructions below.'
      );
      return;
    }
    setGithubLoading(true);
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = 'read:user user:email';
    window.location.href =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Google */}
      <button
        type="button"
        onClick={() => { setGoogleLoading(true); handleGoogle(); }}
        disabled={googleLoading || githubLoading}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/60 border border-white/6 text-slate-400 hover:text-white hover:border-white/12 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Google
      </button>

      {/* GitHub */}
      <button
        type="button"
        onClick={handleGitHub}
        disabled={googleLoading || githubLoading}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/60 border border-white/6 text-slate-400 hover:text-white hover:border-white/12 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {githubLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        )}
        GitHub
      </button>
    </div>
  );
}

// ── Setup instructions shown when OAuth is not configured ─────────────────────
function SetupNotice({ provider }) {
  const steps = provider === 'google' ? [
    'Go to console.cloud.google.com',
    'Create a project → APIs & Services → Credentials',
    'Create OAuth 2.0 Client ID (Web application)',
    'Add http://localhost:5173 to Authorized JS origins',
    'Copy Client ID → add to frontend/.env as VITE_GOOGLE_CLIENT_ID=your_id',
  ] : [
    'Go to github.com/settings/developers → OAuth Apps',
    'Click "New OAuth App"',
    'Homepage URL: http://localhost:5173',
    'Callback URL: http://localhost:5173/auth/github/callback',
    'Copy Client ID → add to frontend/.env as VITE_GITHUB_CLIENT_ID=your_id',
    'Copy Client Secret → add to backend as GITHUB_CLIENT_SECRET=your_secret',
  ];
  return (
    <div className="mt-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-300">
      <p className="font-semibold mb-2">Setup required for {provider === 'google' ? 'Google' : 'GitHub'} OAuth:</p>
      <ol className="space-y-1 list-decimal list-inside text-amber-400/80">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

// ── Main Auth Page ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [tab, setTab] = useState('signin');
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  const handleSuccess = (email) => {
    setSuccess(email);
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'placeholder'}>
      <AuthPageInner
        tab={tab} setTab={setTab}
        success={success}
        apiError={apiError} setApiError={setApiError}
        handleSuccess={handleSuccess}
      />
    </GoogleOAuthProvider>
  );
}

function AuthPageInner({ tab, setTab, success, apiError, setApiError, handleSuccess }) {
  return (
    <div className="min-h-screen bg-[#080c14] flex font-sans">

      {/* ── Ambient background ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Left panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white tracking-wide">SMART-MAINT</p>
            <p className="text-[10px] text-slate-500 font-medium">Software Intelligence Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" /> AI-Powered Code Intelligence
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4">
            Predict maintenance<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #06b6d4)' }}>
              before it breaks
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Analyze code complexity, detect high-risk modules, simulate traffic growth,
            and get AI-powered recommendations — all in one platform.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8 relative z-10">
          {[['18', 'Stories Delivered'], ['45', 'Tests Passing'], ['5', 'Sprints Complete']].map(([n, l]) => (
            <div key={l}>
              <p className="text-2xl font-bold text-white">{n}</p>
              <p className="text-xs text-slate-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — Auth form ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-white">SMART-MAINT</p>
          </div>

          {/* Card */}
          <div className="bg-slate-900/70 backdrop-blur-xl border border-white/8 rounded-3xl p-8 shadow-2xl"
            style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}>

            {/* Success state */}
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {tab === 'signin' ? 'Welcome back!' : 'Account created!'}
                </h2>
                <p className="text-sm text-slate-400">Signed in as <span className="text-indigo-400">{success}</span></p>
                <p className="text-xs text-slate-600 mt-2">Redirecting to dashboard…</p>
              </div>
            ) : (
              <>
                {/* Tab switcher */}
                <div className="flex gap-1 p-1 bg-slate-800/60 rounded-2xl mb-7">
                  {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        tab === id
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Heading */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {tab === 'signin' ? 'Sign in to your account' : 'Create your account'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {tab === 'signin'
                      ? 'Enter your credentials to access the dashboard'
                      : 'Fill in the details below to get started'}
                  </p>
                </div>

                {/* Forms */}
                {tab === 'signin'
                  ? <SignInForm onSuccess={handleSuccess} />
                  : <SignUpForm onSuccess={handleSuccess} />
                }

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/6" />
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">or continue with</span>
                  <div className="flex-1 h-px bg-white/6" />
                </div>

                {/* OAuth buttons */}
                <OAuthButtons onSuccess={handleSuccess} onError={setApiError} />

                {/* Switch link */}
                <p className="text-center text-xs text-slate-500 mt-6">
                  {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    {tab === 'signin' ? 'Sign up free' : 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-700 mt-6">
            SMART-MAINT · Software Maintenance Intelligence Platform · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
