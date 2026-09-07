'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight, ChevronLeft, Menu, Search, Lock, Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react';
import { getCampaignUrl } from '@/utils/slug';
import { getLinkBadgeStyle } from '@/utils/linkStyles';

interface BlastSummary {
  id: number;
  name: string;
  status: string;
  share_token: string;
  sent_at: string | null;
  created_at: string;
  contact_list_name?: string;
  targeted_batch_name?: string;
  target_display?: string;
}

interface ContainerSummary {
  id: number | null;
  name: string;
  slug?: string;
  share_token?: string;
  created_at: string | null;
  blasts: BlastSummary[];
}

interface PublicAnalyticsData {
  campaign_name: string;
  advance_campaign_name?: string | null;
  contact_list_name?: string | null;
  targeted_batch_name?: string | null;
  target_display?: string | null;
  totals?: {
    total_recipients: number;
    total_delivered: number;
    total_opens: number;
    total_clicks: number;
  };
  data: Array<{
    speaker_name: string;
    email: string;
    delivery_status: string;
    links_clicked: string;
    opened_at: string | null;
    clicked_at: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  pending: 'text-gray-400',
  sent: 'text-gray-600',
  delivered: 'text-emerald-600',
  opened: 'text-blue-600',
  clicked: 'text-violet-600',
  failed: 'text-red-600',
  unsubscribed: 'text-orange-600',
  complaint: 'text-red-800',
  deferred: 'text-yellow-600',
  hard_bounce: 'text-red-700',
  soft_bounce: 'text-orange-500',
  invalid_email: 'text-rose-600',
  blocked: 'text-slate-600',
  error: 'text-red-900',
};

const statusBg: Record<string, string> = {
  pending: 'bg-gray-100',
  sent: 'bg-gray-100',
  delivered: 'bg-emerald-50',
  opened: 'bg-blue-50',
  clicked: 'bg-violet-50',
  failed: 'bg-red-50',
  unsubscribed: 'bg-orange-50',
  complaint: 'bg-red-100',
  deferred: 'bg-yellow-50',
  hard_bounce: 'bg-red-50',
  soft_bounce: 'bg-orange-50',
  invalid_email: 'bg-rose-50',
  blocked: 'bg-slate-100',
  error: 'bg-red-100',
};

function PasswordGate({ onUnlock }: { onUnlock: (pwd: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await onUnlock(password);
    } catch (err: any) {
      if (err.message === 'password_required') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Incorrect password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-center w-14 h-14 bg-gray-900 rounded-2xl mx-auto mb-6">
          <Lock size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Protected Link</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Enter the password to access this analytics view.</p>
        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Enter password..."
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 transition-all"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={submit}
            disabled={!password || loading}
            className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Checking...' : 'Access Analytics'}
          </button>
        </div>
      </div>
    </div>
  );
}

const getStatusDot = (status: string) => {
  const colors: Record<string, string> = {
    sent: 'bg-emerald-500', sending: 'bg-blue-400',
    failed: 'bg-red-500', scheduled: 'bg-yellow-500', draft: 'bg-gray-300',
  };
  return colors[status] || 'bg-gray-400';
};

const sortContainersByRecentBlast = (list: ContainerSummary[]): ContainerSummary[] => {
  return [...list]
    .map(c => ({
      ...c,
      blasts: [...c.blasts].sort((a, b) => {
        const timeA = a.sent_at ? new Date(a.sent_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const timeB = b.sent_at ? new Date(b.sent_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return timeB - timeA;
      })
    }))
    .sort((a, b) => {
      const getRecency = (c: ContainerSummary) => {
        let latestBlastTime = 0;
        for (const blast of c.blasts) {
          const t = blast.sent_at
            ? new Date(blast.sent_at).getTime()
            : (blast.created_at ? new Date(blast.created_at).getTime() : 0);
          if (t > latestBlastTime) latestBlastTime = t;
        }
        if (latestBlastTime > 0) return latestBlastTime;
        return c.created_at ? new Date(c.created_at).getTime() : 0;
      };
      return getRecency(b) - getRecency(a);
    });
};

function getCampaignTimeStatus(container: ContainerSummary): string | null {
  let latestDateStr: string | null = null;
  let latestTime = 0;

  for (const b of container.blasts) {
    const d = b.sent_at || b.created_at;
    if (d) {
      const t = new Date(d).getTime();
      if (t > latestTime) {
        latestTime = t;
        latestDateStr = d;
      }
    }
  }

  if (!latestDateStr && container.created_at) {
    latestDateStr = container.created_at;
  }

  if (!latestDateStr) return null;

  const date = new Date(latestDateStr);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'today';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  const nowDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dateDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const calendarDaysDiff = Math.round((nowDayStart - dateDayStart) / (1000 * 60 * 60 * 24));

  if (calendarDaysDiff <= 0) {
    if (diffHours >= 1) {
      return `${diffHours}h ago`;
    }
    return 'today';
  }

  if (calendarDaysDiff === 1) {
    return 'yesterday';
  }

  if (calendarDaysDiff < 30) {
    return `${calendarDaysDiff}d ago`;
  }

  const diffMonths = Math.floor(calendarDaysDiff / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  return `${Math.floor(calendarDaysDiff / 365)}y ago`;
}

export default function MasterLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContainerId, setExpandedContainerId] = useState<number | null | 'other'>(null);
  const [selectedBlastToken, setSelectedBlastToken] = useState<string>('');

  const [analytics, setAnalytics] = useState<PublicAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchContainers = async (password = '') => {
    const trimmed = password.trim();
    const url = trimmed
      ? `${API_BASE_URL}/api/v1/public/master-link/${token}/campaigns/?password=${encodeURIComponent(trimmed)}`
      : `${API_BASE_URL}/api/v1/public/master-link/${token}/campaigns/`;
    const headers: Record<string, string> = {};
    if (trimmed) {
      headers['X-Master-Password'] = trimmed;
    }
    const res = await fetch(url, { headers, cache: 'no-store' });
    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      if (body.detail === 'password_required') {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`master_pwd_${token}`);
        }
        setNeedsPassword(true);
        setLoading(false);
        throw new Error('password_required');
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Server error (${res.status}). Please try again.`);
    }
    return res.json() as Promise<ContainerSummary[]>;
  };

  useEffect(() => {
    let isCurrent = true;
    const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
    fetchContainers(savedPwd)
      .then((data) => {
        if (isCurrent) {
          const sorted = sortContainersByRecentBlast(data);
          setContainers(sorted);
          setLoading(false);
          if (sorted.length > 0) {
            setExpandedContainerId(sorted[0].id ?? 'other');
            if (sorted[0].blasts && sorted[0].blasts.length > 0) {
              setSelectedBlastToken(sorted[0].blasts[0].share_token);
            }
          }
        }
      })
      .catch((err) => {
        if (isCurrent && err.message !== 'password_required') {
          setError(err.message || 'Unable to load master link data.');
          setLoading(false);
        }
      });
    return () => { isCurrent = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUnlock = async (password: string) => {
    const data = await fetchContainers(password);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`master_pwd_${token}`, password);
    }
    const sorted = sortContainersByRecentBlast(data);
    setContainers(sorted);
    setNeedsPassword(false);
    setLoading(false);
    if (sorted.length > 0) {
      setExpandedContainerId(sorted[0].id ?? 'other');
      if (sorted[0].blasts && sorted[0].blasts.length > 0) {
        setSelectedBlastToken(sorted[0].blasts[0].share_token);
      }
    }
  };

  useEffect(() => {
    if (!selectedBlastToken) return;
    let isCurrent = true;
    setAnalyticsLoading(true);
    fetch(`${API_BASE_URL}/api/v1/public-analytics/${selectedBlastToken}/`, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: PublicAnalyticsData) => { if (isCurrent) { setAnalytics(data); setStatusFilter('all'); } })
      .catch(console.error)
      .finally(() => { if (isCurrent) setAnalyticsLoading(false); });
    return () => { isCurrent = false; };
  }, [selectedBlastToken, API_BASE_URL]);

  const refreshAnalytics = () => {
    if (!selectedBlastToken) return;
    setAnalyticsLoading(true);
    fetch(`${API_BASE_URL}/api/v1/public-analytics/${selectedBlastToken}/`, { cache: 'no-store' })
      .then(r => r.json()).then(data => setAnalytics(data)).catch(console.error)
      .finally(() => setAnalyticsLoading(false));
  };

  // Filter containers + blasts by search query
  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) return containers;
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return containers
      .map(c => {
        const containerName = c.name.toLowerCase();
        const matchesContainer = tokens.every(t => containerName.includes(t));
        const matchingBlasts = c.blasts.filter(b => {
          const blastName = b.name.toLowerCase();
          const combined = `${containerName} ${blastName}`;
          return tokens.every(t => blastName.includes(t) || combined.includes(t));
        });
        return {
          ...c,
          blasts: matchesContainer ? c.blasts : matchingBlasts,
        };
      })
      .filter(c => {
        const containerName = c.name.toLowerCase();
        return tokens.every(t => containerName.includes(t)) || c.blasts.length > 0;
      });
  }, [containers, searchQuery]);

  const filteredRows = analytics?.data.filter(row =>
    statusFilter === 'all' || row.delivery_status === statusFilter
  ) ?? [];

  const showOpenedAt = ['all', 'opened'].includes(statusFilter);
  const showClickedAt = ['clicked'].includes(statusFilter);
  const showLinksClicked = ['clicked'].includes(statusFilter);

  const totalBlasts = containers.reduce((sum, c) => sum + c.blasts.length, 0);

  // ── Render ──
  if (needsPassword) return <PasswordGate onUnlock={handleUnlock} />;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 className="animate-spin" size={28} />
        <p className="text-sm">Loading Master Link...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-red-600 max-w-md text-center p-6 bg-white border border-red-100 rounded-xl shadow">
        <AlertTriangle size={28} />
        <p className="font-semibold text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Left Pane (Collapsible Sidebar) ── */}
      <div
        className={`transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 flex flex-col ${
          isSidebarOpen ? 'w-[300px] lg:w-[340px]' : 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg text-gray-900 truncate">Master Analytics</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{totalBlasts} blasts across {containers.length} campaigns</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>
        </div>

        {/* Accordion List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredContainers.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No campaigns found.</div>
          ) : filteredContainers.map(container => {
            const key = container.id ?? 'other';
            const isExpanded = expandedContainerId === key;
            const timeStatus = getCampaignTimeStatus(container);
            const containsSelected = container.blasts.some(b => b.share_token === selectedBlastToken);

            return (
              <div
                key={key}
                className={`rounded-xl border transition-all overflow-hidden ${
                  containsSelected
                    ? 'border-blue-200 bg-blue-50/40 shadow-xs'
                    : isExpanded
                    ? 'border-gray-200 bg-white shadow-xs'
                    : 'border-transparent hover:border-gray-200 hover:bg-gray-50/80'
                }`}
              >
                {/* Container header row */}
                <button
                  onClick={() => setExpandedContainerId(isExpanded ? null : key)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors group cursor-pointer"
                >
                  <span className={`mt-0.5 transition-colors flex-shrink-0 ${
                    containsSelected ? 'text-blue-600 font-bold' : 'text-gray-400 group-hover:text-gray-600'
                  }`}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`font-semibold text-sm truncate ${
                        containsSelected ? 'text-blue-950 font-bold' : 'text-gray-800'
                      }`}>
                        {container.name}
                      </span>
                      {(container.share_token || container.name) && (
                        <a
                          href={getCampaignUrl(container)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 shrink-0 font-medium"
                          title="Open Campaign Analytics Link"
                        >
                          <ExternalLink size={11} /> View Link
                        </a>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1.5 text-[11px] text-gray-500 mt-1">
                      <span className="text-gray-400">{container.blasts.length} blast{container.blasts.length !== 1 ? 's' : ''}</span>
                      {timeStatus && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100/90 text-gray-600 font-medium text-right shrink-0">
                          {timeStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Blasts nested under container */}
                {isExpanded && (
                  <div className="px-2 pb-2 pt-0.5 space-y-1 bg-white/60 border-t border-gray-100/80">
                    {container.blasts.map(blast => {
                      const isSelected = selectedBlastToken === blast.share_token;
                      return (
                        <button
                          key={blast.id}
                          onClick={() => {
                            setSelectedBlastToken(blast.share_token);
                            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                              setIsSidebarOpen(false);
                            }
                          }}
                          className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getStatusDot(blast.status)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-[13px]">{blast.name}</div>
                            {blast.target_display && (
                              <div className={`truncate text-[10px] mt-0.5 font-medium ${isSelected ? 'text-gray-300' : 'text-gray-500'}`} title={blast.target_display}>
                                {blast.target_display}
                              </div>
                            )}
                            <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                              {blast.sent_at ? new Date(blast.sent_at).toLocaleDateString() : 'Not sent'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Pane ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedBlastToken ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 relative">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 left-4 inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg shadow-sm text-xs font-semibold transition-all cursor-pointer"
              >
                <Menu size={14} /> Show Campaigns
              </button>
            )}
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search size={36} className="opacity-40" />
            </div>
            <p className="text-lg font-semibold text-gray-400">Select a blast</p>
            <p className="text-sm text-gray-400 mt-1">Expand a campaign on the left and pick a blast.</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                {!isSidebarOpen && (
                  <>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                      title="Open campaigns sidebar"
                    >
                      <Menu size={14} />
                      <span>Campaigns</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200 shrink-0" />
                  </>
                )}
                <div className="min-w-0">
                  {analytics?.advance_campaign_name && (
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                      {analytics.advance_campaign_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-bold text-gray-900 text-base leading-snug">{analytics?.campaign_name ?? '...'}</h2>
                    {analytics?.target_display && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 shadow-xs" title={`Target: ${analytics.target_display}`}>
                        <span className="text-gray-400 font-normal">Target:</span>
                        <strong className="text-gray-900 font-semibold">{analytics.target_display}</strong>
                      </span>
                    )}
                  </div>
                  {analytics?.totals && !analyticsLoading && (
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                      <span>Recipients: <strong className="text-gray-900">{analytics.totals.total_recipients}</strong></span>
                      <span>Delivered: <strong className="text-gray-900">{analytics.totals.total_delivered}</strong></span>
                      <span>Opens: <strong className="text-gray-900">{analytics.totals.total_opens}</strong></span>
                      <span>Clicks: <strong className="text-gray-900">{analytics.totals.total_clicks}</strong></span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 self-start xl:self-center">
                <div className="flex gap-1 flex-wrap">
                  {['all', 'delivered', 'opened', 'clicked', 'sent', 'pending', 'failed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer ${
                        statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={refreshAnalytics}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={12} className={analyticsLoading ? 'animate-spin' : ''} />
                  Sync
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading data...
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                      <th className="px-5 py-3 w-10 text-center">#</th>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Status</th>
                      {showOpenedAt && <th className="px-5 py-3">Opened At</th>}
                      {showClickedAt && <th className="px-5 py-3">Clicked At</th>}
                      {showLinksClicked && <th className="px-5 py-3">Links</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                          No recipients match the selected filter.
                        </td>
                      </tr>
                    ) : filteredRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{row.speaker_name || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{row.email}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[row.delivery_status] || 'text-gray-500'} ${statusBg[row.delivery_status] || 'bg-gray-100'}`}>
                            {row.delivery_status}
                          </span>
                        </td>
                        {showOpenedAt && (
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {row.opened_at ? new Date(row.opened_at).toLocaleString() : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        {showClickedAt && (
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {row.clicked_at ? new Date(row.clicked_at).toLocaleString() : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        {showLinksClicked && (
                          <td className="px-5 py-3 text-xs">
                            {row.links_clicked ? (
                              <div className="flex gap-1.5 flex-wrap">
                                {row.links_clicked.split(',').map((link, li) => {
                                  const trimmed = link.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span
                                      key={li}
                                      className={`px-2 py-0.5 text-[10px] rounded-md border break-all shadow-xs transition-colors ${getLinkBadgeStyle(trimmed)}`}
                                    >
                                      {trimmed}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
