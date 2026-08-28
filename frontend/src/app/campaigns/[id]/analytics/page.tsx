'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleX, Eye, MailCheck, MousePointerClick, RefreshCw, UserMinus, ShieldAlert, Clock, MailWarning, AlertTriangle, Link as LinkIcon, MonitorSmartphone, Download, Share2, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from '../../../../components/Card';
import { apiClient } from '../../../../services/apiClient';
import type { CampaignAnalytics, CampaignRecipientFilter, CampaignRecipientStatus } from '../../../../types';

const filters: { value: CampaignRecipientFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'hard_bounce', label: 'Hard Bounce' },
  { value: 'soft_bounce', label: 'Soft Bounce' },
  { value: 'invalid_email', label: 'Invalid' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'error', label: 'Error' },
];

const statusStyles: Record<CampaignRecipientStatus['status'], string> = {
  pending: 'border-border text-foreground/45',
  sent: 'border-foreground/30 text-foreground/65',
  delivered: 'border-emerald-600/40 text-emerald-700 dark:text-emerald-400',
  opened: 'border-blue-600/40 text-blue-700 dark:text-blue-400',
  clicked: 'border-violet-600/40 text-violet-700 dark:text-violet-400',
  failed: 'border-red-600/40 text-red-600 dark:text-red-400',
  unsubscribed: 'border-orange-600/40 text-orange-600 dark:text-orange-400',
  complaint: 'border-red-800/40 text-red-800 dark:text-red-500 bg-red-100 dark:bg-red-950',
  deferred: 'border-yellow-600/40 text-yellow-600 dark:text-yellow-400',
  hard_bounce: 'border-red-700/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50',
  soft_bounce: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
  invalid_email: 'border-rose-600/40 text-rose-600 dark:text-rose-400',
  blocked: 'border-slate-600/40 text-slate-600 dark:text-slate-400',
  error: 'border-red-900/40 text-red-900 dark:text-red-500',
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [activeFilter, setActiveFilter] = useState<CampaignRecipientFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void apiClient
      .get(`/api/v1/campaign-analytics/${campaignId}/analytics/?status=${activeFilter}`)
      .then((data: CampaignAnalytics) => {
        if (isCurrent) {
          setAnalytics(data);
          setError('');
        }
      })
      .catch((loadError: unknown) => {
        console.error('Failed to load campaign analytics:', loadError);
        if (isCurrent) setError('Unable to load campaign analytics. Please try again.');
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => { isCurrent = false; };
  }, [activeFilter, campaignId, refreshKey]);

  const setFilter = (filter: CampaignRecipientFilter) => {
    setLoading(true);
    setActiveFilter(filter);
  };

  const refresh = () => {
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  const exportExcel = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/campaign-analytics/${campaignId}/export/`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to export Excel');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeCampaignName = analytics?.campaign?.name 
        ? analytics.campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() 
        : `campaign_${campaignId}`;
      a.download = `${safeCampaignName}_analytics.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel. Please try again.');
    }
  };

  const copyShareLink = () => {
    if (!analytics?.campaign?.share_token) return;
    const shareUrl = `${window.location.origin}/public/campaign/${analytics.campaign.share_token}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const summary = analytics?.summary;
  const delivered = summary?.delivered ?? 0;
  const opened = summary?.opened ?? 0;
  const clicked = summary?.clicked ?? 0;
  
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0';
  const ctr = delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Recipients', value: summary?.total_recipients ?? 0, icon: MailCheck },
    { label: 'Delivered', value: delivered, icon: CheckCircle2 },
    { label: 'Failed', value: summary?.failed ?? 0, icon: CircleX },
    { label: 'Opened', value: opened, icon: Eye, rate: openRate },
    { label: 'Clicked', value: clicked, icon: MousePointerClick, rate: ctr },
    { label: 'Unsubscribed', value: summary?.unsubscribed ?? 0, icon: UserMinus },
    { label: 'Complaints', value: summary?.complaints ?? 0, icon: ShieldAlert },
    { label: 'Deferred', value: summary?.deferred ?? 0, icon: Clock },
    { label: 'Hard Bounces', value: summary?.hard_bounces ?? 0, icon: MailWarning },
    { label: 'Soft Bounces', value: summary?.soft_bounces ?? 0, icon: AlertTriangle },
  ];

  const timeSeriesMap: Record<string, { time: string; opens: number; clicks: number }> = {};
  const linkCounts: Record<string, number> = {};

  analytics?.recipients.forEach((r) => {
    if (r.opened_at) {
      const time = new Date(r.opened_at).toLocaleDateString();
      if (!timeSeriesMap[time]) timeSeriesMap[time] = { time, opens: 0, clicks: 0 };
      timeSeriesMap[time].opens++;
    }
    if (r.clicked_at) {
      const time = new Date(r.clicked_at).toLocaleDateString();
      if (!timeSeriesMap[time]) timeSeriesMap[time] = { time, opens: 0, clicks: 0 };
      timeSeriesMap[time].clicks++;
    }
    
    if (Array.isArray(r.clicked_links)) {
      r.clicked_links.forEach(link => {
        linkCounts[link] = (linkCounts[link] || 0) + 1;
      });
    }
  });

  const timeSeriesData = Object.values(timeSeriesMap).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const topLinks = Object.entries(linkCounts).map(([link, count]) => ({ link, count })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-7">
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-foreground/55 hover:text-foreground mb-5">
          <ArrowLeft size={16} /> Back to campaigns
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaign Analytics</h1>
            <p className="text-foreground/50 mt-1 text-sm">{analytics?.campaign.name || 'Loading campaign…'}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {analytics?.campaign?.share_token && (
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm hover:bg-foreground hover:text-background transition-colors"
              >
                {copied ? <Check size={15} className="text-green-500" /> : <Share2 size={15} />} 
                {copied ? 'Copied Link' : 'Copy Live Link'}
              </button>
            )}
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm hover:bg-foreground hover:text-background transition-colors"
            >
              <Download size={15} /> Export Excel
            </button>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm hover:bg-foreground hover:text-background transition-colors"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {error && <div className="border border-red-600/30 text-red-600 rounded-md p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(({ label, value, icon: Icon, rate }) => (
          <Card key={label} className="p-4">
            <Icon size={17} className="mb-4 text-foreground/55" />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                <p className="text-xs uppercase tracking-wider text-foreground/45 mt-1">{label}</p>
              </div>
              {rate && (
                <div className="bg-foreground/5 text-foreground px-2 py-1 rounded-md text-xs font-bold">
                  {rate}%
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-lg mb-6">Engagement Over Time</h3>
          {timeSeriesData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" fontSize={12} opacity={0.6} />
                  <YAxis fontSize={12} opacity={0.6} />
                  <Tooltip contentStyle={{ borderRadius: '8px', background: 'var(--background)', border: '1px solid var(--border)' }} />
                  <Line type="monotone" dataKey="opens" name="Opens" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-foreground/40">
              No engagement data available yet.
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><LinkIcon size={18} /> Top Clicked Links</h3>
          {topLinks.length > 0 ? (
            <div className="space-y-4">
              {topLinks.slice(0, 5).map((linkObj, i) => (
                <div key={i} className="flex items-center justify-between">
                  <a href={linkObj.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-[70%]" title={linkObj.link}>
                    {linkObj.link.replace(/^https?:\/\//, '')}
                  </a>
                  <span className="font-bold text-sm bg-foreground/5 px-2 py-1 rounded-md">{linkObj.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-foreground/40 py-8 text-center">No links have been clicked yet.</div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 pb-5 border-b border-border">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                activeFilter === value ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-foreground hover:text-background'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-medium uppercase tracking-widest text-foreground/40 py-4 border-b border-border">
          <span className="col-span-4">Contact</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-3">Latest event</span>
          <span className="col-span-3">Details</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-foreground/45">Loading recipients…</div>
        ) : analytics?.recipients.length === 0 ? (
          <div className="text-center py-12 text-sm text-foreground/45">No contacts match this filter.</div>
        ) : (
          <div className="divide-y divide-border">
            {analytics?.recipients.map((recipient) => (
              <div key={recipient.contact_id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/5 rounded-md px-2 -mx-2 transition-colors">
                <div className="md:col-span-4 flex flex-col min-w-0">
                  <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Contact</span>
                  <p className="font-medium truncate">{[recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || '—'}</p>
                  <p className="text-xs text-foreground/50 truncate mt-0.5">{recipient.email}</p>
                </div>
                <div className="md:col-span-2 flex flex-col md:block">
                  <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Status</span>
                  <span>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${statusStyles[recipient.status]}`}>
                      {recipient.status}
                    </span>
                  </span>
                </div>
                <div className="md:col-span-3 flex flex-col md:block">
                  <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Latest event</span>
                  <span className="text-xs text-foreground/60">{formatDate(recipient.last_event_at)}</span>
                </div>
                <div className="md:col-span-3 flex flex-col md:block">
                  <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Details</span>
                  <span className="text-xs text-foreground/60">
                    <div className="truncate" title={recipient.error_message}>{recipient.error_message || '—'}</div>
                    {recipient.metadata?.ip && (
                      <div className="text-[10px] text-foreground/40 mt-1 flex items-center gap-1">
                        <MonitorSmartphone size={10} /> IP: {recipient.metadata.ip}
                      </div>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
