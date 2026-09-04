'use client';

import { use, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Layers, CheckCircle2, Eye, MousePointerClick, Search, Info } from 'lucide-react';

interface BlastItem {
  id: number;
  name: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface CampaignPublicData {
  campaign_id: number;
  campaign_name: string;
  created_at: string;
  blasts: BlastItem[];
  selected_blast_id: number | null;
  analytics: {
    blast_id: number;
    blast_name: string;
    totals: {
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
  } | null;
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

export default function PublicCampaignAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<CampaignPublicData | null>(null);
  const [selectedBlastId, setSelectedBlastId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetiredLink, setIsRetiredLink] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isCurrent = true;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    const url = selectedBlastId 
      ? `${API_BASE_URL}/api/v1/public/campaign/${token}/?blast_id=${selectedBlastId}`
      : `${API_BASE_URL}/api/v1/public/campaign/${token}/`;

    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 410) {
          if (isCurrent) setIsRetiredLink(true);
          throw new Error('retired_link');
        }
        if (!res.ok) {
          throw new Error('Failed to load campaign');
        }
        return res.json();
      })
      .then((resData: CampaignPublicData) => {
        if (isCurrent) {
          setData(resData);
          if (resData.selected_blast_id && !selectedBlastId) {
            setSelectedBlastId(resData.selected_blast_id);
          }
          setError('');
        }
      })
      .catch((err) => {
        if (isCurrent && err.message !== 'retired_link') {
          console.error(err);
          setError('Unable to load campaign analytics. Please check the link or try again.');
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => { isCurrent = false; };
  }, [token, selectedBlastId, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleSelectBlast = (blastId: number) => {
    if (blastId === selectedBlastId) return;
    setSelectedBlastId(blastId);
    setStatusFilter('all');
    setSearchQuery('');
  };

  if (isRetiredLink) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Info size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Direct Blast Link Retired</h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Individual blast links have been discontinued in favor of unified <strong>Campaign Links</strong>. 
            Please reach out to your campaign administrator for the main Campaign link to access all blast statistics.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <RefreshCw className="animate-spin" size={32} />
          <p className="font-medium text-sm">Loading Campaign Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-3 text-red-600 max-w-md text-center p-6 bg-white border border-red-200 rounded-xl shadow-sm">
          <AlertTriangle size={30} />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const analytics = data?.analytics;
  const totals = analytics?.totals;
  const showOpenedAt = ['all', 'opened'].includes(statusFilter);
  const showClickedAt = ['clicked'].includes(statusFilter);
  const showLinksClicked = ['clicked'].includes(statusFilter);

  // Filter recipient rows using multi-token search
  const filteredRows = (analytics?.data || []).filter(row => {
    const matchesStatus = statusFilter === 'all' || row.delivery_status === statusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const speaker = (row.speaker_name || '').toLowerCase();
    const email = (row.email || '').toLowerCase();
    const combined = `${speaker} ${email}`;
    return tokens.every(t => combined.includes(t));
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── Top Header Bar ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Campaign Report
              </span>
              <span className="text-xs text-gray-400">Live View</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {data?.campaign_name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* ── Blast Switcher Bar ── */}
        {data?.blasts && data.blasts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} /> Blasts in this Campaign ({data.blasts.length})
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {data.blasts.map((b) => {
                const isSelected = selectedBlastId === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBlast(b.id)}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-gray-900 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      b.status === 'sent' ? 'bg-emerald-400' :
                      b.status === 'sending' ? 'bg-blue-400 animate-pulse' :
                      b.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                    }`} />
                    <span className="font-semibold">{b.name}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                      {b.sent_at ? new Date(b.sent_at).toLocaleDateString() : 'Draft'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── KPI Summary Cards ── */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <span className="text-xs text-gray-500 font-medium">Total Recipients</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totals.total_recipients}</div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">In targeted batch</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Delivered</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totals.total_delivered}</div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
                {totals.total_recipients > 0 ? ((totals.total_delivered / totals.total_recipients) * 100).toFixed(1) : '0.0'}% delivery rate
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Opens</span>
                <Eye size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totals.total_opens}</div>
              <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">
                {totals.total_delivered > 0 ? ((totals.total_opens / totals.total_delivered) * 100).toFixed(1) : '0.0'}% open rate
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Clicks</span>
                <MousePointerClick size={16} className="text-violet-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{totals.total_clicks}</div>
              <span className="text-[11px] text-violet-600 font-semibold mt-0.5 block">
                {totals.total_delivered > 0 ? ((totals.total_clicks / totals.total_delivered) * 100).toFixed(1) : '0.0'}% click rate
              </span>
            </div>
          </div>
        )}

        {/* ── Recipient Spreadsheet Section ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                Recipient Details
              </h2>
              <span className="text-xs text-gray-400">
                ({filteredRows.length} of {analytics?.data.length || 0})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs w-full sm:w-60 focus:outline-none focus:border-gray-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['all', 'delivered', 'opened', 'clicked', 'sent', 'pending', 'failed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors whitespace-nowrap ${
                      statusFilter === s
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100/70 border-b border-gray-200 text-gray-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3 w-10 text-center text-gray-400">#</th>
                  <th className="px-5 py-3 border-r border-gray-100">Speaker Name</th>
                  <th className="px-5 py-3 border-r border-gray-100">Email</th>
                  <th className="px-5 py-3 border-r border-gray-100">Status</th>
                  {showOpenedAt && <th className="px-5 py-3 border-r border-gray-100">Opened At</th>}
                  {showClickedAt && <th className="px-5 py-3 border-r border-gray-100">Clicked At</th>}
                  {showLinksClicked && <th className="px-5 py-3">Links Clicked</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-gray-400">
                      No recipients match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-center text-gray-400">{index + 1}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900 border-r border-gray-100/50">
                        {row.speaker_name || '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600 border-r border-gray-100/50">
                        {row.email}
                      </td>
                      <td className="px-5 py-3 border-r border-gray-100/50">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${statusColors[row.delivery_status] || 'text-gray-500'} ${statusBg[row.delivery_status] || 'bg-gray-100'}`}>
                          {row.delivery_status}
                        </span>
                      </td>
                      {showOpenedAt && (
                        <td className="px-5 py-3 text-gray-500 border-r border-gray-100/50">
                          {row.opened_at ? new Date(row.opened_at).toLocaleString() : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {showClickedAt && (
                        <td className="px-5 py-3 text-gray-500 border-r border-gray-100/50">
                          {row.clicked_at ? new Date(row.clicked_at).toLocaleString() : <span className="text-gray-300">—</span>}
                        </td>
                      )}
                      {showLinksClicked && (
                        <td className="px-5 py-3 text-gray-600">
                          {row.links_clicked ? (
                            <div className="flex gap-1.5 flex-wrap">
                              {row.links_clicked.split(',').map((link, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100 break-all">
                                  {link.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
