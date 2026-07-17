import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, FolderOpen, Github, TrendingUp, Server,
  MessageSquare, AlertTriangle, Activity, Code2, Layers,
  Search, ServerCrash, Send, Cpu, HardDrive, Wifi, DollarSign,
  ChevronRight, BarChart2, Bot, CheckCircle, Zap, FileText,
  RefreshCw, Lightbulb, ShieldAlert, Clock, Flame, Menu, X,
  GitBranch, Sparkles, ArrowUpRight, Shield, Database,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, AreaChart,
  Area, Cell, Treemap,
} from 'recharts';

const API = 'http://localhost:8000';

// â”€â”€â”€ User info from session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useUser() {
  const raw = sessionStorage.getItem('smart_maint_user');
  try {
    const user = raw ? JSON.parse(raw) : null;
    return {
      name:  user?.name  || 'User',
      email: user?.email || '',
      role:  user?.role  || 'developer',
    };
  } catch {
    return { name: 'User', email: '', role: 'developer' };
  }
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const scoreColor  = s => s > 70 ? 'text-red-400'    : s > 40 ? 'text-amber-400'    : 'text-emerald-400';
const scoreBarClr = s => s > 70 ? '#f87171'          : s > 40 ? '#fbbf24'           : '#34d399';
const scoreBadge  = s => s > 70 ? 'score-high'       : s > 40 ? 'score-medium'      : 'score-low';
const scoreLabel  = s => s > 70 ? 'High Risk'        : s > 40 ? 'Medium'            : 'Stable';

const fmt = n => typeof n === 'number' ? n.toLocaleString() : n;

// â”€â”€â”€ Shared primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Spinner = ({ size = 'sm' }) => (
  <div className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'}`} />
);

const ErrorBox = ({ msg }) => (
  <div className="mt-3 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-start gap-3 text-red-400">
    <ServerCrash className="w-4 h-4 mt-0.5 flex-shrink-0" />
    <p className="text-sm">{msg}</p>
  </div>
);

const Card = ({ children, className = '', glow = false }) => (
  <div className={`glass rounded-2xl ${glow ? 'glow-indigo' : ''} ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-indigo-500/10">
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const MetricCard = ({ title, value, icon: Icon, color, sub, trend }) => {
  const colors = {
    indigo: { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', border: 'border-indigo-500/10' },
    cyan:   { bg: 'bg-cyan-500/10',   icon: 'text-cyan-400',   border: 'border-cyan-500/10' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/10' },
    amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  border: 'border-amber-500/10' },
    red:    { bg: 'bg-red-500/10',    icon: 'text-red-400',    border: 'border-red-500/10' },
    green:  { bg: 'bg-emerald-500/10',icon: 'text-emerald-400',border: 'border-emerald-500/10' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className={`metric-card glass rounded-2xl p-5 border ${c.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? 'â†‘' : 'â†“'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{fmt(value)}</p>
      <p className="text-xs text-slate-500 mt-1">{title}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
};

const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-dark rounded-xl p-3 text-xs shadow-2xl min-w-[120px]">
      {label && <p className="text-slate-400 mb-2 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NAV = [
  { id: 'analysis', label: 'Code Analysis',     icon: LayoutDashboard, badge: null },
  { id: 'traffic',  label: 'Traffic & Scaling',  icon: TrendingUp,      badge: null },
  { id: 'chatbot',  label: 'AI Assistant',        icon: Sparkles,        badge: 'AI' },
];

function Sidebar({ active, setActive, analysisData, user }) {
  const health = analysisData?.summary?.average_maintenance_score;
  const grade = !health ? null : health > 70 ? { label: 'Poor', color: 'text-red-400', bg: 'bg-red-500/10' }
    : health > 40 ? { label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-500/10' }
    : { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };

  return (
    <aside className="flex flex-col w-64 min-h-screen glass-dark border-r border-white/5 px-4 py-6 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <GitBranch className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-wide">SMART-MAINT</p>
          <p className="text-[10px] text-slate-500 font-medium">v2.0 Â· DevOps AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-3">Navigation</p>
        {NAV.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`sidebar-item w-full text-left ${active === id ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Project health card */}
      {grade && (
        <div className={`mt-6 p-4 rounded-2xl ${grade.bg} border border-white/5`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Project Health</p>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-bold ${grade.color}`}>{grade.label}</span>
            <span className="text-xs text-slate-400">{health}/100</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${health}%`, background: health > 70 ? '#f87171' : health > 40 ? '#fbbf24' : '#34d399' }} />
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            {analysisData.summary.total_files} files Â· {analysisData.summary.high_risk_count} high risk
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 px-2 space-y-3">
        {/* User info */}
        <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              {user.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-xs text-slate-500">Backend connected</span>
        </div>
      </div>
    </aside>
  );
}

// â”€â”€â”€ Risk Heatmap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RiskHeatmap({ data }) {
  return (
    <Card>
      <CardHeader icon={Flame} title="Risk Heatmap" subtitle="Block size = LOC Â· Color = risk level" />
      <div className="p-4">
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400/80 inline-block" /> High Risk</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400/80 inline-block" /> Medium</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400/80 inline-block" /> Stable</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <Treemap data={data} dataKey="size" aspectRatio={4 / 3}
            content={({ x, y, width, height, name, score }) => {
              if (width < 2 || height < 2) return null;
              const fill = scoreBarClr(score);
              return (
                <g>
                  <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} rx={6}
                    style={{ fill, fillOpacity: 0.75, stroke: '#080c14', strokeWidth: 2 }} />
                  {width > 55 && height > 28 && (
                    <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle"
                      style={{ fontSize: Math.min(11, width / 9), fill: '#fff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                      {name.length > 14 ? name.slice(0, 12) + 'â€¦' : name}
                    </text>
                  )}
                </g>
              );
            }}>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="glass-dark rounded-xl p-3 text-xs shadow-2xl">
                  <p className="font-bold text-white mb-1">{d.fullPath}</p>
                  <p style={{ color: scoreBarClr(d.score) }}>Score: <b>{d.score}/100</b></p>
                  <p className="text-slate-400">LOC: {d.size}</p>
                </div>
              );
            }} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// â”€â”€â”€ AI Recommendations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PRIORITY_CFG = {
  critical: { bg: 'bg-red-500/8 border-red-500/20',    badge: 'bg-red-500/15 text-red-400 border-red-500/20',    icon: ShieldAlert,    dot: 'bg-red-400' },
  high:     { bg: 'bg-amber-500/8 border-amber-500/20', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: AlertTriangle, dot: 'bg-amber-400' },
  medium:   { bg: 'bg-blue-500/8 border-blue-500/20',   badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   icon: Activity,      dot: 'bg-blue-400' },
  low:      { bg: 'bg-slate-700/20 border-slate-700/30', badge: 'bg-slate-700/30 text-slate-400 border-slate-600/30', icon: CheckCircle,  dot: 'bg-slate-500' },
};

function AIRecommendations({ recommendations }) {
  const [open, setOpen] = useState(null);
  return (
    <Card>
      <CardHeader icon={Lightbulb} title="AI Recommendations"
        subtitle={`${recommendations.length} actionable insights from code analysis`} />
      <div className="p-4 space-y-2">
        {recommendations.map((rec, i) => {
          const cfg = PRIORITY_CFG[rec.priority] || PRIORITY_CFG.medium;
          const Icon = cfg.icon;
          const isOpen = open === i;
          return (
            <div key={i} className={`border rounded-xl overflow-hidden transition-all ${cfg.bg}`}>
              <button onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <Icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{rec.file}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{rec.actions[0]?.slice(0, 70)}â€¦</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`tag border ${cfg.badge} capitalize`}>{rec.priority}</span>
                  <span className={`text-xs font-bold ${scoreColor(rec.score)}`}>{rec.score}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-2">
                  {rec.actions.map((action, ai) => (
                    <div key={ai} className="flex items-start gap-2 text-xs text-slate-300">
                      <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span dangerouslySetInnerHTML={{ __html: action.replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-emerald-300 font-mono text-[10px]">$1</code>') }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// â”€â”€â”€ Analysis Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnalysisTable({ data, path }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const PAGE = 12;

  const rows = useMemo(() => {
    let r = [...(data?.details || [])];
    if (filter === 'high')   r = r.filter(x => x.score > 70);
    if (filter === 'medium') r = r.filter(x => x.score > 40 && x.score <= 70);
    if (filter === 'low')    r = r.filter(x => x.score <= 40);
    r.sort((a, b) => {
      const av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return r;
  }, [data, filter, sortBy, sortDir]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);

  const sort = (f) => { if (sortBy === f) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortBy(f); setSortDir('desc'); } setPage(1); };
  const SortArrow = ({ f }) => sortBy !== f ? <span className="text-slate-700 ml-1">â†•</span> : <span className="text-indigo-400 ml-1">{sortDir === 'desc' ? 'â†“' : 'â†‘'}</span>;

  const doExport = async (fmt) => {
    if (!path?.trim()) return;
    setExporting(true);
    try {
      const res = await axios.post(`${API}/api/analyze/export?format=${fmt}`, { directory_path: path }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `smart_maint.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally { setExporting(false); }
  };

  const FILTERS = [
    { id: 'all',    label: `All (${data?.details?.length ?? 0})`, cls: 'text-slate-300' },
    { id: 'high',   label: `High (${data?.summary?.high_risk_count ?? 0})`,   cls: 'text-red-400' },
    { id: 'medium', label: `Med (${data?.summary?.medium_risk_count ?? 0})`,  cls: 'text-amber-400' },
    { id: 'low',    label: `Low (${data?.summary?.low_risk_count ?? 0})`,     cls: 'text-emerald-400' },
  ];

  return (
    <Card>
      <CardHeader icon={Layers} title="Component Analysis"
        subtitle="Click column headers to sort"
        action={
          <div className="flex items-center gap-2">
            {path && <>
              <button onClick={() => doExport('csv')} disabled={exporting}
                className="text-xs px-3 py-1.5 glass rounded-lg text-slate-400 hover:text-white transition-all border border-white/5 flex items-center gap-1.5">
                <Code2 className="w-3 h-3" /> CSV
              </button>
              <button onClick={() => doExport('json')} disabled={exporting}
                className="text-xs px-3 py-1.5 glass rounded-lg text-slate-400 hover:text-white transition-all border border-white/5 flex items-center gap-1.5">
                <Database className="w-3 h-3" /> JSON
              </button>
            </>}
          </div>
        }
      />
      {/* Filter pills */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => { setFilter(f.id); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filter === f.id ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : `${f.cls} opacity-60 hover:opacity-100`}`}>
            {f.label}
          </button>
        ))}
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              {[['file','File'],['loc','LOC'],['complexity','Complexity'],['coupling','Coupling'],['change_frequency','Commits'],['score','Score']].map(([f,l]) => (
                <th key={f} onClick={() => sort(f)}
                  className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none ${f !== 'file' ? 'text-right' : ''}`}>
                  {l}<SortArrow f={f} />
                </th>
              ))}
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-center">Risk</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((file, i) => (
              <tr key={i} className={`border-b border-white/3 hover:bg-white/2 transition-colors group ${file.is_high_risk ? 'bg-red-500/3' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {file.is_high_risk && <div className="w-1 h-4 rounded-full bg-red-500 flex-shrink-0" />}
                    <span className="text-xs font-mono text-slate-300 truncate max-w-[220px]" title={file.file}>
                      {file.file}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 text-right font-mono">{file.loc}</td>
                <td className="px-4 py-3 text-xs text-slate-500 text-right font-mono">{file.complexity}</td>
                <td className="px-4 py-3 text-xs text-slate-500 text-right font-mono">{file.coupling}</td>
                <td className="px-4 py-3 text-xs text-slate-500 text-right font-mono">{file.change_frequency ?? 'â€”'}</td>
                <td className={`px-4 py-3 text-xs text-right font-bold font-mono ${scoreColor(file.score)}`}>{file.score}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`tag border ${scoreBadge(file.score)}`}>{scoreLabel(file.score)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-12 text-center text-slate-600 text-sm">No files match this filter.</p>}
      </div>
      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-xs text-slate-600">{(page-1)*PAGE+1}â€“{Math.min(page*PAGE, rows.length)} of {rows.length}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="px-3 py-1 text-xs glass rounded-lg text-slate-400 disabled:opacity-30 hover:text-white transition-all">â† Prev</button>
            {Array.from({length: Math.min(5,pages)}, (_,i) => {
              const pg = Math.max(1, Math.min(page-2, pages-4)) + i;
              return <button key={pg} onClick={() => setPage(pg)}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${pg===page ? 'bg-indigo-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>{pg}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}
              className="px-3 py-1 text-xs glass rounded-lg text-slate-400 disabled:opacity-30 hover:text-white transition-all">Next â†’</button>
          </div>
        </div>
      )}
    </Card>
  );
}

// â”€â”€â”€ Code Analysis Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnalysisTab() {
  const [mode, setMode] = useState('folder');
  const [path, setPath] = useState('');
  const [ghUrl, setGhUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [interval, setIntervalVal] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const timerRef = useRef(null);

  const doFetch = async (p, g, m) => {
    setLoading(true); setError('');
    try {
      const res = m === 'github'
        ? await axios.post(`${API}/api/analyze/github`, { repo_url: g })
        : await axios.post(`${API}/api/analyze`, { directory_path: p });
      setData(res.data); setLastRefresh(new Date());
    } catch (e) { setError(e.response?.data?.detail || 'Failed to connect to the analysis server.'); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); doFetch(path, ghUrl, mode); };

  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh && path && data && mode === 'folder')
      timerRef.current = setInterval(() => doFetch(path, '', 'folder'), interval * 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, interval, path, data, mode]);

  const doPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await axios.post(
        mode === 'github' ? `${API}/api/analyze/github/pdf` : `${API}/api/analyze/pdf`,
        mode === 'github' ? { repo_url: ghUrl } : { directory_path: path },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'smart_maint_report.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('PDF generation failed.'); } finally { setPdfLoading(false); }
  };

  const chartData = data?.top_risk_files?.map(f => ({
    name: f.file.split(/[\\/]/).pop(), score: f.score, complexity: f.complexity, coupling: f.coupling,
  })) || [];

  const heatData = data?.details?.map(f => ({
    name: f.file.split(/[\\/]/).pop(), fullPath: f.file, size: Math.max(f.loc, 10), score: f.score,
  })) || [];

  return (
    <div className="space-y-6 fade-in-up">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Code Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Scan your project for maintenance risk and complexity metrics</p>
      </div>

      {/* Input card */}
      <Card glow>
        <div className="p-6">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-5">
            {[['folder', FolderOpen, 'Local Folder'], ['github', Github, 'GitHub Repo']].map(([id, Icon, label]) => (
              <button key={id} onClick={() => setMode(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {/* Input + button */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {mode === 'github' ? <Github className="w-4 h-4 text-slate-500" /> : <FolderOpen className="w-4 h-4 text-slate-500" />}
              </div>
              <input
                className="smart-input pl-11 pr-4 py-3.5 text-sm"
                placeholder={mode === 'github' ? 'https://github.com/owner/repository' : 'C:\\projects\\myapp  or  /home/user/project'}
                value={mode === 'github' ? ghUrl : path}
                onChange={e => mode === 'github' ? setGhUrl(e.target.value) : setPath(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading || (mode === 'folder' ? !path.trim() : !ghUrl.trim())} className="btn-primary">
              {loading ? <><Spinner /><span>Scanningâ€¦</span></> : <><Search className="w-4 h-4" /><span>Analyze</span></>}
            </button>
          </form>

          {error && <ErrorBox msg={error} />}

          {/* Controls row â€” shown after first analysis */}
          {data && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/5">
              {/* Auto-refresh â€” Developer & DevOps only */}
              {mode === 'folder' && (
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div onClick={() => setAutoRefresh(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" /> Auto-refresh
                    {autoRefresh && <span className="text-indigo-400 font-medium">â— live</span>}
                  </span>
                  {autoRefresh && (
                    <select value={interval} onChange={e => setIntervalVal(Number(e.target.value))}
                      className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300">
                      {[10,30,60,120,300].map(s => <option key={s} value={s}>{s < 60 ? `${s}s` : `${s/60}m`}</option>)}
                    </select>
                  )}
                </label>
              )}
              {lastRefresh && (
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              {/* PDF button â€” visible for all users once data is loaded */}
              <button onClick={doPdf} disabled={pdfLoading}
                className="ml-auto flex items-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 hover:text-red-300 text-xs px-4 py-2">
                {pdfLoading ? <Spinner /> : <FileText className="w-3.5 h-3.5" />}
                Download PDF Report
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* PDF prominent banner â€” shown after analysis */}
      {data && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Report Ready</p>
            <p className="text-xs text-slate-400 mt-0.5">Download a professional PDF with full analysis, risk summary, and AI recommendations</p>
          </div>
          <button onClick={doPdf} disabled={pdfLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex-shrink-0 ml-4">
            {pdfLoading ? <Spinner /> : <FileText className="w-4 h-4" />}
            Download PDF Report
          </button>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 fade-in-up-1">
            <MetricCard title="Files Analyzed"   value={data.summary.total_files}                    icon={Layers}        color="indigo" />
            <MetricCard title="Lines of Code"    value={data.summary.total_loc.toLocaleString()}     icon={Code2}         color="cyan" />
            <MetricCard title="Avg Complexity"   value={data.summary.average_complexity}             icon={Activity}      color="purple" />
            <MetricCard title="Avg Score"        value={`${data.summary.average_maintenance_score}`} icon={BarChart2}     color="amber" />
            <MetricCard title="High Risk Files"  value={data.summary.high_risk_count}                icon={AlertTriangle} color="red" />
            <MetricCard title="Stable Files"     value={data.summary.low_risk_count}                 icon={CheckCircle}   color="green" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in-up-2">
            {/* Top files */}
            <Card>
              <CardHeader icon={BarChart2} title="Top Files by Risk Score" subtitle="Sorted highest to lowest" />
              <div className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis type="number" domain={[0,100]} tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TooltipBox />} />
                    <Bar dataKey="score" name="Score" radius={[0,6,6,0]} maxBarSize={18}>
                      {chartData.map((e,i) => <Cell key={i} fill={scoreBarClr(e.score)} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Risk distribution */}
            <Card>
              <CardHeader icon={Shield} title="Risk Distribution" subtitle="Breakdown by severity level" />
              <div className="p-6 space-y-5">
                {[
                  { label:'High Risk',   val: data.summary.high_risk_count,   color:'#f87171', bg:'bg-red-500/10' },
                  { label:'Medium Risk', val: data.summary.medium_risk_count, color:'#fbbf24', bg:'bg-amber-500/10' },
                  { label:'Low Risk',    val: data.summary.low_risk_count,    color:'#34d399', bg:'bg-emerald-500/10' },
                ].map(d => (
                  <div key={d.label}>
                    <div className="flex justify-between text-xs mb-2">
                      <span style={{ color: d.color }} className="font-semibold">{d.label}</span>
                      <span className="text-slate-500">{d.val} / {data.summary.total_files} files</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width:`${data.summary.total_files ? (d.val/data.summary.total_files)*100 : 0}%`, backgroundColor: d.color, opacity: 0.8 }} />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">Complexity vs Coupling</p>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={chartData.slice(0,6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                      <XAxis dataKey="name" tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TooltipBox />} />
                      <Legend wrapperStyle={{ fontSize:10, color:'#64748b' }} />
                      <Bar dataKey="complexity" name="Complexity" fill="#818cf8" radius={[3,3,0,0]} maxBarSize={14} />
                      <Bar dataKey="coupling"   name="Coupling"   fill="#38bdf8" radius={[3,3,0,0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </div>

          {/* Heatmap */}
          {heatData.length > 0 && <div className="fade-in-up-3"><RiskHeatmap data={heatData} /></div>}

          {/* AI Recommendations */}
          {data.recommendations?.length > 0 && <AIRecommendations recommendations={data.recommendations} />}

          {/* Metrics table */}
          <AnalysisTable data={data} path={mode === 'folder' ? path : ''} />
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Ready to analyze</h3>
          <p className="text-sm text-slate-500 max-w-sm">Enter a local folder path or GitHub URL above to scan your project for maintenance risks and complexity metrics.</p>
          <div className="flex gap-6 mt-8 text-xs text-slate-600">
            {[['LOC', 'Lines of Code'], ['Complexity', 'Cyclomatic'], ['Coupling', 'Dependencies'], ['Risk Score', '0â€“100']].map(([k,v]) => (
              <div key={k} className="text-center">
                <p className="text-slate-400 font-semibold">{k}</p>
                <p>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Traffic & Scaling Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TrafficTab() {
  const [form, setForm] = useState({ current_users: 100, growth_rate_percent: 15, months: 12 });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/api/traffic`, {
        current_users: Number(form.current_users),
        growth_rate_percent: Number(form.growth_rate_percent),
        months: Number(form.months),
      });
      setData(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Simulation failed.'); }
    finally { setLoading(false); }
  };

  const cap = data?.projected_capacity;

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Traffic & Scaling</h1>
        <p className="text-sm text-slate-500 mt-1">Simulate user growth and estimate infrastructure requirements</p>
      </div>

      {/* Form */}
      <Card glow>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { key:'current_users',       label:'Current Concurrent Users', min:1,   max:1000000, step:1,   icon:Server },
              { key:'growth_rate_percent', label:'Monthly Growth Rate (%)',  min:0.1, max:500,     step:0.1, icon:TrendingUp },
              { key:'months',              label:'Projection Horizon',       min:1,   max:36,      step:1,   icon:Clock, suffix:'months' },
            ].map(({ key, label, min, max, step, icon: Icon, suffix }) => (
              <div key={key}>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
                  <Icon className="w-3.5 h-3.5" />{label}
                </label>
                <div className="relative">
                  <input type="number" min={min} max={max} step={step} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="smart-input px-4 py-3 text-sm pr-16" />
                  {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">{suffix}</span>}
                </div>
              </div>
            ))}
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><Spinner /><span>Simulatingâ€¦</span></> : <><Zap className="w-4 h-4" /><span>Run Simulation</span></>}
              </button>
            </div>
          </form>
          {error && <ErrorBox msg={error} />}
        </div>
      </Card>

      {data && cap && (
        <div className="space-y-6">
          {/* Capacity metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="CPU Cores"  value={`${cap.cpu_cores} vCPU`}    icon={Cpu}      color="indigo" sub={`${cap.concurrent_users} peak users`} />
            <MetricCard title="RAM"        value={`${cap.ram_gb} GB`}          icon={HardDrive} color="purple" />
            <MetricCard title="Storage"    value={`${cap.storage_gb} GB`}      icon={Database}  color="cyan" />
            <MetricCard title="Bandwidth"  value={`${cap.bandwidth_mbps} Mbps`} icon={Wifi}     color="green" />
          </div>

          {/* Traffic chart */}
          <Card>
            <CardHeader icon={TrendingUp} title="User Traffic Projection" subtitle={`${form.months}-month forecast at ${form.growth_rate_percent}% monthly growth`} />
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.traffic_timeline}>
                  <defs>
                    <linearGradient id="avgG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="peakG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="label" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
                  <Area type="monotone" dataKey="avg_concurrent_users"  name="Avg Users"  stroke="#818cf8" fill="url(#avgG)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="peak_concurrent_users" name="Peak Users" stroke="#f87171" fill="url(#peakG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Infra + recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader icon={Server} title="Projected Infrastructure" />
              <div className="p-4 space-y-0">
                {[
                  ['Scaling Tier',       cap.tier,                                    'text-white font-bold'],
                  ['Instance Type',      cap.instance_type,                           'text-indigo-300 text-xs'],
                  ['Est. Monthly Cost',  `$${cap.estimated_monthly_cost_usd}/mo`,     'text-emerald-400 font-bold text-lg'],
                  ['Scaling Required',   data.scaling_needed ? 'âš  Yes' : 'âœ“ No',    data.scaling_needed ? 'text-amber-400' : 'text-emerald-400'],
                ].map(([k,v,cls]) => (
                  <div key={k} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                    <span className="text-xs text-slate-500">{k}</span>
                    <span className={`text-sm ${cls}`}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader icon={Zap} title="Scaling Recommendations" />
              <div className="p-4 space-y-3">
                {data.scaling_recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-slate-300">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Cost timeline */}
          <Card>
            <CardHeader icon={DollarSign} title="Monthly Cost Projection" subtitle="Estimated infrastructure cost over time" />
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.capacity_timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                  <XAxis dataKey="label" tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipBox />} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
                  <Line type="monotone" dataKey="capacity.estimated_monthly_cost_usd" name="Cost ($)"    stroke="#34d399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="capacity.cpu_cores"                  name="CPU Cores"  stroke="#818cf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="capacity.ram_gb"                     name="RAM (GB)"   stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
            <TrendingUp className="w-7 h-7 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Traffic Simulator</h3>
          <p className="text-sm text-slate-500 max-w-sm">Configure your current user count and expected growth rate, then run the simulation to get infrastructure recommendations.</p>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Chatbot Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderMd(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const els = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) { els.push(<h4 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(3)}</h4>); i++; continue; }
    if (line.startsWith('```')) {
      const code = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      els.push(<pre key={i} className="bg-slate-900/80 rounded-xl p-3 text-[11px] text-emerald-300 overflow-x-auto my-2 font-mono border border-white/5">{code.join('\n')}</pre>);
      i++; continue;
    }
    if (line.startsWith('|')) {
      const tlines = []; while (i < lines.length && lines[i].startsWith('|')) { tlines.push(lines[i]); i++; }
      const rows = tlines.filter(l => !l.match(/^\|[-| ]+\|$/));
      els.push(<div key={i} className="overflow-x-auto my-2"><table className="text-[11px] w-full border-collapse">
        {rows.map((row, ri) => { const cells = row.split('|').filter(c => c.trim()); return (
          <tr key={ri} className={ri === 0 ? 'bg-slate-800/60' : 'border-t border-white/5'}>
            {cells.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-slate-300">{cell.trim()}</td>)}
          </tr>); })}
      </table></div>); continue;
    }
    if (line.startsWith('- ') || line.startsWith('â€¢ ')) {
      els.push(<li key={i} className="flex items-start gap-2 text-xs text-slate-300 my-0.5">
        <span className="text-indigo-400 mt-0.5">â€¢</span>
        <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-slate-800 px-1 rounded text-emerald-300 font-mono text-[10px]">$1</code>') }} />
      </li>); i++; continue;
    }
    if (/^\d+\. /.test(line)) {
      const num = line.match(/^\d+/)[0]; const txt = line.replace(/^\d+\. /,'');
      els.push(<li key={i} className="flex items-start gap-2 text-xs text-slate-300 my-0.5 ml-2">
        <span className="text-indigo-400 font-bold flex-shrink-0">{num}.</span>
        <span dangerouslySetInnerHTML={{ __html: txt.replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-slate-800 px-1 rounded text-emerald-300 font-mono text-[10px]">$1</code>') }} />
      </li>); i++; continue;
    }
    if (!line.trim()) { els.push(<div key={i} className="h-1" />); i++; continue; }
    els.push(<p key={i} className="text-xs text-slate-300 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-slate-800 px-1 rounded text-emerald-300 font-mono text-[10px]">$1</code>').replace(/\*(.*?)\*/g,'<em class="text-slate-200">$1</em>') }} />);
    i++;
  }
  return <div className="space-y-0.5">{els}</div>;
}

function ChatbotTab() {
  const [msgs, setMsgs] = useState([{
    role:'bot',
    text:"Hello! I'm the **SMART-MAINT** AI assistant.\n\nAsk me anything about maintenance scores, high-risk modules, traffic simulation, or server capacity.",
    suggestions:['What is a maintenance score?','Which modules are high risk?','How does traffic simulation work?'],
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = async (text) => {
    const msg = text || input.trim(); if (!msg) return;
    setInput(''); setMsgs(p => [...p, { role:'user', text:msg }]); setLoading(true);
    try {
      const res = await axios.post(`${API}/api/chat`, { message: msg });
      setMsgs(p => [...p, { role:'bot', text:res.data.response, suggestions:res.data.suggestions }]);
    } catch {
      setMsgs(p => [...p, { role:'bot', text:'Sorry, I could not reach the server. Make sure the backend is running on port 8000.', suggestions:[] }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-sm text-slate-500 mt-1">Ask questions about maintenance, risk, traffic, or infrastructure in plain English</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">SMART-MAINT Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                <span className="text-[10px] text-slate-500">Online Â· Domain-specific AI</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[420px] overflow-y-auto p-4 space-y-4">
            {msgs.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center mr-2.5 flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'max-w-[60%]' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm text-xs'
                    : 'glass rounded-tl-sm border border-white/5'}`}>
                    {msg.role === 'user' ? <p className="text-xs">{msg.text}</p> : renderMd(msg.text)}
                  </div>
                  {msg.role === 'bot' && msg.suggestions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map((s, si) => (
                        <button key={si} onClick={() => send(s)}
                          className="text-[10px] px-2.5 py-1 glass border border-white/8 text-slate-400 hover:text-white hover:border-indigo-500/30 rounded-full transition-all">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center mr-2.5 flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
                  <div className="flex gap-1">
                    {[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay:`${d*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder="Ask about maintenance, risk, traffic, or scalingâ€¦"
                className="smart-input flex-1 px-4 py-3 text-sm" />
              <button type="submit" disabled={loading || !input.trim()}
                className="btn-primary px-4 py-3 disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}


// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = useUser();

  // Analysis state lifted here so it persists when switching tabs
  const [mode, setMode] = useState('folder');
  const [path, setPath] = useState('');
  const [ghUrl, setGhUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const timerRef = useRef(null);

  const doFetch = async (p, g, m) => {
    setLoading(true); setError('');
    try {
      const res = m === 'github'
        ? await axios.post(`${API}/api/analyze/github`, { repo_url: g })
        : await axios.post(`${API}/api/analyze`, { directory_path: p });
      setAnalysisData(res.data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to connect to the analysis server.');
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); doFetch(path, ghUrl, mode); };

  useEffect(() => {
    clearInterval(timerRef.current);
    if (autoRefresh && path && analysisData && mode === 'folder')
      timerRef.current = setInterval(() => doFetch(path, '', 'folder'), refreshInterval * 1000);
    return () => clearInterval(timerRef.current);
  }, [autoRefresh, refreshInterval, path, analysisData, mode]);

  const doPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await axios.post(
        mode === 'github' ? `${API}/api/analyze/github/pdf` : `${API}/api/analyze/pdf`,
        mode === 'github' ? { repo_url: ghUrl } : { directory_path: path },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'smart_maint_report.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('PDF generation failed. Make sure the backend is running.'); }
    finally { setPdfLoading(false); }
  };

  const chartData = analysisData?.top_risk_files?.map(f => ({
    name: f.file.split(/[\\/]/).pop(), score: f.score, complexity: f.complexity, coupling: f.coupling,
  })) || [];

  const heatData = analysisData?.details?.map(f => ({
    name: f.file.split(/[\\/]/).pop(), fullPath: f.file, size: Math.max(f.loc, 10), score: f.score,
  })) || [];

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && <Sidebar active={activeTab} setActive={setActiveTab} analysisData={analysisData} user={user} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-[100] flex items-center justify-between px-6 py-3 glass-dark border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(v => !v)}
              className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-white/10" />
            <nav className="flex items-center gap-1">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === id ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span>API connected</span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* Code Analysis Tab — uses display:none so state is never lost */}
          <div style={{ display: activeTab === 'analysis' ? 'block' : 'none' }}>
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Code Analysis</h1>
                <p className="text-sm text-slate-500 mt-1">Scan your project for maintenance risk and complexity metrics</p>
              </div>

              <Card glow>
                <div className="p-6">
                  <div className="flex gap-2 mb-5">
                    {[['folder', FolderOpen, 'Local Folder'], ['github', Github, 'GitHub Repo']].map(([id, Icon, label]) => (
                      <button key={id} onClick={() => setMode(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode === id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        {mode === 'github' ? <Github className="w-4 h-4 text-slate-500" /> : <FolderOpen className="w-4 h-4 text-slate-500" />}
                      </div>
                      <input className="smart-input pl-11 pr-4 py-3.5 text-sm"
                        placeholder={mode === 'github' ? 'https://github.com/owner/repository' : 'C:\\projects\\myapp  or  /home/user/project'}
                        value={mode === 'github' ? ghUrl : path}
                        onChange={e => mode === 'github' ? setGhUrl(e.target.value) : setPath(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading || (mode === 'folder' ? !path.trim() : !ghUrl.trim())} className="btn-primary">
                      {loading ? <><Spinner /><span>Scanning…</span></> : <><Search className="w-4 h-4" /><span>Analyze</span></>}
                    </button>
                  </form>
                  {error && <ErrorBox msg={error} />}
                  {analysisData && (
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/5">
                      {mode === 'folder' && (
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <div onClick={() => setAutoRefresh(v => !v)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-4' : ''}`} />
                          </div>
                          <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3" /> Auto-refresh
                            {autoRefresh && <span className="text-indigo-400 font-medium">● live</span>}
                          </span>
                          {autoRefresh && (
                            <select value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))}
                              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300">
                              {[10,30,60,120,300].map(s => <option key={s} value={s}>{s < 60 ? `${s}s` : `${s/60}m`}</option>)}
                            </select>
                          )}
                        </label>
                      )}
                      {lastRefresh && (
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {lastRefresh.toLocaleTimeString()}
                          {autoRefresh && <span className="text-indigo-400 ml-1">● live</span>}
                        </span>
                      )}
                      <button onClick={doPdf} disabled={pdfLoading}
                        className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 hover:text-red-300 transition-all disabled:opacity-50">
                        {pdfLoading ? <Spinner /> : <FileText className="w-3.5 h-3.5" />}
                        Download PDF Report
                      </button>
                    </div>
                  )}
                </div>
              </Card>

              {analysisData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    <MetricCard title="Files Analyzed"  value={analysisData.summary.total_files}                    icon={Layers}        color="indigo" />
                    <MetricCard title="Lines of Code"   value={analysisData.summary.total_loc.toLocaleString()}     icon={Code2}         color="cyan" />
                    <MetricCard title="Avg Complexity"  value={analysisData.summary.average_complexity}             icon={Activity}      color="purple" />
                    <MetricCard title="Avg Score"       value={analysisData.summary.average_maintenance_score}      icon={BarChart2}     color="amber" />
                    <MetricCard title="High Risk Files" value={analysisData.summary.high_risk_count}                icon={AlertTriangle} color="red" />
                    <MetricCard title="Stable Files"    value={analysisData.summary.low_risk_count}                 icon={CheckCircle}   color="green" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader icon={BarChart2} title="Top Files by Risk Score" subtitle="Sorted highest to lowest" />
                      <div className="p-4">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={chartData} layout="vertical" margin={{ left:0, right:16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                            <XAxis type="number" domain={[0,100]} tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<TooltipBox />} />
                            <Bar dataKey="score" name="Score" radius={[0,6,6,0]} maxBarSize={18}>
                              {chartData.map((e,i) => <Cell key={i} fill={scoreBarClr(e.score)} fillOpacity={0.85} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    <Card>
                      <CardHeader icon={Shield} title="Risk Distribution" />
                      <div className="p-6 space-y-5">
                        {[
                          { label:'High Risk',   val:analysisData.summary.high_risk_count,   color:'#f87171' },
                          { label:'Medium Risk', val:analysisData.summary.medium_risk_count, color:'#fbbf24' },
                          { label:'Low Risk',    val:analysisData.summary.low_risk_count,    color:'#34d399' },
                        ].map(d => (
                          <div key={d.label}>
                            <div className="flex justify-between text-xs mb-2">
                              <span style={{ color:d.color }} className="font-semibold">{d.label}</span>
                              <span className="text-slate-500">{d.val} / {analysisData.summary.total_files}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000"
                                style={{ width:`${analysisData.summary.total_files ? (d.val/analysisData.summary.total_files)*100 : 0}%`, backgroundColor:d.color, opacity:0.8 }} />
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 border-t border-white/5">
                          <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">Complexity vs Coupling</p>
                          <ResponsiveContainer width="100%" height={130}>
                            <BarChart data={chartData.slice(0,6)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
                              <XAxis dataKey="name" tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                              <Tooltip content={<TooltipBox />} />
                              <Legend wrapperStyle={{ fontSize:10, color:'#64748b' }} />
                              <Bar dataKey="complexity" name="Complexity" fill="#818cf8" radius={[3,3,0,0]} maxBarSize={14} />
                              <Bar dataKey="coupling"   name="Coupling"   fill="#38bdf8" radius={[3,3,0,0]} maxBarSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </Card>
                  </div>
                  {heatData.length > 0 && <RiskHeatmap data={heatData} />}
                  {analysisData.recommendations?.length > 0 && <AIRecommendations recommendations={analysisData.recommendations} />}
                  <AnalysisTable data={analysisData} path={mode === 'folder' ? path : ''} />
                </div>
              )}

              {!analysisData && !loading && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <Search className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to analyze</h3>
                  <p className="text-sm text-slate-500 max-w-sm">Enter a local folder path or GitHub URL above to scan your project for maintenance risks and complexity metrics.</p>
                  <div className="flex gap-6 mt-8 text-xs text-slate-600">
                    {[['LOC','Lines of Code'],['Complexity','Cyclomatic'],['Coupling','Dependencies'],['Risk Score','0–100']].map(([k,v]) => (
                      <div key={k} className="text-center"><p className="text-slate-400 font-semibold">{k}</p><p>{v}</p></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'traffic' && <TrafficTab />}
          {activeTab === 'chatbot' && <ChatbotTab />}

        </main>
      </div>
    </div>
  );
}
