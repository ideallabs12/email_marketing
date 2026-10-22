'use client';

import { use, useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle, RefreshCw, ChevronDown, ChevronRight, ChevronLeft, Menu, Search,
  Lock, Eye, EyeOff, Loader2, ExternalLink, Mail, Clock, Layers, X, Copy, Check, Sparkles
} from 'lucide-react';
import { getCampaignUrl } from '@/utils/slug';
import { getLinkBadgeStyle } from '@/utils/linkStyles';

export interface TrackerCampaignItem {
  campaign_id: number;
  advance_campaign_name: string;
  blast_name: string;
  tracking_id?: string;
  share_token?: string;
  data_batch: string;
  contact_list_name?: string;
  template_name: string;
  template_subject: string;
  delivery_status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  links_clicked: string;
  error_message?: string;
  is_sent: boolean;
}

export interface TrackerContactResult {
  contact: {
    id: number;
    email: string;
    speaker_name: string;
    first_name: string;
    last_name: string;
    is_subscribed: boolean;
    lists: string[];
    batches: string[];
  };
  summary: {
    total_campaigns: number;
    total_advance_campaigns: number;
    total_delivered: number;
    total_opened: number;
    total_clicked: number;
    total_bounced: number;
  };
  campaigns: TrackerCampaignItem[];
}

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
  tracking_id?: string;
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
  tracking_id?: string | null;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContainerId, setExpandedContainerId] = useState<number | null | 'other'>(null);
  const [selectedBlastToken, setSelectedBlastToken] = useState<string>('');

  const [analytics, setAnalytics] = useState<PublicAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const [viewMode, setViewMode] = useState<'analytics' | 'recents' | 'tracker' | 'contacts' | 'leads'>('analytics');
  const [recents, setRecents] = useState<any[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');

  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [recentsSearchQuery, setRecentsSearchQuery] = useState('');

  // Campaign Tracker state
  const [trackerSearchQuery, setTrackerSearchQuery] = useState('');
  const [trackerResults, setTrackerResults] = useState<TrackerContactResult[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerSearched, setTrackerSearched] = useState(false);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const [trackerStatusFilter, setTrackerStatusFilter] = useState('all');
  const [trackerSubSearch, setTrackerSubSearch] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const fetchCampaignTracker = async (email = trackerSearchQuery, showLoading = true) => {
    const trimmed = email.trim();
    if (!trimmed) {
      setTrackerResults([]);
      setTrackerSearched(false);
      return;
    }
    if (showLoading) setTrackerLoading(true);
    setTrackerSearched(true);
    setSelectedContactIndex(0);

    const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
    const trimmedPwd = savedPwd.trim();
    let url = `${API_BASE_URL}/api/v1/public/master-link/${token}/campaign-tracker/?email=${encodeURIComponent(trimmed)}`;
    if (trimmedPwd) {
      url += `&password=${encodeURIComponent(trimmedPwd)}`;
    }
    const headers: Record<string, string> = {};
    if (trimmedPwd) headers['X-Master-Password'] = trimmedPwd;

    try {
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.ok) {
        const body = await res.json();
        setTrackerResults(body.data?.results || []);
      } else {
        setTrackerResults([]);
      }
    } catch (err) {
      console.error('Failed to search campaign tracker:', err);
      setTrackerResults([]);
    } finally {
      if (showLoading) setTrackerLoading(false);
    }
  };

  const fetchContacts = async (search = '', showLoading = true) => {
    if (!search.trim()) {
      setContacts([]);
      return;
    }
    if (showLoading) setContactsLoading(true);
    const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
    const trimmedPwd = savedPwd.trim();
    let url = `${API_BASE_URL}/api/v1/public/master-link/${token}/contacts/?search=${encodeURIComponent(search)}`;
    if (trimmedPwd) {
      url += `&password=${encodeURIComponent(trimmedPwd)}`;
    }
    const headers: Record<string, string> = {};
    if (trimmedPwd) headers['X-Master-Password'] = trimmedPwd;
    try {
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      if (showLoading) setContactsLoading(false);
    }
  };

  const fetchLeads = async (search = '', showLoading = true) => {
    if (showLoading) setLeadsLoading(true);
    const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
    const trimmedPwd = savedPwd.trim();
    let url = `${API_BASE_URL}/api/v1/public/master-link/${token}/leads/?search=${encodeURIComponent(search)}`;
    if (trimmedPwd) {
      url += `&password=${encodeURIComponent(trimmedPwd)}`;
    }
    const headers: Record<string, string> = {};
    if (trimmedPwd) headers['X-Master-Password'] = trimmedPwd;
    try {
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      if (showLoading) setLeadsLoading(false);
    }
  };

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

  const [isSyncing, setIsSyncing] = useState(false);

  const fetchRecents = async (showLoading = true) => {
    if (showLoading) setRecentsLoading(true);
    const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
    const trimmed = savedPwd.trim();
    const url = trimmed
      ? `${API_BASE_URL}/api/v1/public/master-link/${token}/recents/?limit=100&password=${encodeURIComponent(trimmed)}`
      : `${API_BASE_URL}/api/v1/public/master-link/${token}/recents/?limit=100`;
    
    const headers: Record<string, string> = {};
    if (trimmed) headers['X-Master-Password'] = trimmed;
    
    try {
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRecents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load recent clicks:', err);
    } finally {
      if (showLoading) setRecentsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'recents') {
      fetchRecents(recents.length === 0);
    } else if (viewMode === 'contacts') {
      // Do not fetch on mount, wait for search
    } else if (viewMode === 'leads') {
      fetchLeads(leadsSearchQuery, leads.length === 0);
    } else if (viewMode === 'tracker') {
      if (trackerSearchQuery && trackerResults.length === 0 && !trackerSearched) {
        fetchCampaignTracker(trackerSearchQuery);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, token, API_BASE_URL]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
      await Promise.all([
        fetchRecents(true),
        fetchContainers(savedPwd).then((data) => {
          const sorted = sortContainersByRecentBlast(data);
          setContainers(sorted);
        }).catch(console.error),
        selectedBlastToken ? refreshAnalytics() : Promise.resolve(),
        trackerSearchQuery ? fetchCampaignTracker(trackerSearchQuery, false) : Promise.resolve(),
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddLead = async (row: any, campaignName: string, batchName: string = '') => {
    try {
      const savedPwd = typeof window !== 'undefined' ? sessionStorage.getItem(`master_pwd_${token}`) || '' : '';
      const headers: any = { 'Content-Type': 'application/json' };
      if (savedPwd) headers['X-Master-Password'] = savedPwd;
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (authToken) headers['Authorization'] = `Token ${authToken}`;
      
      const res = await fetch(`${API_BASE_URL}/api/v1/leads/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          speaker_name: row.speaker_name || '',
          email: row.email,
          campaign_name: campaignName,
          batch_name: batchName,
          whose_speaker: 'Auto',
        })
      });
      if (!res.ok) throw new Error('API Error');
      alert('Added to Leads successfully!');
    } catch (err: any) {
      alert('Failed to add lead: ' + err.message);
    }
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

  const filteredRows = analytics?.data.filter(row => {
    const statusMatch = statusFilter === 'all' || row.delivery_status === statusFilter;
    if (!statusMatch) return false;
    if (!analyticsSearchQuery.trim()) return true;
    const q = analyticsSearchQuery.toLowerCase().trim();
    return row.email?.toLowerCase().includes(q) || row.speaker_name?.toLowerCase().includes(q);
  }) ?? [];

  const filteredRecents = recents.filter(row => {
    if (!recentsSearchQuery.trim()) return true;
    const q = recentsSearchQuery.toLowerCase().trim();
    return (
      (row.email || '').toLowerCase().includes(q) ||
      (row.speaker_name || '').toLowerCase().includes(q) ||
      (row.campaign_name || '').toLowerCase().includes(q) ||
      (row.blast_name || '').toLowerCase().includes(q)
    );
  });

  const activeTrackerContact = trackerResults[selectedContactIndex] || trackerResults[0] || null;

  const filteredTrackerCampaigns = useMemo(() => {
    if (!activeTrackerContact) return [];
    return activeTrackerContact.campaigns.filter((item) => {
      if (trackerStatusFilter !== 'all') {
        const s = (item.delivery_status || '').toLowerCase();
        if (trackerStatusFilter === 'delivered' && s !== 'delivered') return false;
        if (trackerStatusFilter === 'opened' && !['opened', 'clicked'].includes(s) && !item.opened_at) return false;
        if (trackerStatusFilter === 'clicked' && s !== 'clicked' && !item.clicked_at) return false;
        if (trackerStatusFilter === 'failed' && !s.includes('fail') && !s.includes('bounce') && s !== 'invalid_email' && s !== 'blocked' && s !== 'error') return false;
        if (trackerStatusFilter === 'sent' && s !== 'sent') return false;
      }
      if (trackerSubSearch.trim()) {
        const q = trackerSubSearch.toLowerCase().trim();
        const matchesName = (item.advance_campaign_name || '').toLowerCase().includes(q) || (item.blast_name || '').toLowerCase().includes(q);
        const matchesBatch = (item.data_batch || '').toLowerCase().includes(q);
        const matchesTemplate = (item.template_name || '').toLowerCase().includes(q) || (item.template_subject || '').toLowerCase().includes(q);
        const matchesStatus = (item.delivery_status || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBatch && !matchesTemplate && !matchesStatus) return false;
      }
      return true;
    });
  }, [activeTrackerContact, trackerStatusFilter, trackerSubSearch]);

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

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Left Pane (Collapsible Sidebar) ── */}
      <div
        className={`transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-40 fixed inset-y-0 left-0 md:static ${
          isSidebarOpen
            ? 'w-[280px] sm:w-[320px] lg:w-[340px] translate-x-0 shadow-2xl md:shadow-none'
            : '-translate-x-full md:translate-x-0 md:w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'
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
                            {blast.tracking_id && (
                              <div className={`mt-0.5 text-[9px] font-mono px-1 py-0.5 inline-block rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                #{blast.tracking_id}
                              </div>
                            )}
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
        {/* Tabs & Actions Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-0 flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title={isSidebarOpen ? "Hide campaigns sidebar" : "Show campaigns sidebar"}
              aria-label="Toggle campaigns sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="h-5 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap min-w-0 py-0.5">
              <button
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`py-3.5 font-semibold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer shrink-0 ${
                  viewMode === 'analytics'
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Analytics Viewer
              </button>
              <button
                type="button"
                onClick={() => setViewMode('recents')}
                className={`py-3.5 font-semibold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  viewMode === 'recents'
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Recent Clicks
                {recents.length > 0 && (
                  <span className="text-[10px] sm:text-[11px] bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold px-1.5 sm:px-2 py-0.5 rounded-full">
                    {recents.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tracker')}
                className={`py-3.5 font-semibold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  viewMode === 'tracker'
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Layers size={14} className={viewMode === 'tracker' ? 'text-gray-900' : 'text-gray-400'} />
                Campaign Tracker
              </button>
              <button
                type="button"
                onClick={() => setViewMode('contacts')}
                className={`py-3.5 font-semibold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer shrink-0 ${
                  viewMode === 'contacts'
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Contact Directory
              </button>
              <button
                type="button"
                onClick={() => setViewMode('leads')}
                className={`py-3.5 font-semibold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer shrink-0 ${
                  viewMode === 'leads'
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Lead Tracker
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 py-2 shrink-0">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-gray-300 bg-white px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
              <span className="sm:hidden">{isSyncing ? '...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {viewMode === 'contacts' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={contactsSearchQuery}
                  onChange={(e) => setContactsSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchContacts(contactsSearchQuery)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-500"
                />
              </div>
              <button
                onClick={() => fetchContacts(contactsSearchQuery)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
              >
                Search
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} /> Searching contacts...
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  {contactsSearchQuery ? 'No contacts found.' : 'Enter a search term to find contacts.'}
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Lists</th>
                      <th className="px-5 py-3">Batches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{c.email}</td>
                        <td className="px-5 py-3">
                          {c.is_subscribed === false ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100">Unsubscribed</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Subscribed</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {c.lists && c.lists.length > 0 ? c.lists.join(', ') : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {c.batches && c.batches.length > 0 ? c.batches.join(', ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : viewMode === 'leads' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name, email, or campaign..."
                  value={leadsSearchQuery}
                  onChange={(e) => setLeadsSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLeads(leadsSearchQuery)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-500"
                />
              </div>
              <button
                onClick={() => fetchLeads(leadsSearchQuery)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
              >
                Search
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading leads...
                </div>
              ) : leads.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  {leadsSearchQuery ? 'No leads found.' : 'No leads available.'}
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Campaign</th>
                      <th className="px-5 py-3">Batch</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{l.speaker_name || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{l.email}</td>
                        <td className="px-5 py-3 text-gray-900">{l.campaign_name || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{l.batch_name || '—'}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {l.call_status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : viewMode === 'recents' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name, email, or campaign..."
                  value={recentsSearchQuery}
                  onChange={(e) => setRecentsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-500 bg-white"
                />
                {recentsSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRecentsSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 font-medium shrink-0">
                <span className="hidden sm:inline">Showing </span>
                <strong className="text-gray-900">{filteredRecents.length}</strong>
                <span className="hidden sm:inline"> clicks</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {recentsLoading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading recent clicks...
                </div>
              ) : filteredRecents.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm px-4">
                  {recentsSearchQuery ? 'No recent clicks match your search.' : 'No recent clicks found.'}
                </div>
              ) : (
                <>
                  {/* Mobile View: High-density responsive cards */}
                  <div className="block md:hidden divide-y divide-gray-100">
                    {filteredRecents.map((row, i) => (
                      <div key={i} className="p-3.5 bg-white hover:bg-gray-50/70 transition-colors space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                              #{i + 1}
                            </span>
                            <span className="font-semibold text-gray-900 text-sm truncate">
                              {row.speaker_name || '—'}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize shrink-0 ${
                              statusColors[row.delivery_status] || 'text-gray-500'
                            } ${statusBg[row.delivery_status] || 'bg-gray-100'}`}
                          >
                            {row.delivery_status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                          <a
                            href={`mailto:${row.email}`}
                            className="flex items-center gap-1.5 text-blue-600 hover:underline truncate"
                          >
                            <Mail size={12} className="shrink-0 text-gray-400" />
                            <span className="font-mono text-xs truncate">{row.email}</span>
                          </a>
                          {row.clicked_at && (
                            <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1">
                              <Clock size={11} />
                              {formatDateTime(row.clicked_at)}
                            </span>
                          )}
                        </div>

                        <div className="bg-gray-50/80 rounded-lg p-2.5 border border-gray-100 text-xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider shrink-0">Campaign</span>
                            <span className="font-medium text-gray-800 text-right truncate" title={row.campaign_name}>
                              {row.campaign_name || '—'}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider shrink-0">Batch</span>
                            <span className="text-gray-600 text-right truncate" title={row.blast_name}>
                              {row.blast_name || '—'}
                            </span>
                          </div>
                          {row.links_clicked && (
                            <div className="pt-1 border-t border-gray-100">
                              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Clicked Links</div>
                              <div className="flex gap-1 flex-wrap">
                                {row.links_clicked.split(',').map((link: string, li: number) => {
                                  const trimmed = link.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span
                                      key={li}
                                      className={`px-1.5 py-0.5 text-[10px] rounded border break-all ${getLinkBadgeStyle(trimmed)}`}
                                    >
                                      {trimmed}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAddLead(row, row.campaign_name || '', row.blast_name || '')}
                            className="flex-1 py-1.5 px-3 text-xs font-semibold bg-gray-900 text-white rounded-lg shadow-xs hover:bg-gray-800 transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            Add to Leads
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTrackerSearchQuery(row.email);
                              setViewMode('tracker');
                              fetchCampaignTracker(row.email);
                            }}
                            className="py-1.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1"
                            title="Track campaign history for this email"
                          >
                            <Layers size={13} className="text-gray-500" />
                            Track
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View: Wide responsive table */}
                  <div className="hidden md:block overflow-x-auto min-w-full">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                          <th className="px-5 py-3 w-10 text-center">#</th>
                          <th className="px-5 py-3">Name</th>
                          <th className="px-5 py-3">Email</th>
                          <th className="px-5 py-3">Campaign</th>
                          <th className="px-5 py-3">Batch / Blast</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Clicked At</th>
                          <th className="px-5 py-3">Links</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecents.map((row, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-5 py-3 font-medium text-gray-900">{row.speaker_name || '—'}</td>
                            <td className="px-5 py-3 text-gray-600 font-mono text-xs">{row.email}</td>
                            <td className="px-5 py-3 text-gray-900 font-medium">{row.campaign_name || '—'}</td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{row.blast_name || '—'}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[row.delivery_status] || 'text-gray-500'} ${statusBg[row.delivery_status] || 'bg-gray-100'}`}>
                                {row.delivery_status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {formatDateTime(row.clicked_at)}
                            </td>
                            <td className="px-5 py-3 text-xs">
                              {row.links_clicked ? (
                                <div className="flex gap-1.5 flex-wrap max-w-xs">
                                  {row.links_clicked.split(',').map((link: string, li: number) => {
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
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button 
                                  onClick={() => handleAddLead(row, row.campaign_name || '', row.blast_name || '')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-gray-900 text-white rounded shadow-xs hover:bg-gray-800 transition cursor-pointer"
                                >
                                  Add to Leads
                                </button>
                                <button 
                                  onClick={() => {
                                    setTrackerSearchQuery(row.email);
                                    setViewMode('tracker');
                                    fetchCampaignTracker(row.email);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition cursor-pointer flex items-center gap-1"
                                  title="Track campaign history for this email"
                                >
                                  <Layers size={11} />
                                  Track
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : viewMode === 'tracker' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50/60 overflow-hidden">
            {/* Advanced Search Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-white flex-shrink-0 shadow-2xs">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Layers size={18} />
                  </span>
                  <h2 className="font-bold text-base sm:text-lg text-gray-900">Campaign Tracker & Advanced Search</h2>
                </div>
                <p className="text-xs text-gray-500 mb-3.5">
                  Enter any recipient email to find how many campaigns included it, the data batches, email templates, and delivery performance.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                    <input
                      type="email"
                      placeholder="Enter email address (e.g. name@domain.com)..."
                      value={trackerSearchQuery}
                      onChange={(e) => setTrackerSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchCampaignTracker(trackerSearchQuery)}
                      className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-500 shadow-2xs"
                    />
                    {trackerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setTrackerSearchQuery('');
                          setTrackerResults([]);
                          setTrackerSearched(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                        title="Clear"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchCampaignTracker(trackerSearchQuery)}
                    disabled={!trackerSearchQuery.trim() || trackerLoading}
                    className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    {trackerLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    <span>{trackerLoading ? 'Searching...' : 'Search'}</span>
                  </button>
                </div>

                {/* Quick suggestions from recent clicks */}
                {recents.length > 0 && !trackerSearched && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
                    <span className="text-gray-400 font-medium text-[11px]">Quick search:</span>
                    {Array.from(new Set(recents.map((r: { email?: string }) => r.email).filter(Boolean) as string[])).slice(0, 4).map((em, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTrackerSearchQuery(em);
                          fetchCampaignTracker(em);
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-mono transition-colors cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-3 sm:p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {trackerLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center text-gray-400 text-sm gap-3">
                    <Loader2 className="animate-spin text-gray-500" size={32} />
                    <p className="font-medium text-gray-600">Searching across campaigns, batches, and templates...</p>
                    <p className="text-xs text-gray-400">Scanning recipient delivery statuses and target lists</p>
                  </div>
                ) : !trackerSearched ? (
                  <div className="py-16 sm:py-24 text-center bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                      <Layers size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1.5">Track Any Email Across All Campaigns</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                      Search for an email address above to view all campaigns it was included in, the targeted data batches, email templates used, and recipient engagement.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                      <Sparkles size={14} className="text-blue-500" />
                      Supports exact email, partial search, or recipient name
                    </div>
                  </div>
                ) : trackerResults.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <Search size={22} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">No campaigns found</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      No campaign records or contacts matched <span className="font-semibold text-gray-800 font-mono">&ldquo;{trackerSearchQuery}&rdquo;</span>. Please double-check the email address or try a domain search.
                    </p>
                  </div>
                ) : activeTrackerContact && (
                  <div className="space-y-4">
                    {/* Multiple contacts switcher (if search matched more than 1) */}
                    {trackerResults.length > 1 && (
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1.5">
                          <span>Multiple contacts matched:</span>
                          <span className="font-bold text-gray-900">({trackerResults.length})</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {trackerResults.map((res, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedContactIndex(idx)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-2 ${
                                selectedContactIndex === idx
                                  ? 'bg-gray-900 text-white shadow-xs'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <span className="font-semibold">{res.contact.speaker_name || res.contact.email}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                selectedContactIndex === idx ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {res.summary.total_campaigns}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact Profile Header Card */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                            {(activeTrackerContact.contact.first_name?.[0] || activeTrackerContact.contact.email[0] || 'U').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-gray-900 truncate">
                                {activeTrackerContact.contact.speaker_name || 'Contact Profile'}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                activeTrackerContact.contact.is_subscribed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {activeTrackerContact.contact.is_subscribed ? 'Subscribed' : 'Unsubscribed'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span className="font-mono text-gray-700">{activeTrackerContact.contact.email}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(activeTrackerContact.contact.email)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                title="Copy email"
                              >
                                {copiedEmail === activeTrackerContact.contact.email ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAddLead({
                              speaker_name: activeTrackerContact.contact.speaker_name,
                              email: activeTrackerContact.contact.email
                            }, activeTrackerContact.campaigns[0]?.advance_campaign_name || '', activeTrackerContact.campaigns[0]?.data_batch || '')}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg shadow-xs hover:bg-gray-800 transition cursor-pointer"
                          >
                            Add to Leads
                          </button>
                        </div>
                      </div>

                      {/* Lists and batches */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">Lists:</span>
                          <span className="text-gray-800 font-medium">
                            {activeTrackerContact.contact.lists && activeTrackerContact.contact.lists.length > 0
                              ? activeTrackerContact.contact.lists.join(', ')
                              : 'None'}
                          </span>
                        </div>
                        <div className="h-3 w-px bg-gray-200" />
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">Batches:</span>
                          <span className="text-gray-800 font-medium">
                            {activeTrackerContact.contact.batches && activeTrackerContact.contact.batches.length > 0
                              ? activeTrackerContact.contact.batches.join(', ')
                              : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KPI Metrics Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs text-center sm:text-left">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Campaigns</div>
                        <div className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                          {activeTrackerContact.summary.total_campaigns}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Total included in</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs text-center sm:text-left">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Parent Campaigns</div>
                        <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-0.5">
                          {activeTrackerContact.summary.total_advance_campaigns}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Unique parents</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs text-center sm:text-left">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Delivered</div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                          {activeTrackerContact.summary.total_delivered}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Emails delivered</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs text-center sm:text-left">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Opened</div>
                        <div className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
                          {activeTrackerContact.summary.total_opened}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Opens recorded</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs text-center sm:text-left">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Clicked</div>
                        <div className="text-xl sm:text-2xl font-black text-violet-600 mt-0.5">
                          {activeTrackerContact.summary.total_clicked}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Link clicks</div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs text-center sm:text-left">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Bounced / Failed</div>
                        <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5">
                          {activeTrackerContact.summary.total_bounced}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Delivery failures</div>
                      </div>
                    </div>

                    {/* Campaigns Detail List */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                      {/* Filter Bar */}
                      <div className="p-3.5 sm:p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Filter:</span>
                          {['all', 'delivered', 'opened', 'clicked', 'sent', 'failed'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setTrackerStatusFilter(st)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer capitalize ${
                                trackerStatusFilter === st
                                  ? 'bg-gray-900 text-white shadow-2xs'
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {st === 'all' ? 'All' : st}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 sm:w-56">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                              type="text"
                              placeholder="Filter campaign, batch, template..."
                              value={trackerSubSearch}
                              onChange={(e) => setTrackerSubSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {filteredTrackerCampaigns.length} item{filteredTrackerCampaigns.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {filteredTrackerCampaigns.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 text-sm">
                          No campaigns match your selected filter.
                        </div>
                      ) : (
                        <>
                          {/* Mobile View: High detail responsive cards */}
                          <div className="block md:hidden divide-y divide-gray-100">
                            {filteredTrackerCampaigns.map((item, i) => (
                              <div key={i} className="p-4 space-y-3 hover:bg-gray-50/60 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                                        {item.advance_campaign_name}
                                      </span>
                                      {item.tracking_id && (
                                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                          #{item.tracking_id}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm mt-1 truncate">
                                      {item.blast_name}
                                    </h4>
                                  </div>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${
                                      statusColors[item.delivery_status] || 'text-gray-500'
                                    } ${statusBg[item.delivery_status] || 'bg-gray-100'}`}
                                  >
                                    {item.delivery_status}
                                  </span>
                                </div>

                                <div className="bg-gray-50/90 rounded-xl p-3 border border-gray-100 space-y-2 text-xs">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Data Batch</span>
                                    <span className="font-semibold text-gray-900 inline-block mt-0.5 bg-white px-2 py-0.5 rounded border border-gray-200/80">
                                      {item.data_batch || 'All Contacts'}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Template</span>
                                    <div className="font-medium text-gray-800 mt-0.5">{item.template_name}</div>
                                    {item.template_subject && (
                                      <div className="text-[11px] text-gray-500 italic mt-0.5 truncate">
                                        &ldquo;{item.template_subject}&rdquo;
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60 text-[11px]">
                                    <div>
                                      <span className="text-gray-400 block">Sent:</span>
                                      <span className="text-gray-700 font-medium">{formatDateTime(item.sent_at)}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 block">Engagement:</span>
                                      <span className="text-gray-700 font-medium">
                                        {item.clicked_at ? `Clicked: ${formatDateTime(item.clicked_at)}` : (item.opened_at ? `Opened: ${formatDateTime(item.opened_at)}` : 'None')}
                                      </span>
                                    </div>
                                  </div>

                                  {item.links_clicked && (
                                    <div className="pt-1 border-t border-gray-200/60">
                                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Clicked Links</span>
                                      <div className="flex gap-1 flex-wrap">
                                        {item.links_clicked.split(',').map((link: string, li: number) => {
                                          const trimmed = link.trim();
                                          if (!trimmed) return null;
                                          return (
                                            <span
                                              key={li}
                                              className={`px-1.5 py-0.5 text-[10px] rounded border break-all ${getLinkBadgeStyle(trimmed)}`}
                                            >
                                              {trimmed}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  {item.share_token && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedBlastToken(item.share_token!);
                                        setViewMode('analytics');
                                      }}
                                      className="flex-1 py-1.5 px-3 text-xs font-semibold bg-gray-900 text-white rounded-lg shadow-xs hover:bg-gray-800 transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <ExternalLink size={12} />
                                      View Blast Analytics
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleAddLead({
                                      speaker_name: activeTrackerContact.contact.speaker_name,
                                      email: activeTrackerContact.contact.email,
                                    }, item.advance_campaign_name, item.data_batch)}
                                    className="py-1.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition active:scale-[0.99] cursor-pointer"
                                  >
                                    Add to Leads
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop View: Full Table */}
                          <div className="hidden md:block overflow-x-auto min-w-full">
                            <table className="w-full text-sm text-left border-collapse">
                              <thead className="bg-gray-50/90 border-b border-gray-200">
                                <tr className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                  <th className="px-5 py-3 w-10 text-center">#</th>
                                  <th className="px-5 py-3">Campaign / Blast</th>
                                  <th className="px-5 py-3">Data Batch</th>
                                  <th className="px-5 py-3">Template & Subject</th>
                                  <th className="px-5 py-3">Status</th>
                                  <th className="px-5 py-3">Sent At</th>
                                  <th className="px-5 py-3">Engagement</th>
                                  <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredTrackerCampaigns.map((item, i) => (
                                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3 text-center text-gray-400 text-xs">{i + 1}</td>
                                    <td className="px-5 py-3">
                                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                        <span>{item.blast_name}</span>
                                        {item.tracking_id && (
                                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                            #{item.tracking_id}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-blue-600 font-medium mt-0.5">
                                        {item.advance_campaign_name}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                        {item.data_batch || 'All Contacts'}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 max-w-xs">
                                      <div className="font-medium text-gray-900 truncate" title={item.template_name}>
                                        {item.template_name}
                                      </div>
                                      {item.template_subject && (
                                        <div className="text-xs text-gray-500 truncate mt-0.5 italic" title={item.template_subject}>
                                          {item.template_subject}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-3">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[item.delivery_status] || 'text-gray-500'} ${statusBg[item.delivery_status] || 'bg-gray-100'}`}>
                                        {item.delivery_status}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                                      {formatDateTime(item.sent_at)}
                                    </td>
                                    <td className="px-5 py-3 text-xs">
                                      {item.clicked_at ? (
                                        <div>
                                          <div className="text-violet-700 font-medium">Clicked: {formatDateTime(item.clicked_at)}</div>
                                          {item.links_clicked && (
                                            <div className="flex gap-1 flex-wrap mt-1">
                                              {item.links_clicked.split(',').map((link: string, li: number) => {
                                                const trimmed = link.trim();
                                                if (!trimmed) return null;
                                                return (
                                                  <span
                                                    key={li}
                                                    className={`px-1.5 py-0.2 text-[10px] rounded border ${getLinkBadgeStyle(trimmed)}`}
                                                  >
                                                    {trimmed}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      ) : item.opened_at ? (
                                        <div className="text-blue-700 font-medium">Opened: {formatDateTime(item.opened_at)}</div>
                                      ) : (
                                        <span className="text-gray-300">—</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1.5">
                                        {item.share_token && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedBlastToken(item.share_token!);
                                              setViewMode('analytics');
                                            }}
                                            className="px-2.5 py-1 text-[11px] font-bold bg-gray-900 text-white rounded shadow-xs hover:bg-gray-800 transition cursor-pointer flex items-center gap-1"
                                            title="Open Analytics Viewer for this blast"
                                          >
                                            <ExternalLink size={11} />
                                            Analytics
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleAddLead({
                                            speaker_name: activeTrackerContact.contact.speaker_name,
                                            email: activeTrackerContact.contact.email,
                                          }, item.advance_campaign_name, item.data_batch)}
                                          className="px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition cursor-pointer"
                                        >
                                          Add Lead
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !selectedBlastToken ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 relative">
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
                <div className="min-w-0">
                  {analytics?.advance_campaign_name && (
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                      {analytics.advance_campaign_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-bold text-gray-900 text-base leading-snug flex items-center gap-2">
                      {analytics?.campaign_name ?? '...'}
                      {analytics?.tracking_id && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          #{analytics.tracking_id}
                        </span>
                      )}
                    </h2>
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
                <div className="relative w-[200px] mr-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search name/email..."
                    value={analyticsSearchQuery}
                    onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  />
                </div>
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
                      <th className="px-5 py-3 text-right">Actions</th>
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
                        <td className="px-5 py-3 text-right">
                          <button 
                            onClick={() => handleAddLead(row, analytics?.campaign_name || '', analytics?.targeted_batch_name || '')}
                            className="px-2 py-1 text-[11px] font-bold bg-gray-900 text-white rounded shadow hover:bg-gray-800 transition"
                          >
                            Add to Leads
                          </button>
                        </td>
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
