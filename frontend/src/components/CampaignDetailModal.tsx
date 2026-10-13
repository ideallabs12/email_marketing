'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  X, Calendar, Clock, Mail, Users, FileText, CheckCircle2, 
  AlertCircle, Hourglass, BarChart3, Copy, Check, ExternalLink, 
  Send, Layers, Smartphone, Monitor, ChevronRight, Zap
} from 'lucide-react';
import { CalendarCampaign } from '@/types';
import { apiClient } from '@/services/apiClient';

interface CampaignDetailModalProps {
  campaign: CalendarCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSendNow?: (id: number) => void;
}

export default function CampaignDetailModal({
  campaign,
  isOpen,
  onClose,
  onSendNow,
}: CampaignDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'template' | 'metrics'>('overview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !campaign) {
      setActiveTab('overview');
      return;
    }

    // If template_html is already included, use it
    if (campaign.template_html) {
      setTemplateHtml(campaign.template_html);
    } else if (campaign.template_id) {
      // Fetch full template if not already present
      setLoadingTemplate(true);
      apiClient.get(`/api/v1/templates/${campaign.template_id}/`)
        .then(res => {
          setTemplateHtml(res.html_content || res.body || '');
        })
        .catch(err => {
          console.error('Failed to load template content:', err);
          setTemplateHtml(campaign.template_body || '<p>No preview available</p>');
        })
        .finally(() => setLoadingTemplate(false));
    } else {
      setTemplateHtml(campaign.template_body || '');
    }
  }, [isOpen, campaign]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !campaign) return null;

  const handleCopyTrackingId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = campaign.tracking_id || campaign.id.toString();
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareToken = campaign.share_token;
    if (!shareToken) return;
    const url = `${window.location.origin}/public/campaign/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: CalendarCampaign['status']) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Sent
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Sending...
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Hourglass size={13} className="text-amber-500" />
            Scheduled
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle size={13} className="text-rose-500" />
            Failed
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
            <Clock size={13} className="text-zinc-400" />
            Draft
          </span>
        );
    }
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const perf = campaign.performance;
  const sentCount = perf?.total_sent || 0;
  const deliveredCount = perf?.total_delivered || 0;
  const opensCount = perf?.total_opens || 0;
  const clicksCount = perf?.total_clicks || 0;
  const bouncesCount = (perf?.total_bounces || 0) + (perf?.total_failed || 0);

  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : (campaign.status === 'sent' ? 100 : 0);
  const openRate = perf?.open_rate !== undefined ? perf.open_rate : (deliveredCount > 0 ? Math.round((opensCount / deliveredCount) * 100) : 0);
  const clickRate = perf?.click_rate !== undefined ? perf.click_rate : (deliveredCount > 0 ? Math.round((clicksCount / deliveredCount) * 100) : 0);

  const analyticsUrl = campaign.is_advanced && campaign.advance_campaign_id
    ? `/advance-campaigns/${campaign.advance_campaign_id}`
    : `/campaigns/${campaign.id}/analytics`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 transition-all text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-border bg-foreground/[0.02]">
          <div className="space-y-2 pr-6">
            <div className="flex items-center flex-wrap gap-2.5">
              {getStatusBadge(campaign.status)}

              {campaign.tracking_id && (
                <button
                  onClick={handleCopyTrackingId}
                  title="Click to copy Tracking ID"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-foreground/5 text-foreground/70 border border-border hover:bg-foreground/10 transition-colors"
                >
                  <span>#{campaign.tracking_id}</span>
                  {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} className="opacity-60" />}
                </button>
              )}

              {campaign.is_advanced && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Layers size={11} />
                  Advance Sequence
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground line-clamp-2">
              {campaign.name}
            </h2>

            <div className="flex items-center flex-wrap gap-y-1 gap-x-4 text-xs text-foreground/60">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={13} className="text-foreground/40" />
                {campaign.run_date_type === 'sent' && 'Sent: '}
                {campaign.run_date_type === 'scheduled' && 'Scheduled: '}
                {campaign.run_date_type === 'created' && 'Created: '}
                <strong className="text-foreground/80 font-medium">
                  {formatDateDisplay(campaign.sent_at || campaign.scheduled_at || campaign.created_at)}
                </strong>
              </span>

              {campaign.from_email && (
                <span className="inline-flex items-center gap-1.5 truncate max-w-xs">
                  <Mail size={13} className="text-foreground/40" />
                  <span className="truncate">{campaign.from_email}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 md:px-6 bg-foreground/[0.015] border-b border-border">
          <div className="p-3 rounded-xl bg-background border border-border/70 flex flex-col">
            <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
              <span>Recipients / Sent</span>
              <Users size={14} className="text-foreground/40" />
            </div>
            <div className="text-xl font-bold tracking-tight">
              {sentCount > 0 ? sentCount.toLocaleString() : (campaign.status === 'sent' ? 'Sent' : '—')}
            </div>
            <div className="text-[11px] text-foreground/40 mt-0.5 truncate">
              {campaign.target_list_name || 'List'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border/70 flex flex-col">
            <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
              <span>Delivered</span>
              <CheckCircle2 size={14} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {deliveredCount.toLocaleString()}
              </span>
              {sentCount > 0 && (
                <span className="text-xs font-semibold text-emerald-600/70">
                  {deliveryRate}%
                </span>
              )}
            </div>
            <div className="w-full bg-foreground/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(deliveryRate, 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border/70 flex flex-col">
            <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
              <span>Opens</span>
              <BarChart3 size={14} className="text-blue-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {opensCount.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-blue-600/70">
                {openRate}%
              </span>
            </div>
            <div className="w-full bg-foreground/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(openRate, 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border/70 flex flex-col">
            <div className="flex items-center justify-between text-xs text-foreground/50 mb-1">
              <span>Clicks</span>
              <Zap size={14} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {clicksCount.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-amber-600/70">
                {clickRate}%
              </span>
            </div>
            <div className="w-full bg-foreground/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(clickRate, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-border bg-surface">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-foreground font-semibold'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              Overview & Target
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'template'
                  ? 'border-emerald-500 text-foreground font-semibold'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              Email Template
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'metrics'
                  ? 'border-emerald-500 text-foreground font-semibold'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              Engagement Breakdown
            </button>
          </div>

          {activeTab === 'template' && (
            <div className="hidden sm:flex items-center gap-1 bg-foreground/5 p-1 rounded-lg border border-border/50 text-xs">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
                  previewDevice === 'desktop' ? 'bg-surface shadow-xs text-foreground font-medium' : 'text-foreground/50 hover:text-foreground'
                }`}
                title="Desktop Preview"
              >
                <Monitor size={14} />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-md flex items-center gap-1 transition-colors ${
                  previewDevice === 'mobile' ? 'bg-surface shadow-xs text-foreground font-medium' : 'text-foreground/50 hover:text-foreground'
                }`}
                title="Mobile Preview"
              >
                <Smartphone size={14} />
                <span>Mobile</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* TAB 1: OVERVIEW & TARGET */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Subject Banner */}
              <div className="p-4 rounded-xl bg-foreground/[0.02] border border-border space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Subject Line
                </div>
                <div className="text-base font-medium text-foreground">
                  {campaign.subject || 'No subject set'}
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Audience Card */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Users size={16} className="text-emerald-500" />
                    Target Audience
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-foreground/60">Contact List:</span>
                      <span className="font-medium text-foreground text-right">{campaign.target_list_name || 'Standard List'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-foreground/60">Batches:</span>
                      <span className="font-medium text-foreground text-right">{campaign.target_batches_name || 'All Contacts'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-foreground/60">Target String:</span>
                      <span className="text-xs font-mono bg-foreground/5 px-2 py-0.5 rounded text-foreground/80">{campaign.target_display || 'Default'}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Details Card */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock size={16} className="text-blue-500" />
                    Dispatch Timeline
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-foreground/60">Created Date:</span>
                      <span className="font-medium text-foreground">{formatDateDisplay(campaign.created_at)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-foreground/60">Scheduled For:</span>
                      <span className="font-medium text-foreground">{formatDateDisplay(campaign.scheduled_at)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-foreground/60">Sent Timestamp:</span>
                      <span className="font-medium text-foreground">{formatDateDisplay(campaign.sent_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Sender Identity Card */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Mail size={16} className="text-purple-500" />
                    Sender Identity
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-foreground/60">From Address:</span>
                      <span className="font-mono text-xs font-medium text-foreground">{campaign.from_email || 'Default Sender'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-foreground/60">Template:</span>
                      <span className="font-medium text-foreground">{campaign.template_name || `Template #${campaign.template_id || '—'}`}</span>
                    </div>
                  </div>
                </div>

                {/* Sequence & Token Card */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Layers size={16} className="text-amber-500" />
                    Sequence & Links
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-foreground/60">Parent Sequence:</span>
                      <span className="font-medium text-foreground truncate max-w-[180px] text-right">
                        {campaign.advance_campaign_name ? (
                          <Link 
                            href={`/advance-campaigns/${campaign.advance_campaign_id}`}
                            className="text-emerald-600 hover:underline inline-flex items-center gap-1"
                          >
                            {campaign.advance_campaign_name}
                            <ChevronRight size={12} />
                          </Link>
                        ) : 'Standalone Blast'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-foreground/60">Share Token:</span>
                      {campaign.share_token ? (
                        <button
                          onClick={handleCopyShareLink}
                          className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-emerald-500 transition-colors"
                        >
                          <span className="font-mono">{campaign.share_token.slice(0, 8)}...</span>
                          {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      ) : (
                        <span className="text-foreground/40 text-xs">Not generated</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEMPLATE PREVIEW */}
          {activeTab === 'template' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-foreground/[0.02] border border-border rounded-xl text-xs space-y-1">
                <div><strong className="text-foreground/60">Subject:</strong> {campaign.subject}</div>
                <div><strong className="text-foreground/60">From:</strong> {campaign.from_email}</div>
              </div>

              {loadingTemplate ? (
                <div className="flex items-center justify-center h-72 border border-border rounded-xl bg-background">
                  <div className="flex flex-col items-center gap-2 text-foreground/40">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading email preview...</span>
                  </div>
                </div>
              ) : templateHtml ? (
                <div className={`mx-auto transition-all duration-300 border border-border rounded-xl shadow-inner overflow-hidden bg-white ${
                  previewDevice === 'mobile' ? 'max-w-[390px] min-h-[500px]' : 'w-full min-h-[500px]'
                }`}>
                  <iframe
                    srcDoc={templateHtml}
                    title="Template Preview"
                    className="w-full h-[550px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-foreground/40 border border-border rounded-xl bg-background">
                  <FileText className="mx-auto mb-2 opacity-40" size={32} />
                  No HTML content available for this template.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: METRICS BREAKDOWN */}
          {activeTab === 'metrics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-foreground/[0.02] space-y-2">
                  <div className="text-xs font-semibold text-foreground/50">DELIVERY HEALTH</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {deliveryRate}%
                  </div>
                  <div className="text-xs text-foreground/60">
                    {deliveredCount.toLocaleString()} delivered out of {sentCount.toLocaleString()} sent
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-foreground/[0.02] space-y-2">
                  <div className="text-xs font-semibold text-foreground/50">OPEN RATE</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {openRate}%
                  </div>
                  <div className="text-xs text-foreground/60">
                    {opensCount.toLocaleString()} total opens registered
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-foreground/[0.02] space-y-2">
                  <div className="text-xs font-semibold text-foreground/50">BOUNCES / FAILED</div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {bouncesCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {sentCount > 0 ? `${((bouncesCount / sentCount) * 100).toFixed(1)}% bounce rate` : 'Zero errors recorded'}
                  </div>
                </div>
              </div>

              {/* Engagement funnel visualization */}
              <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Delivery & Engagement Funnel</h4>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-foreground/70">1. Total Targeted</span>
                      <span className="font-semibold">{sentCount > 0 ? sentCount.toLocaleString() : '—'}</span>
                    </div>
                    <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-zinc-500 h-full w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">2. Successfully Delivered</span>
                      <span className="font-semibold">{deliveredCount.toLocaleString()} ({deliveryRate}%)</span>
                    </div>
                    <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(deliveryRate, 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-blue-600 dark:text-blue-400">3. Opened by Recipient</span>
                      <span className="font-semibold">{opensCount.toLocaleString()} ({openRate}%)</span>
                    </div>
                    <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${Math.min(openRate, 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-amber-600 dark:text-amber-400">4. Clicked Link in Email</span>
                      <span className="font-semibold">{clicksCount.toLocaleString()} ({clickRate}%)</span>
                    </div>
                    <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${Math.min(clickRate, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 md:px-6 border-t border-border bg-foreground/[0.02]">
          <div className="flex items-center gap-2">
            {campaign.share_token && (
              <button
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-border hover:bg-foreground/5 text-foreground/80 transition-colors"
              >
                {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>
            )}

            {(campaign.status === 'draft' || campaign.status === 'failed') && onSendNow && (
              <button
                onClick={() => onSendNow(campaign.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                <Send size={14} />
                <span>Send Campaign Now</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={analyticsUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 shadow-xs transition-opacity"
            >
              <span>View Full Analytics</span>
              <ExternalLink size={13} />
            </Link>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
