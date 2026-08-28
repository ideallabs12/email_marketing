'use client';

import { use, useEffect, useState } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

interface PublicAnalyticsData {
  campaign_name: string;
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

export default function PublicCampaignAnalyticsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [analytics, setAnalytics] = useState<PublicAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let isCurrent = true;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    
    fetch(`${API_BASE_URL}/api/v1/public-analytics/${token}/`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to load data');
        }
        return res.json();
      })
      .then((data: PublicAnalyticsData) => {
        if (isCurrent) {
          setAnalytics(data);
          setError('');
        }
      })
      .catch((err) => {
        console.error(err);
        if (isCurrent) setError('Unable to load campaign analytics. Please check the link or try again.');
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
      
    return () => { isCurrent = false; };
  }, [token, refreshKey]);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const statusColors: Record<string, string> = {
    pending: 'text-gray-500',
    sent: 'text-gray-600',
    delivered: 'text-green-600',
    opened: 'text-blue-600',
    clicked: 'text-purple-600',
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

  if (loading && !analytics) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <RefreshCw className="animate-spin" size={32} />
          <p>Loading Live Spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-red-600 max-w-md text-center p-6 bg-white border border-red-200 rounded-lg shadow-sm">
          <AlertTriangle size={32} />
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const showOpenedAt = ['all', 'opened'].includes(statusFilter);
  const showClickedAt = ['clicked'].includes(statusFilter);
  const showLinksClicked = ['clicked'].includes(statusFilter);

  return (
    <div className="min-h-screen bg-white">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 bg-gray-50 px-4 md:px-6 py-4 shadow-sm gap-4 md:gap-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{analytics?.campaign_name} - Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">Live Spreadsheet View</p>
          
          {analytics?.totals && (
            <div className="flex flex-wrap gap-4 mt-3 text-sm border-t border-gray-200 pt-3">
              <div><span className="text-gray-500">Recipients:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_recipients}</span></div>
              <div><span className="text-gray-500">Delivered:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_delivered}</span></div>
              <div><span className="text-gray-500">Opens:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_opens}</span></div>
              <div><span className="text-gray-500">Clicks:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_clicks}</span></div>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button
            type="button"
            onClick={refresh}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="w-full px-4 md:px-0 mt-4 md:mt-0">
        <table className="w-full text-left text-sm md:whitespace-nowrap md:border-collapse block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider font-semibold">
              <th className="px-6 py-3 border-r border-gray-200 w-12 text-center text-gray-400">#</th>
              <th className="px-6 py-3 border-r border-gray-200">Speaker Name</th>
              <th className="px-6 py-3 border-r border-gray-200">Email</th>
              <th className="px-6 py-3 border-r border-gray-200">Delivery Status</th>
              {showOpenedAt && <th className="px-6 py-3 border-r border-gray-200">Opened At</th>}
              {showClickedAt && <th className="px-6 py-3 border-r border-gray-200">Clicked At</th>}
              {showLinksClicked && <th className="px-6 py-3">Links Clicked</th>}
            </tr>
          </thead>
          <tbody className="block md:table-row-group divide-y divide-gray-200 md:divide-none space-y-4 md:space-y-0">
            {analytics?.data
              .filter((row) => statusFilter === 'all' || row.delivery_status === statusFilter)
              .map((row, index) => (
              <tr key={index} className="flex flex-col md:table-row bg-white border border-gray-200 md:border-0 rounded-lg md:rounded-none p-4 md:p-0 md:hover:bg-gray-50 transition-colors shadow-sm md:shadow-none">
                <td className="flex justify-between items-center md:table-cell px-0 md:px-6 py-2 md:py-3 border-b border-gray-100 md:border-b-0 md:border-r md:border-gray-200 md:text-center text-gray-400 md:bg-gray-50/50">
                  <span className="md:hidden text-xs font-semibold uppercase text-gray-400">#</span>
                  <span>{index + 1}</span>
                </td>
                <td className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center md:table-cell px-0 md:px-6 py-2 md:py-3 border-b border-gray-100 md:border-b-0 md:border-r md:border-gray-200 font-medium text-gray-900">
                  <span className="md:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Speaker Name</span>
                  <span>{row.speaker_name || '—'}</span>
                </td>
                <td className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center md:table-cell px-0 md:px-6 py-2 md:py-3 border-b border-gray-100 md:border-b-0 md:border-r md:border-gray-200 text-gray-600">
                  <span className="md:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Email</span>
                  <span className="break-all">{row.email}</span>
                </td>
                <td className="flex justify-between items-center md:table-cell px-0 md:px-6 py-2 md:py-3 border-b border-gray-100 md:border-b-0 md:border-r md:border-gray-200">
                  <span className="md:hidden text-xs font-semibold uppercase text-gray-400">Delivery Status</span>
                  <span className={`capitalize font-semibold ${statusColors[row.delivery_status] || 'text-gray-500'}`}>
                    {row.delivery_status}
                  </span>
                </td>
                {showOpenedAt && (
                  <td className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center md:table-cell px-0 md:px-6 py-2 md:py-3 border-b border-gray-100 md:border-b-0 md:border-r md:border-gray-200 text-gray-600">
                    <span className="md:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Opened At</span>
                    <span>{row.opened_at ? new Date(row.opened_at).toLocaleString() : <span className="text-gray-400">—</span>}</span>
                  </td>
                )}
                {showClickedAt && (
                  <td className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center md:table-cell px-0 md:px-6 py-2 md:py-3 border-b border-gray-100 md:border-b-0 md:border-r md:border-gray-200 text-gray-600">
                    <span className="md:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Clicked At</span>
                    <span>{row.clicked_at ? new Date(row.clicked_at).toLocaleString() : <span className="text-gray-400">—</span>}</span>
                  </td>
                )}
                {showLinksClicked && (
                  <td className="flex flex-col md:table-cell px-0 md:px-6 py-2 md:py-3 text-gray-600 pt-3 md:pt-3">
                    <span className="md:hidden text-[10px] font-semibold uppercase text-gray-400 mb-2">Links Clicked</span>
                    {row.links_clicked ? (
                      <div className="flex gap-2 items-center flex-wrap">
                        {row.links_clicked.split(',').map((link, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100 break-all w-fit max-w-full">
                            {link.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {analytics?.data.length === 0 ? (
              <tr>
                <td colSpan={4 + (showOpenedAt ? 1 : 0) + (showClickedAt ? 1 : 0) + (showLinksClicked ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  No recipients found for this campaign yet.
                </td>
              </tr>
            ) : analytics?.data.filter((row) => statusFilter === 'all' || row.delivery_status === statusFilter).length === 0 ? (
              <tr>
                <td colSpan={4 + (showOpenedAt ? 1 : 0) + (showClickedAt ? 1 : 0) + (showLinksClicked ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  No recipients found matching the selected status.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
