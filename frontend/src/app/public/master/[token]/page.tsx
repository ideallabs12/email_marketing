'use client';

import { use, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, Check, Search } from 'lucide-react';

interface CampaignSummary {
  id: number;
  name: string;
  status: string;
  share_token: string;
  created_at: string;
}

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

export default function MasterLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaignToken, setSelectedCampaignToken] = useState<string>('');
  
  const [analytics, setAnalytics] = useState<PublicAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isCurrent = true;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    
    fetch(`${API_BASE_URL}/api/v1/public/master-link/${token}/campaigns/`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('This link is disabled or invalid.');
        return res.json();
      })
      .then((data: CampaignSummary[]) => {
        if (isCurrent) {
          setCampaigns(data);
          if (data.length > 0) {
            setSelectedCampaignToken(data[0].share_token);
          }
          setError('');
        }
      })
      .catch((err) => {
        if (isCurrent) setError(err.message || 'Unable to load master link data.');
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
      
    return () => { isCurrent = false; };
  }, [token]);

  useEffect(() => {
    if (!selectedCampaignToken) return;
    
    let isCurrent = true;
    setAnalyticsLoading(true);
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    
    fetch(`${API_BASE_URL}/api/v1/public-analytics/${selectedCampaignToken}/`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load campaign data');
        return res.json();
      })
      .then((data: PublicAnalyticsData) => {
        if (isCurrent) setAnalytics(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isCurrent) setAnalyticsLoading(false);
      });
      
    return () => { isCurrent = false; };
  }, [selectedCampaignToken]);

  const refreshAnalytics = () => {
    if (!selectedCampaignToken) return;
    setAnalyticsLoading(true);
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${API_BASE_URL}/api/v1/public-analytics/${selectedCampaignToken}/`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setAnalytics(data))
      .catch(console.error)
      .finally(() => setAnalyticsLoading(false));
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <RefreshCw className="animate-spin" size={32} />
          <p>Loading Master Link...</p>
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
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 md:px-6 py-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-0">
          <div className="flex-1 max-w-xl">
            <h1 className="text-xl font-bold text-gray-900">Master Analytics View</h1>
            <p className="text-xs text-gray-500 mt-1 mb-4">Select a campaign to view its live performance</p>
            
            {/* Custom Dropdown */}
            <div className="relative w-full z-20 mt-2">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex w-full md:w-[32rem] items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
              >
                <span className="truncate text-left">
                  {selectedCampaignToken 
                    ? (() => {
                        const c = campaigns.find(c => c.share_token === selectedCampaignToken);
                        return c ? `${c.name} (${new Date(c.created_at).toLocaleDateString()})` : 'Select a campaign...';
                      })()
                    : 'Select a campaign...'}
                </span>
                <ChevronDown size={16} className={`ml-2 flex-shrink-0 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-full md:w-[32rem] z-20 rounded-lg border border-gray-200 bg-white shadow-xl max-h-[350px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/80">
                      <Search size={15} className="text-gray-400 ml-2" />
                      <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent outline-none text-sm p-1.5 placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden flex-1 p-1.5 custom-scrollbar">
                      {campaigns.length === 0 && <div className="p-4 text-sm text-gray-500 text-center">No campaigns available</div>}
                      {campaigns
                        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCampaignToken(c.share_token);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full text-left flex items-center justify-between px-3 py-2.5 mb-0.5 text-sm rounded-md transition-colors ${
                              selectedCampaignToken === c.share_token 
                                ? 'bg-blue-50/80 text-blue-700 font-semibold' 
                                : 'text-gray-700 hover:bg-gray-100/80'
                            }`}
                          >
                            <span className="truncate pr-4 flex-1">
                              {c.name} 
                              <span className={`text-xs ml-2 font-normal ${selectedCampaignToken === c.share_token ? 'text-blue-500' : 'text-gray-400'}`}>
                                ({new Date(c.created_at).toLocaleDateString()})
                              </span>
                            </span>
                            {selectedCampaignToken === c.share_token && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                          </button>
                      ))}
                      {campaigns.length > 0 && campaigns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="p-6 text-sm text-gray-500 text-center">No campaigns found matching "{searchQuery}"</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {analytics?.totals && !analyticsLoading && (
              <div className="flex flex-wrap gap-4 mt-4 text-sm border-t border-gray-200 pt-3">
                <div><span className="text-gray-500">Recipients:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_recipients}</span></div>
                <div><span className="text-gray-500">Delivered:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_delivered}</span></div>
                <div><span className="text-gray-500">Opens:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_opens}</span></div>
                <div><span className="text-gray-500">Clicks:</span> <span className="font-semibold text-gray-900">{analytics.totals.total_clicks}</span></div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 xl:gap-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-md border border-gray-200">
              {['all', 'delivered', 'opened', 'clicked', 'sent', 'pending', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                    statusFilter === status 
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={refreshAnalytics}
              className="w-full xl:w-auto inline-flex justify-center items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={15} className={analyticsLoading ? 'animate-spin' : ''} />
              {analyticsLoading ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="w-full px-4 md:px-0 mt-4 md:mt-0">
        {analyticsLoading ? (
           <div className="py-20 text-center text-gray-400 text-sm">Loading campaign data...</div>
        ) : !selectedCampaignToken ? (
           <div className="py-20 text-center text-gray-400 text-sm">No campaign selected</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
