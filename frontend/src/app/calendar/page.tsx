'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Filter, 
  Send, Clock, CheckCircle2, AlertCircle, Hourglass, Layers, 
  Eye, BarChart3, Plus, ArrowUpRight, Sparkles, X, ChevronDown, 
  CalendarDays, LayoutGrid, List, Check, Zap, Users, FileText, Building2,
  FolderOpen
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { CalendarCampaign, CalendarCampaignPerformance } from '@/types';
import CampaignDetailModal from '@/components/CampaignDetailModal';

type ViewMode = 'month' | 'week' | 'agenda';
type StatusFilter = 'all' | 'sent' | 'scheduled' | 'sending' | 'draft' | 'failed';
type TypeFilter = 'all' | 'standalone' | 'advance';
type DensityMode = 'detailed' | 'compact';

export default function CalendarPage() {
  const [campaigns, setCampaigns] = useState<CalendarCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [densityMode, setDensityMode] = useState<DensityMode>('detailed');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Drawers
  const [selectedCampaign, setSelectedCampaign] = useState<CalendarCampaign | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);

  // Auto-polling for active sends
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    const hasSending = campaigns.some(c => c.status === 'sending');
    if (hasSending && !polling) {
      setPolling(true);
    }
  }, [campaigns, polling]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling) {
      interval = setInterval(async () => {
        try {
          await loadCampaigns(false);
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling]);

  async function loadCampaigns(showLoader = true) {
    if (showLoader) setLoading(true);
    try {
      let items: CalendarCampaign[] = [];
      try {
        const res = await apiClient.get('/api/v1/campaigns/calendar/');
        items = res.results || [];
      } catch {
        // Fallback: Fetch all campaigns with include_all
        const [campsRes, advRes] = await Promise.allSettled([
          apiClient.get('/api/v1/campaigns/?include_all=true&limit=10000'),
          apiClient.get('/api/v1/advance-campaigns/?limit=10000'),
        ]);

        const rawCamps = campsRes.status === 'fulfilled' ? (campsRes.value.results || campsRes.value || []) : [];
        const rawAdv = advRes.status === 'fulfilled' ? (advRes.value.results || advRes.value || []) : [];
        const advMap = new Map<number, string>();
        rawAdv.forEach((a: any) => advMap.set(a.id, a.name));

        items = rawCamps.map((c: any) => {
          const runDtStr = c.sent_at || c.scheduled_at || c.created_at;
          const runDate = runDtStr ? new Date(runDtStr) : new Date();
          const pDate = runDate.toISOString().split('T')[0];
          const pTime = runDate.toTimeString().slice(0, 5);

          return {
            id: c.id,
            name: c.name,
            subject: c.subject || '',
            status: c.status,
            from_email: c.from_email || '',
            sent_at: c.sent_at,
            scheduled_at: c.scheduled_at,
            created_at: c.created_at,
            updated_at: c.updated_at,
            primary_date: pDate,
            primary_time: pTime,
            run_date_type: c.sent_at ? 'sent' : (c.scheduled_at ? 'scheduled' : 'created'),
            tracking_id: c.tracking_id,
            share_token: c.share_token,
            is_advanced: !!c.advance_campaign,
            advance_campaign_id: c.advance_campaign,
            advance_campaign_name: c.advance_campaign ? advMap.get(c.advance_campaign) : null,
            template_id: c.template,
            target_list_id: c.target_list,
          };
        });
      }

      setCampaigns(items);
      const stillSending = items.some(c => c.status === 'sending');
      if (!stillSending) setPolling(false);
    } catch (err) {
      console.error('Failed to load calendar campaigns:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  const handleSendCampaign = async (campaignId: number) => {
    const confirmed = window.confirm('Are you sure you want to send this campaign immediately?');
    if (!confirmed) return;

    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'sending' } : c));
    if (selectedCampaign?.id === campaignId) {
      setSelectedCampaign(prev => prev ? { ...prev, status: 'sending' } : null);
    }

    try {
      await apiClient.post(`/api/v1/campaigns/${campaignId}/send/`, {});
      setPolling(true);
      loadCampaigns(false);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch campaign.');
      loadCampaigns(false);
    }
  };

  // Helper to extract top 4 priority attributes
  const getCampaignMeta = (camp: CalendarCampaign) => {
    // 1. Company
    let company = camp.company || '';
    if (!company) {
      const fromStr = (camp.from_email || '').toUpperCase();
      const nameStr = (camp.name || '').toUpperCase();
      const tempStr = (camp.template_name || '').toUpperCase();
      if (nameStr.includes('WYNX') || fromStr.includes('WYNX') || tempStr.includes('WYNX')) {
        company = 'WYNx Talks';
      } else if (nameStr.includes('SIGNATURE') || fromStr.includes('SIGNATURE') || tempStr.includes('SIGNATURE')) {
        company = 'Signature Talks';
      } else if (nameStr.includes('VOICE') || fromStr.includes('VOICE') || tempStr.includes('VOICE')) {
        company = 'Voice Talks';
      } else if (nameStr.includes('ICON') || fromStr.includes('ICON') || tempStr.includes('ICON')) {
        company = 'ICON Conferences';
      } else if (nameStr.includes('IDIAS') || fromStr.includes('IDIAS') || tempStr.includes('IDIAS')) {
        company = 'IDIAS';
      } else if (camp.from_email?.includes('<')) {
        company = camp.from_email.split('<')[0].trim();
      } else if (camp.from_email?.includes('@')) {
        const domain = camp.from_email.split('@')[1]?.split('.')[0] || '';
        company = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'Email Marketing';
      } else {
        company = 'WYNx Talks';
      }
    }

    // 2. Data Batch
    const batch = camp.data_batch || camp.target_batches_name || (camp.target_list_name ? `List: ${camp.target_list_name}` : 'All Contacts');

    // 3. Whose Campaign (Owner / Speaker / Sequence)
    let owner = camp.whose_campaign || '';
    if (!owner) {
      if (camp.advance_campaign_name) {
        owner = camp.advance_campaign_name;
      } else if (camp.data_batch || camp.target_batches_name) {
        const rawBatch = (camp.data_batch || camp.target_batches_name || '').split(',')[0].trim();
        const cleaned = rawBatch.toLowerCase().replace(/_data|-data|data/g, '').replace(/^[_-]+|[_-]+$/g, '');
        owner = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : rawBatch;
      } else {
        owner = 'Standard';
      }
    }

    // 4. Which Template
    const template = camp.template_name || (camp.template_id ? `Template #${camp.template_id}` : 'Universal Template');

    return { company, owner, batch, template };
  };

  const getCompanyBadgeStyle = (company: string) => {
    const c = company.toLowerCase();
    if (c.includes('wynx')) {
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25';
    }
    if (c.includes('signature')) {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
    }
    if (c.includes('voice')) {
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25';
    }
    if (c.includes('icon')) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
    }
    if (c.includes('idias')) {
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25';
    }
    return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25';
  };

  // Switch View Mode Handler
  const handleSwitchViewMode = (mode: ViewMode) => {
    if (mode === 'week') {
      // Ensure Week view starts on THIS WEEK
      const today = new Date();
      if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
        setCurrentDate(today);
      }
    }
    setViewMode(mode);
  };

  // Calendar date navigation
  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate Week Days for Week View
  const currentWeekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 = Sunday
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + i);
      const str = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      days.push({
        date: dayDate,
        dateString: str,
        isToday: str === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  // Formatted header string for current view
  const headerDateLabel = useMemo(() => {
    if (viewMode === 'week') {
      if (currentWeekDays.length === 7) {
        const start = currentWeekDays[0].date;
        const end = currentWeekDays[6].date;
        const startStr = `${monthNames[start.getMonth()].slice(0, 3)} ${start.getDate()}`;
        const endStr = `${monthNames[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
        return `Week of ${startStr} – ${endStr}`;
      }
    }
    return `${monthNames[currentMonth]} ${currentYear}`;
  }, [viewMode, currentWeekDays, currentMonth, currentYear]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      // Type filter
      if (typeFilter === 'standalone' && c.is_advanced) {
        return false;
      }
      if (typeFilter === 'advance' && !c.is_advanced) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(query);
        const matchesSubj = c.subject?.toLowerCase().includes(query);
        const matchesId = c.tracking_id?.toLowerCase().includes(query) || c.id.toString() === query;
        const matchesBatch = (c.data_batch || c.target_batches_name)?.toLowerCase().includes(query);
        const matchesOwner = c.whose_campaign?.toLowerCase().includes(query);
        const matchesCompany = c.company?.toLowerCase().includes(query);
        const matchesTemplate = c.template_name?.toLowerCase().includes(query);
        const matchesTarget = c.target_list_name?.toLowerCase().includes(query);
        const matchesFrom = c.from_email?.toLowerCase().includes(query);

        if (!matchesName && !matchesSubj && !matchesId && !matchesBatch && !matchesOwner && !matchesCompany && !matchesTemplate && !matchesTarget && !matchesFrom) {
          return false;
        }
      }
      return true;
    });
  }, [campaigns, statusFilter, typeFilter, searchQuery]);

  // Map campaigns by Date key (YYYY-MM-DD)
  const campaignsByDate = useMemo(() => {
    const map = new Map<string, CalendarCampaign[]>();
    for (const c of filteredCampaigns) {
      if (!c.primary_date) continue;
      const existing = map.get(c.primary_date) || [];
      existing.push(c);
      map.set(c.primary_date, existing);
    }
    return map;
  }, [filteredCampaigns]);

  // Statistics for Current Month
  const currentMonthStats = useMemo(() => {
    const y = currentYear;
    const m = currentMonth;
    const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;

    let totalThisMonth = 0;
    let sentThisMonth = 0;
    let scheduledThisMonth = 0;
    let deliveredTotal = 0;
    let opensTotal = 0;

    for (const c of campaigns) {
      if (c.primary_date?.startsWith(monthPrefix)) {
        totalThisMonth++;
        if (c.status === 'sent') sentThisMonth++;
        if (c.status === 'scheduled') scheduledThisMonth++;

        if (c.performance) {
          deliveredTotal += c.performance.total_delivered || 0;
          opensTotal += c.performance.total_opens || 0;
        }
      }
    }

    const avgOpenRate = deliveredTotal > 0 ? Math.round((opensTotal / deliveredTotal) * 100) : 0;

    return {
      totalThisMonth,
      sentThisMonth,
      scheduledThisMonth,
      deliveredTotal,
      avgOpenRate,
    };
  }, [campaigns, currentYear, currentMonth]);

  // Month Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    const days: {
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Previous month padding
    const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDate - i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        dateString: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(currentYear, currentMonth, dayNum);
      const str = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        date: d,
        dateString: str,
        isCurrentMonth: true,
        isToday: str === todayStr,
      });
    }

    // Next month padding to fill grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        dateString: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Open Campaign Detail Modal
  const openCampaignDetail = (camp: CalendarCampaign, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCampaign(camp);
    setIsDetailModalOpen(true);
  };

  // Open Day Drawer
  const openDayDrawer = (dateStr: string) => {
    setSelectedDayDate(dateStr);
    setIsDayDrawerOpen(true);
  };

  // Status helper colors
  const getStatusColor = (status: CalendarCampaign['status']) => {
    switch (status) {
      case 'sent':
        return {
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'sending':
        return {
          dot: 'bg-blue-500 animate-ping',
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'scheduled':
        return {
          dot: 'bg-amber-500',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'failed':
        return {
          dot: 'bg-rose-500',
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'draft':
      default:
        return {
          dot: 'bg-zinc-400',
          badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
        };
    }
  };

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: campaigns.length,
      sent: 0,
      scheduled: 0,
      sending: 0,
      draft: 0,
      failed: 0,
    };
    campaigns.forEach(c => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });
    return counts;
  }, [campaigns]);

  // Campaigns for currently open Day Drawer
  const dayDrawerCampaigns = useMemo(() => {
    if (!selectedDayDate) return [];
    return campaignsByDate.get(selectedDayDate) || [];
  }, [selectedDayDate, campaignsByDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CalendarIcon size={20} />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Campaign Calendar
            </h1>
          </div>
          <p className="text-sm text-foreground/60">
            Track, inspect, and analyze all email campaigns run on every date.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background font-semibold text-xs md:text-sm hover:opacity-90 shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Create Campaign</span>
          </Link>

          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground font-medium text-xs md:text-sm hover:bg-hover-bg transition-colors"
          >
            <BarChart3 size={16} className="text-foreground/60" />
            <span className="hidden sm:inline">Analytics</span>
          </Link>
        </div>
      </div>

      {/* Live Month Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
            <span className="font-medium">Total Blasts ({monthNames[currentMonth].slice(0, 3)})</span>
            <CalendarDays size={14} className="text-foreground/40" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {currentMonthStats.totalThisMonth}
          </div>
          <div className="text-[11px] text-foreground/40 mt-1">
            Campaigns run or scheduled
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
            <span className="font-medium">Sent & Delivered</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {currentMonthStats.sentThisMonth}
            </span>
            {currentMonthStats.deliveredTotal > 0 && (
              <span className="text-xs text-foreground/50 font-medium truncate">
                ({currentMonthStats.deliveredTotal.toLocaleString()} delivered)
              </span>
            )}
          </div>
          <div className="text-[11px] text-emerald-600/70 font-medium mt-1">
            Completed campaign blasts
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
            <span className="font-medium">Avg Open Rate</span>
            <Zap size={14} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {currentMonthStats.avgOpenRate}%
          </div>
          <div className="text-[11px] text-foreground/40 mt-1">
            Recipient engagement average
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
            <span className="font-medium">Upcoming / Scheduled</span>
            <Hourglass size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {currentMonthStats.scheduledThisMonth}
          </div>
          <div className="text-[11px] text-amber-600/70 font-medium mt-1">
            Ready for queued dispatch
          </div>
        </div>
      </div>

      {/* Main Calendar Navigation & Filter Controls Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-xs space-y-4">
        {/* Month/Week Navigation & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Date Range Navigation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-background border border-border rounded-xl p-0.5">
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                title={viewMode === 'week' ? "Previous Week" : "Previous Month"}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:text-foreground transition-colors"
                title="Jump to Today / Current Week"
              >
                {viewMode === 'week' ? 'This Week' : 'Today'}
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                title={viewMode === 'week' ? "Next Week" : "Next Month"}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <h2 className="text-lg md:text-xl font-bold text-foreground px-2 flex items-center gap-2">
              <span>{headerDateLabel}</span>
            </h2>
          </div>

          {/* View Mode Switcher & Card Density Toggle */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Card Density Toggle for Month View */}
            {viewMode === 'month' && (
              <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-xl text-xs">
                <button
                  onClick={() => setDensityMode('detailed')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    densityMode === 'detailed'
                      ? 'bg-surface text-foreground font-semibold shadow-xs'
                      : 'text-foreground/50 hover:text-foreground'
                  }`}
                  title="Show Company, Batch, Template, and Owner on each card"
                >
                  Detailed Cards
                </button>
                <button
                  onClick={() => setDensityMode('compact')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    densityMode === 'compact'
                      ? 'bg-surface text-foreground font-semibold shadow-xs'
                      : 'text-foreground/50 hover:text-foreground'
                  }`}
                  title="Show compact pills"
                >
                  Compact
                </button>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-xl text-xs">
              <button
                onClick={() => handleSwitchViewMode('month')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'month'
                    ? 'bg-surface text-foreground font-semibold shadow-xs'
                    : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Month</span>
              </button>

              <button
                onClick={() => handleSwitchViewMode('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-surface text-foreground font-semibold shadow-xs'
                    : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                <CalendarDays size={14} />
                <span>Week</span>
              </button>

              <button
                onClick={() => handleSwitchViewMode('agenda')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-surface text-foreground font-semibold shadow-xs'
                    : 'text-foreground/50 hover:text-foreground'
                }`}
              >
                <List size={14} />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Search Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-border/60">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {(['all', 'sent', 'scheduled', 'sending', 'draft', 'failed'] as StatusFilter[]).map(status => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'bg-background hover:bg-hover-bg text-foreground/70 border border-border/80'
                  }`}
                >
                  <span className="capitalize">{status}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active ? 'bg-background/20 text-background' : 'bg-foreground/5 text-foreground/60'
                  }`}>
                    {statusCounts[status] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box & Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground/80 focus:outline-none focus:border-foreground/30 font-medium"
            >
              <option value="all">All Campaign Types</option>
              <option value="standalone">Standalone Only</option>
              <option value="advance">Advance Sequences Only</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder="Search owner, batch, template, co..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-foreground/30 transition-colors placeholder:text-foreground/30 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main View Display */}
      {loading ? (
        <div className="bg-surface border border-border rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground/50 font-medium">Loading campaign schedule...</span>
        </div>
      ) : (
        <>
          {/* MONTH GRID VIEW */}
          {viewMode === 'month' && (
            <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-border bg-foreground/[0.02] text-center">
                {weekDayNames.map(dayName => (
                  <div key={dayName} className="py-2.5 text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
                {calendarDays.map((dayItem, idx) => {
                  const dayCampaigns = campaignsByDate.get(dayItem.dateString) || [];
                  const isToday = dayItem.isToday;
                  const isCurrentMonth = dayItem.isCurrentMonth;
                  const hasCampaigns = dayCampaigns.length > 0;

                  return (
                    <div
                      key={dayItem.dateString + idx}
                      onClick={() => openDayDrawer(dayItem.dateString)}
                      className={`min-h-[170px] sm:min-h-[200px] p-2 transition-all relative flex flex-col cursor-pointer group hover:bg-foreground/[0.02] ${
                        !isCurrentMonth ? 'bg-background/40 opacity-40' : 'bg-surface'
                      } ${isToday ? 'bg-emerald-500/[0.03] ring-1 ring-inset ring-emerald-500/40' : ''}`}
                    >
                      {/* Date Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center transition-colors ${
                          isToday 
                            ? 'bg-emerald-500 text-white shadow-xs font-bold' 
                            : 'text-foreground/70 group-hover:text-foreground'
                        }`}>
                          {dayItem.date.getDate()}
                        </span>

                        {hasCampaigns && (
                          <span className="text-[10px] font-semibold text-foreground/60 bg-foreground/5 px-2 py-0.5 rounded-full">
                            {dayCampaigns.length} {dayCampaigns.length === 1 ? 'blast' : 'blasts'}
                          </span>
                        )}
                      </div>

                      {/* Campaign Cards List */}
                      <div className="space-y-1.5 flex-1 overflow-hidden">
                        {densityMode === 'detailed' ? (
                          // DETAILED CARDS VIEW (Company, Owner, Data Batch, Template)
                          dayCampaigns.slice(0, 2).map(camp => {
                            const col = getStatusColor(camp.status);
                            const meta = getCampaignMeta(camp);

                            return (
                              <div
                                key={camp.id}
                                onClick={(e) => openCampaignDetail(camp, e)}
                                className="p-2 rounded-xl border border-border/80 bg-background/90 hover:border-emerald-500/40 hover:shadow-xs transition-all text-xs space-y-1 cursor-pointer group/card"
                                title={`${camp.name}\nCompany: ${meta.company}\nOwner: ${meta.owner}\nBatch: ${meta.batch}\nTemplate: ${meta.template}`}
                              >
                                {/* Line 1: Company Badge & Status/Time */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[110px] ${getCompanyBadgeStyle(meta.company)}`}>
                                    🏢 {meta.company}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                                    {camp.primary_time && (
                                      <span className="text-[9px] font-mono text-foreground/50">{camp.primary_time}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Line 2: Whose Campaign (Owner) */}
                                <div className="flex items-center gap-1 text-[11px] font-bold text-foreground truncate">
                                  <Users size={11} className="text-emerald-500 flex-shrink-0" />
                                  <span className="truncate">{meta.owner}</span>
                                </div>

                                {/* Line 3: Data Batch */}
                                <div className="flex items-center gap-1 text-[10px] text-foreground/75 truncate bg-foreground/[0.03] px-1.5 py-0.5 rounded border border-border/40 font-mono">
                                  <FolderOpen size={10} className="text-blue-500 flex-shrink-0" />
                                  <span className="truncate">{meta.batch}</span>
                                </div>

                                {/* Line 4: Template Name */}
                                <div className="flex items-center gap-1 text-[10px] text-foreground/60 truncate">
                                  <FileText size={10} className="text-amber-500 flex-shrink-0" />
                                  <span className="truncate" title={meta.template}>{meta.template}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          // COMPACT PILLS VIEW
                          dayCampaigns.slice(0, 3).map(camp => {
                            const col = getStatusColor(camp.status);
                            const meta = getCampaignMeta(camp);

                            return (
                              <div
                                key={camp.id}
                                onClick={(e) => openCampaignDetail(camp, e)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-foreground transition-all truncate"
                                title={`${camp.name}\nCompany: ${meta.company}\nOwner: ${meta.owner}\nBatch: ${meta.batch}\nTemplate: ${meta.template}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${col.dot}`} />
                                <span className="font-bold text-[10px] text-foreground/80 truncate">
                                  {meta.company.slice(0, 8)}
                                </span>
                                <span className="text-foreground/40 font-mono text-[9px]">·</span>
                                <span className="truncate flex-1 font-medium text-foreground/90">
                                  {meta.owner}
                                </span>
                              </div>
                            );
                          })
                        )}

                        {/* +N More indicator */}
                        {dayCampaigns.length > (densityMode === 'detailed' ? 2 : 3) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDayDrawer(dayItem.dateString);
                            }}
                            className="w-full text-left px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            +{dayCampaigns.length - (densityMode === 'detailed' ? 2 : 3)} more blasts
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW (Properly Centered on Active/Current Week) */}
          {viewMode === 'week' && (
            <div className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between text-sm bg-foreground/[0.015]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{headerDateLabel}</span>
                  <span className="text-xs text-foreground/50 hidden sm:inline">(Sunday to Saturday schedule)</span>
                </div>
                <span className="text-xs text-foreground/50">Click any card to inspect full details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {currentWeekDays.map(weekDayItem => {
                  const dayCampaigns = campaignsByDate.get(weekDayItem.dateString) || [];
                  const isToday = weekDayItem.isToday;

                  return (
                    <div 
                      key={weekDayItem.dateString} 
                      className={`p-3 min-h-[420px] flex flex-col ${
                        isToday ? 'bg-emerald-500/[0.03] ring-1 ring-inset ring-emerald-500/30' : ''
                      }`}
                    >
                      {/* Column Header */}
                      <div className="border-b border-border/60 pb-2.5 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-foreground/50">
                            {weekDayNames[weekDayItem.date.getDay()]}
                          </span>
                          {isToday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white shadow-2xs">
                              TODAY
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-base font-extrabold ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {weekDayItem.date.getDate()} {monthNames[weekDayItem.date.getMonth()].slice(0, 3)}
                          </span>
                          <span className="text-[10px] bg-foreground/5 px-2 py-0.5 rounded-full text-foreground/60 font-semibold">
                            {dayCampaigns.length}
                          </span>
                        </div>
                      </div>

                      {/* Campaigns in this day of the week */}
                      <div className="space-y-2.5 flex-1">
                        {dayCampaigns.map(camp => {
                          const col = getStatusColor(camp.status);
                          const meta = getCampaignMeta(camp);

                          return (
                            <div
                              key={camp.id}
                              onClick={() => openCampaignDetail(camp)}
                              className="p-3 rounded-xl border border-border bg-background hover:border-emerald-500/50 hover:shadow-sm transition-all cursor-pointer space-y-1.5 group"
                            >
                              {/* Row 1: Company Badge & Status */}
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border truncate ${getCompanyBadgeStyle(meta.company)}`}>
                                  🏢 {meta.company}
                                </span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${col.badge}`}>
                                  {camp.status}
                                </span>
                              </div>

                              {/* Row 2: Whose Campaign */}
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                                <Users size={12} className="text-emerald-500 flex-shrink-0" />
                                <span className="truncate">{meta.owner}</span>
                              </div>

                              {/* Row 3: Data Batch */}
                              <div className="flex items-center gap-1.5 text-[11px] text-foreground/75 truncate bg-foreground/[0.03] px-2 py-0.5 rounded border border-border/40 font-mono">
                                <FolderOpen size={11} className="text-blue-500 flex-shrink-0" />
                                <span className="truncate font-semibold">{meta.batch}</span>
                              </div>

                              {/* Row 4: Template Name */}
                              <div className="flex items-center gap-1.5 text-[10px] text-foreground/60 truncate">
                                <FileText size={11} className="text-amber-500 flex-shrink-0" />
                                <span className="truncate" title={meta.template}>{meta.template}</span>
                              </div>

                              {/* Row 5: Time and Tracking ID */}
                              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] font-mono text-foreground/40">
                                <span>{camp.primary_time || '—'}</span>
                                {camp.tracking_id && <span>#{camp.tracking_id}</span>}
                              </div>
                            </div>
                          );
                        })}

                        {dayCampaigns.length === 0 && (
                          <div className="h-32 flex items-center justify-center text-xs text-foreground/30 italic">
                            No campaigns
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGENDA / TIMELINE LIST VIEW */}
          {viewMode === 'agenda' && (
            <div className="bg-surface border border-border rounded-2xl shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-bold text-base text-foreground">
                  Chronological Blast Timeline
                </h3>
                <span className="text-xs text-foreground/50">
                  Showing {filteredCampaigns.length} campaigns
                </span>
              </div>

              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12 text-foreground/40 text-sm">
                  No campaigns match your selected filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCampaigns.map(camp => {
                    const col = getStatusColor(camp.status);
                    const perf = camp.performance;
                    const meta = getCampaignMeta(camp);

                    return (
                      <div
                        key={camp.id}
                        onClick={() => openCampaignDetail(camp)}
                        className="p-4 rounded-xl border border-border bg-background hover:bg-foreground/[0.02] hover:border-foreground/20 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getCompanyBadgeStyle(meta.company)}`}>
                              🏢 {meta.company}
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              👤 {meta.owner}
                            </span>
                            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-foreground/5 text-foreground/80 border border-border">
                              🗂️ {meta.batch}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${col.badge}`}>
                              {camp.status}
                            </span>
                            <span className="text-xs font-medium text-foreground/50 flex items-center gap-1">
                              <CalendarIcon size={12} />
                              {camp.primary_date} {camp.primary_time ? `at ${camp.primary_time}` : ''}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-base font-bold text-foreground">
                              {camp.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-foreground/60">
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <FileText size={12} />
                                {meta.template}
                              </span>
                              {camp.subject && (
                                <span className="italic line-clamp-1 opacity-70">
                                  — &quot;{camp.subject}&quot;
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats on the right */}
                        <div className="flex items-center gap-4 flex-shrink-0 self-start md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                          {perf ? (
                            <div className="flex items-center gap-3 text-right text-xs">
                              <div>
                                <div className="text-foreground/40 text-[10px]">Delivered</div>
                                <div className="font-bold text-foreground">{perf.total_delivered}</div>
                              </div>
                              <div>
                                <div className="text-foreground/40 text-[10px]">Open Rate</div>
                                <div className="font-bold text-blue-600">{perf.open_rate}%</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-foreground/40 italic">
                              {camp.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                            </span>
                          )}

                          <button
                            onClick={(e) => openCampaignDetail(camp, e)}
                            className="p-2 rounded-xl border border-border hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
                            title="Inspect details"
                          >
                            <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Slide-Over Drawer for Selected Day */}
      {isDayDrawerOpen && selectedDayDate && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsDayDrawerOpen(false)} />
          
          <div className="relative w-full max-w-md bg-surface border-l border-border h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-foreground/[0.02]">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-foreground/50">
                  Day Schedule
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedDayDate}
                </h3>
              </div>
              <button
                onClick={() => setIsDayDrawerOpen(false)}
                className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-foreground/5"
              >
                <X size={18} />
              </button>
            </div>

            {/* Day stats summary */}
            <div className="p-4 bg-foreground/[0.015] border-b border-border flex justify-between text-xs">
              <div>
                <span className="text-foreground/50">Total Blasts: </span>
                <strong className="text-foreground">{dayDrawerCampaigns.length}</strong>
              </div>
              <div>
                <span className="text-foreground/50">Sent: </span>
                <strong className="text-emerald-600">
                  {dayDrawerCampaigns.filter(c => c.status === 'sent').length}
                </strong>
              </div>
              <div>
                <span className="text-foreground/50">Scheduled: </span>
                <strong className="text-amber-600">
                  {dayDrawerCampaigns.filter(c => c.status === 'scheduled').length}
                </strong>
              </div>
            </div>

            {/* Campaigns List in Day Drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {dayDrawerCampaigns.length === 0 ? (
                <div className="text-center py-12 text-foreground/40 text-sm">
                  No campaigns run or scheduled on this date.
                </div>
              ) : (
                dayDrawerCampaigns.map(camp => {
                  const col = getStatusColor(camp.status);
                  const meta = getCampaignMeta(camp);

                  return (
                    <div
                      key={camp.id}
                      onClick={() => openCampaignDetail(camp)}
                      className="p-4 rounded-xl border border-border bg-background hover:border-emerald-500/40 transition-all cursor-pointer space-y-2 group shadow-2xs"
                    >
                      {/* Company & Status row */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCompanyBadgeStyle(meta.company)}`}>
                          🏢 {meta.company}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${col.badge}`}>
                            {camp.status}
                          </span>
                          {camp.primary_time && (
                            <span className="text-xs font-mono text-foreground/50">
                              {camp.primary_time}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Owner & Data Batch */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Users size={13} className="text-emerald-500 flex-shrink-0" />
                          <span>Owner: {meta.owner}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-foreground/75 font-mono bg-foreground/[0.03] px-2 py-0.5 rounded border border-border/40">
                          <FolderOpen size={12} className="text-blue-500 flex-shrink-0" />
                          <span>Batch: {meta.batch}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                          <FileText size={12} className="text-amber-500 flex-shrink-0" />
                          <span className="truncate">Template: {meta.template}</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors pt-1 border-t border-border/40">
                        {camp.name}
                      </h4>

                      {camp.subject && (
                        <p className="text-xs text-foreground/60 italic line-clamp-1">
                          &quot;{camp.subject}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-end text-xs text-emerald-600 font-semibold pt-1">
                        <span className="inline-flex items-center gap-1">
                          Inspect Details <ArrowUpRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border bg-foreground/[0.02]">
              <Link
                href="/campaigns/new"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background font-semibold text-xs shadow-xs"
              >
                <Plus size={14} />
                <span>Schedule New Campaign for this Date</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Rich Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSendNow={handleSendCampaign}
      />
    </div>
  );
}
