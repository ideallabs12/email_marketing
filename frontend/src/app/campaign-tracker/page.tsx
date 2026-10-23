'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Layers, Search, Mail, Check, Copy, ExternalLink,
  Loader2, Sparkles, X
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { getLinkBadgeStyle, formatLinkName } from '@/utils/linkStyles';
import Link from 'next/link';

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
  delivered: 'bg-emerald-50 border border-emerald-200/60',
  opened: 'bg-blue-50 border border-blue-200/60',
  clicked: 'bg-violet-50 border border-violet-200/60',
  failed: 'bg-red-50 border border-red-200/60',
  unsubscribed: 'bg-orange-50 border border-orange-200/60',
  complaint: 'bg-red-100 border border-red-300',
  deferred: 'bg-yellow-50 border border-yellow-200/60',
  hard_bounce: 'bg-red-50 border border-red-200/60',
  soft_bounce: 'bg-orange-50 border border-orange-200/60',
  invalid_email: 'bg-rose-50 border border-rose-200/60',
  blocked: 'bg-slate-100 border border-slate-200',
  error: 'bg-red-100 border border-red-300',
};

function formatDateTime(dateStr: string | null) {
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
}

function CampaignTrackerContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [searchQuery, setSearchQuery] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<TrackerContactResult[]>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [addingLeadMap, setAddingLeadMap] = useState<Record<string, boolean>>({});

  const handleSearch = async (emailToSearch = searchQuery) => {
    const trimmed = emailToSearch.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    setSelectedContactIndex(0);

    try {
      const res = await apiClient.get(`/api/v1/campaign-tracker/?email=${encodeURIComponent(trimmed)}`);
      setResults(res.data?.results || []);
    } catch (err) {
      console.error('Failed to search campaign tracker:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialEmail) return;
    let ignore = false;

    const fetchInitial = async () => {
      try {
        const res = await apiClient.get(`/api/v1/campaign-tracker/?email=${encodeURIComponent(initialEmail.trim())}`);
        if (!ignore) {
          setResults(res.data?.results || []);
          setSearched(true);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load initial tracker data:', err);
          setResults([]);
          setSearched(true);
        }
      }
    };

    fetchInitial();
    return () => {
      ignore = true;
    };
  }, [initialEmail]);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedEmail(text);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  const handleAddLead = async (speaker_name: string, email: string, campaignName: string, batchName: string, key: string) => {
    setAddingLeadMap(prev => ({ ...prev, [key]: true }));
    try {
      await apiClient.post('/api/v1/leads/', {
        speaker_name: speaker_name || '',
        email,
        campaign_name: campaignName,
        batch_name: batchName,
        whose_speaker: 'Auto',
      });
      alert('Added to Leads successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to add lead: ' + msg);
    } finally {
      setAddingLeadMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const activeContact = results[selectedContactIndex] || results[0] || null;

  const filteredCampaigns = useMemo(() => {
    if (!activeContact) return [];
    return activeContact.campaigns.filter((item) => {
      if (statusFilter !== 'all') {
        const s = (item.delivery_status || '').toLowerCase();
        if (statusFilter === 'delivered' && s !== 'delivered') return false;
        if (statusFilter === 'opened' && !['opened', 'clicked'].includes(s) && !item.opened_at) return false;
        if (statusFilter === 'clicked' && s !== 'clicked' && !item.clicked_at) return false;
        if (statusFilter === 'failed' && !s.includes('fail') && !s.includes('bounce') && s !== 'invalid_email' && s !== 'blocked' && s !== 'error') return false;
        if (statusFilter === 'sent' && s !== 'sent') return false;
      }
      if (subSearch.trim()) {
        const q = subSearch.toLowerCase().trim();
        const matchesName = (item.advance_campaign_name || '').toLowerCase().includes(q) || (item.blast_name || '').toLowerCase().includes(q);
        const matchesBatch = (item.data_batch || '').toLowerCase().includes(q);
        const matchesTemplate = (item.template_name || '').toLowerCase().includes(q) || (item.template_subject || '').toLowerCase().includes(q);
        const matchesStatus = (item.delivery_status || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBatch && !matchesTemplate && !matchesStatus) return false;
      }
      return true;
    });
  }, [activeContact, statusFilter, subSearch]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers size={22} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Campaign Tracker</h1>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            Search any recipient email across all campaigns, data batches, email templates, and delivery performance.
          </p>
        </div>
      </div>

      {/* Advanced Search Bar Card */}
      <div className="p-5 bg-surface border border-border/70 rounded-2xl shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchQuery);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
            <input
              type="text"
              placeholder="Enter recipient email address (e.g. name@domain.com) or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-foreground/5 border border-border/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-foreground/40 text-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setResults([]);
                  setSearched(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-0.5 cursor-pointer"
                title="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || loading}
            className="px-6 py-2.5 bg-foreground text-background font-semibold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{loading ? 'Searching...' : 'Track Email'}</span>
          </button>
        </form>
      </div>

      {/* Results or Empty State */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-foreground/50 text-sm gap-3 bg-surface rounded-2xl border border-border/60">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="font-semibold text-foreground text-base">Searching across all campaigns, batches, and templates...</p>
          <p className="text-xs text-foreground/50">Scanning recipient delivery statuses and target lists</p>
        </div>
      ) : !searched ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-border/70 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Layers size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">Track Any Email Across All Campaigns</h3>
          <p className="text-sm text-foreground/60 max-w-md mx-auto mb-6">
            Enter an email address above to view in how many campaigns it was included, which campaigns, the targeted data batches, email templates used, and engagement.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-foreground/50 bg-foreground/5 px-4 py-2 rounded-xl border border-border/50">
            <Sparkles size={14} className="text-blue-500" />
            Supports exact email, partial search, or recipient name
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-2xl border border-border/70 p-8 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-foreground/5 text-foreground/40 flex items-center justify-center mx-auto mb-3">
            <Search size={24} />
          </div>
          <h3 className="font-bold text-foreground text-lg mb-1">No campaigns found</h3>
          <p className="text-sm text-foreground/60 max-w-md mx-auto">
            No campaign records or contacts matched <span className="font-semibold text-foreground font-mono">&ldquo;{searchQuery}&rdquo;</span>. Please double-check the email address.
          </p>
        </div>
      ) : activeContact && (
        <div className="space-y-6">
          {/* Multiple contacts switcher if matched more than 1 */}
          {results.length > 1 && (
            <div className="bg-surface p-4 rounded-xl border border-border/70 shadow-xs">
              <div className="text-xs text-foreground/60 font-semibold mb-2.5 flex items-center gap-1.5">
                <span>Multiple contacts matched:</span>
                <span className="font-bold text-foreground">({results.length})</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {results.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedContactIndex(idx)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-2.5 ${
                      selectedContactIndex === idx
                        ? 'bg-foreground text-background shadow-xs font-semibold'
                        : 'bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border/40'
                    }`}
                  >
                    <span>{res.contact.speaker_name || res.contact.email}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      selectedContactIndex === idx ? 'bg-background/20 text-background' : 'bg-foreground/10 text-foreground'
                    }`}>
                      {res.summary.total_campaigns} campaigns
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Profile Overview Card */}
          <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border/70 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                  {(activeContact.contact.first_name?.[0] || activeContact.contact.email[0] || 'U').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-bold text-lg text-foreground truncate">
                      {activeContact.contact.speaker_name || 'Contact Profile'}
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      activeContact.contact.is_subscribed
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    }`}>
                      {activeContact.contact.is_subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/60 mt-1">
                    <span className="font-mono text-foreground/80">{activeContact.contact.email}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeContact.contact.email)}
                      className="text-foreground/40 hover:text-foreground cursor-pointer transition-colors"
                      title="Copy email"
                    >
                      {copiedEmail === activeContact.contact.email ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAddLead(
                    activeContact.contact.speaker_name,
                    activeContact.contact.email,
                    activeContact.campaigns[0]?.advance_campaign_name || '',
                    activeContact.campaigns[0]?.data_batch || '',
                    'header-lead'
                  )}
                  disabled={addingLeadMap['header-lead']}
                  className="px-4 py-2 text-xs font-semibold bg-foreground text-background rounded-xl shadow-xs hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                >
                  {addingLeadMap['header-lead'] ? 'Adding...' : 'Add to Leads'}
                </button>
              </div>
            </div>

            {/* Lists & Data Batches info */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-foreground/60">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground/40 uppercase tracking-wider text-[11px]">Contact Lists:</span>
                <span className="text-foreground font-medium">
                  {activeContact.contact.lists && activeContact.contact.lists.length > 0
                    ? activeContact.contact.lists.join(', ')
                    : 'None'}
                </span>
              </div>
              <div className="h-3 w-px bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground/40 uppercase tracking-wider text-[11px]">Associated Batches:</span>
                <span className="text-foreground font-medium">
                  {activeContact.contact.batches && activeContact.contact.batches.length > 0
                    ? activeContact.contact.batches.join(', ')
                    : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* KPI Metrics Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-surface p-4 rounded-2xl border border-border/70 shadow-xs text-center sm:text-left">
              <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Campaigns</div>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                {activeContact.summary.total_campaigns}
              </div>
              <div className="text-[11px] text-foreground/50 mt-0.5">Total included in</div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-border/70 shadow-xs text-center sm:text-left">
              <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Parent Campaigns</div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {activeContact.summary.total_advance_campaigns}
              </div>
              <div className="text-[11px] text-foreground/50 mt-0.5">Unique parents</div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-border/70 shadow-xs text-center sm:text-left">
              <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Delivered</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {activeContact.summary.total_delivered}
              </div>
              <div className="text-[11px] text-foreground/50 mt-0.5">Emails delivered</div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-border/70 shadow-xs text-center sm:text-left">
              <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Opened</div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {activeContact.summary.total_opened}
              </div>
              <div className="text-[11px] text-foreground/50 mt-0.5">Opens recorded</div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-border/70 shadow-xs text-center sm:text-left">
              <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Clicked</div>
              <div className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 mt-1">
                {activeContact.summary.total_clicked}
              </div>
              <div className="text-[11px] text-foreground/50 mt-0.5">Link clicks</div>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-border/70 shadow-xs text-center sm:text-left">
              <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Bounced / Failed</div>
              <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-1">
                {activeContact.summary.total_bounced}
              </div>
              <div className="text-[11px] text-foreground/50 mt-0.5">Delivery failures</div>
            </div>
          </div>

          {/* Campaigns Detail List */}
          <div className="bg-surface rounded-2xl border border-border/70 shadow-xs overflow-hidden">
            {/* Filter & SubSearch Toolbar */}
            <div className="p-4 border-b border-border/60 bg-foreground/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider mr-1">Filter:</span>
                {['all', 'delivered', 'opened', 'clicked', 'sent', 'failed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer capitalize ${
                      statusFilter === st
                        ? 'bg-foreground text-background shadow-xs'
                        : 'bg-surface border border-border/60 text-foreground/70 hover:bg-foreground/5'
                    }`}
                  >
                    {st === 'all' ? 'All' : st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" size={14} />
                  <input
                    type="text"
                    placeholder="Filter campaign, batch, template..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border/70 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-foreground text-foreground"
                  />
                </div>
                <span className="text-xs text-foreground/50 whitespace-nowrap font-medium">
                  {filteredCampaigns.length} item{filteredCampaigns.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="py-16 text-center text-foreground/50 text-sm">
                No campaigns match your selected filter.
              </div>
            ) : (
              <>
                {/* Mobile View: High detail responsive cards */}
                <div className="block md:hidden divide-y divide-border/60">
                  {filteredCampaigns.map((item, i) => {
                    const leadKey = `mobile-lead-${i}`;
                    return (
                      <div key={i} className="p-4 space-y-3 hover:bg-foreground/5 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded">
                                {item.advance_campaign_name}
                              </span>
                              {item.tracking_id && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/70 border border-border/60">
                                  #{item.tracking_id}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-foreground text-sm mt-1 truncate">
                              {item.blast_name}
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${
                              statusColors[item.delivery_status] || 'text-foreground/60'
                            } ${statusBg[item.delivery_status] || 'bg-foreground/5'}`}
                          >
                            {item.delivery_status}
                          </span>
                        </div>

                        <div className="bg-foreground/5 rounded-xl p-3 border border-border/50 space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider block">Target Data Batch</span>
                            <span className="font-semibold text-foreground inline-block mt-0.5 bg-surface px-2 py-0.5 rounded border border-border/60">
                              {item.data_batch || 'All Contacts'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider block">Email Template</span>
                            <div className="font-medium text-foreground mt-0.5">{item.template_name}</div>
                            {item.template_subject && (
                              <div className="text-[11px] text-foreground/60 italic mt-0.5 truncate">
                                &ldquo;{item.template_subject}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
                            <div>
                              <span className="text-foreground/40 block">Sent:</span>
                              <span className="text-foreground font-medium">{formatDateTime(item.sent_at)}</span>
                            </div>
                            <div>
                              <span className="text-foreground/40 block">Engagement:</span>
                              <span className="text-foreground font-medium">
                                {item.clicked_at ? `Clicked: ${formatDateTime(item.clicked_at)}` : (item.opened_at ? `Opened: ${formatDateTime(item.opened_at)}` : 'None')}
                              </span>
                            </div>
                          </div>

                          {item.links_clicked && (
                            <div className="pt-1 border-t border-border/50">
                              <span className="text-[10px] uppercase font-bold text-foreground/40 tracking-wider block mb-1">Clicked Links</span>
                              <div className="flex gap-1 flex-wrap">
                                {item.links_clicked.split(',').map((link: string, li: number) => {
                                  const trimmed = link.trim();
                                  if (!trimmed) return null;
                                  return (
                                    <span
                                      key={li}
                                      className={`px-1.5 py-0.5 text-[10px] rounded border break-all ${getLinkBadgeStyle(trimmed)}`}
                                    >
                                      {formatLinkName(trimmed)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {item.error_message && (
                            <div className="pt-1 border-t border-red-500/20 text-red-600 text-[11px]">
                              <span className="font-bold">Error: </span>
                              {item.error_message}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {item.tracking_id ? (
                            <Link
                              href={`/advance-campaigns/${item.tracking_id}`}
                              className="flex-1 py-1.5 px-3 text-xs font-semibold bg-foreground text-background rounded-lg shadow-xs hover:opacity-90 transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink size={12} />
                              View Campaign
                            </Link>
                          ) : (
                            <Link
                              href="/campaigns"
                              className="flex-1 py-1.5 px-3 text-xs font-semibold bg-foreground text-background rounded-lg shadow-xs hover:opacity-90 transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink size={12} />
                              View Campaigns
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddLead(
                              activeContact.contact.speaker_name,
                              activeContact.contact.email,
                              item.advance_campaign_name,
                              item.data_batch,
                              leadKey
                            )}
                            disabled={addingLeadMap[leadKey]}
                            className="py-1.5 px-3 text-xs font-semibold text-foreground bg-foreground/10 hover:bg-foreground/20 border border-border/60 rounded-lg transition active:scale-[0.99] cursor-pointer"
                          >
                            {addingLeadMap[leadKey] ? 'Adding...' : 'Add Lead'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Full Breakdown Table */}
                <div className="hidden md:block overflow-x-auto min-w-full">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-foreground/5 border-b border-border/60">
                      <tr className="text-xs text-foreground/50 uppercase tracking-wider font-semibold">
                        <th className="px-5 py-3.5 w-10 text-center">#</th>
                        <th className="px-5 py-3.5">Campaign & Blast</th>
                        <th className="px-5 py-3.5">Data Batch</th>
                        <th className="px-5 py-3.5">Template & Subject</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Sent At</th>
                        <th className="px-5 py-3.5">Engagement</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCampaigns.map((item, i) => {
                        const leadKey = `desktop-lead-${i}`;
                        return (
                          <tr key={i} className="border-b border-border/40 hover:bg-foreground/5 transition-colors">
                            <td className="px-5 py-3.5 text-center text-foreground/40 text-xs font-mono">{i + 1}</td>
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span>{item.blast_name}</span>
                                {item.tracking_id && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-foreground/10 text-foreground/70 border border-border/50">
                                    #{item.tracking_id}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                {item.advance_campaign_name}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-foreground/5 text-foreground border border-border/60">
                                {item.data_batch || 'All Contacts'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 max-w-xs">
                              <div className="font-medium text-foreground truncate" title={item.template_name}>
                                {item.template_name}
                              </div>
                              {item.template_subject && (
                                <div className="text-xs text-foreground/60 truncate mt-0.5 italic" title={item.template_subject}>
                                  &ldquo;{item.template_subject}&rdquo;
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[item.delivery_status] || 'text-foreground/60'} ${statusBg[item.delivery_status] || 'bg-foreground/5'}`}>
                                {item.delivery_status}
                              </span>
                              {item.error_message && (
                                <div className="text-[10px] text-red-600 mt-1 truncate max-w-xs" title={item.error_message}>
                                  {item.error_message}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-foreground/60 whitespace-nowrap">
                              {formatDateTime(item.sent_at)}
                            </td>
                            <td className="px-5 py-3.5 text-xs">
                              {item.clicked_at ? (
                                <div>
                                  <div className="text-violet-600 dark:text-violet-400 font-semibold">
                                    Clicked: {formatDateTime(item.clicked_at)}
                                  </div>
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
                                            {formatLinkName(trimmed)}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : item.opened_at ? (
                                <div className="text-blue-600 dark:text-blue-400 font-medium">
                                  Opened: {formatDateTime(item.opened_at)}
                                </div>
                              ) : (
                                <span className="text-foreground/30">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {item.tracking_id ? (
                                  <Link
                                    href={`/advance-campaigns/${item.tracking_id}`}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-foreground text-background rounded shadow-xs hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                                    title="Open advance campaign page"
                                  >
                                    <ExternalLink size={11} />
                                    Campaign
                                  </Link>
                                ) : (
                                  <Link
                                    href="/campaigns"
                                    className="px-2.5 py-1 text-[11px] font-bold bg-foreground text-background rounded shadow-xs hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                                    title="Open campaigns page"
                                  >
                                    <ExternalLink size={11} />
                                    Campaign
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleAddLead(
                                    activeContact.contact.speaker_name,
                                    activeContact.contact.email,
                                    item.advance_campaign_name,
                                    item.data_batch,
                                    leadKey
                                  )}
                                  disabled={addingLeadMap[leadKey]}
                                  className="px-2 py-1 text-[11px] font-semibold text-foreground bg-foreground/10 hover:bg-foreground/20 border border-border/60 rounded transition cursor-pointer"
                                >
                                  {addingLeadMap[leadKey] ? 'Adding...' : 'Add Lead'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignTrackerPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex items-center justify-center text-foreground/50">
        <Loader2 className="animate-spin mr-2" size={24} />
        Loading Campaign Tracker...
      </div>
    }>
      <CampaignTrackerContent />
    </Suspense>
  );
}
