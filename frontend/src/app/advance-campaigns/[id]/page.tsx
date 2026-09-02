'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft, Plus, Send, AlertCircle, RefreshCw, ChartNoAxesCombined, Trash2 } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { AdvanceCampaign, Campaign, ContactList, EmailTemplate } from '../../../types';

export default function AdvanceCampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [advCampaign, setAdvCampaign] = useState<AdvanceCampaign | null>(null);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, [id]);

  useEffect(() => {
    const hasSending = advCampaign?.campaigns?.some(c => c.status === 'sending');
    if (hasSending && !polling) {
      setPolling(true);
    }
  }, [advCampaign, polling]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (polling) {
      intervalId = setInterval(async () => {
        try {
          const res = await apiClient.get(`/api/v1/advance-campaigns/${id}/`);
          setAdvCampaign(res);
          const stillSending = res.campaigns?.some((c: Campaign) => c.status === 'sending');
          if (!stillSending) {
            setPolling(false);
          }
        } catch (err) {
          console.error('Failed to poll advance campaign:', err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polling, id]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [campaignRes, listsRes, templatesRes] = await Promise.all([
        apiClient.get(`/api/v1/advance-campaigns/${id}/`),
        apiClient.get('/api/v1/contact-lists/?limit=10000'),
        apiClient.get('/api/v1/templates/?limit=10000'),
      ]);
      setAdvCampaign(campaignRes);
      setLists(listsRes.results || []);
      setTemplates(templatesRes.results || []);
    } catch (err) {
      console.error('Failed to load detail data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSendCampaign = async (campaignId: number) => {
    setActionError('');
    const confirmed = window.confirm('Are you sure you want to send this blast now? This will immediately mail all contacts in the target list.');
    if (!confirmed) return;

    if (advCampaign) {
        const updatedSends = (advCampaign.campaigns || []).map(c => 
            c.id === campaignId ? { ...c, status: 'sending' as any } : c
        );
        setAdvCampaign({ ...advCampaign, campaigns: updatedSends });
    }

    try {
      await apiClient.post(`/api/v1/campaigns/${campaignId}/send/`, {});
      setPolling(true);
    } catch (err: any) {
      setActionError(err.message || 'Failed to send blast.');
      loadInitialData();
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    setActionError('');
    const confirmed = window.confirm(
      `Delete blast “${campaign.name}”? This permanently removes the blast and its analytics.`
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/v1/campaigns/${campaign.id}/`);
      if (advCampaign) {
          const updatedSends = (advCampaign.campaigns || []).filter(c => c.id !== campaign.id);
          setAdvCampaign({ ...advCampaign, campaigns: updatedSends });
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete blast.');
    }
  };

  const getListName = (listId: number) => lists.find(l => l.id === listId)?.name || `List #${listId}`;
  const getTemplateName = (templateId: number) => templates.find(t => t.id === templateId)?.name || `Template #${templateId}`;

  if (loading || !advCampaign) {
    return <div className="text-center py-12 text-foreground/50">Loading advanced campaign...</div>;
  }

  const sends = advCampaign.campaigns || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/advance-campaigns" className="text-foreground/50 hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{advCampaign.name}</h1>
          <p className="text-foreground/50 mt-1 text-sm">Targeting: {getListName(advCampaign.target_list)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Email Sends (Blasts)</h2>
        <Link href={`/advance-campaigns/${advCampaign.id}/sends/new`}>
          <Button>
            <Plus size={16} />
            <span className="ml-1">New Send</span>
          </Button>
        </Link>
      </div>

      {actionError && (
        <div className="p-3 mb-4 bg-red-950/20 text-red-500 text-sm rounded-md font-medium border border-red-900/30 flex items-start space-x-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <Card className="p-4">
        <div className="border-t border-border pt-3">
          <div className="hidden md:grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-2 border-b border-border mb-2 px-2">
            <span className="col-span-4">Name</span>
            <span className="col-span-3">Status</span>
            <span className="col-span-3">Sent At</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {sends.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              No sends found. Create your first blast to this target list.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sends.map((c) => (
                <div key={c.id} className="flex flex-col md:grid md:grid-cols-12 gap-1 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/5 rounded-lg md:rounded-md border border-border md:border-transparent bg-foreground/[0.02] md:bg-transparent px-3 md:px-2 mb-4 md:mb-0 transition-colors shadow-sm md:shadow-none">
                  {/* Name and Basic Info */}
                  <div className="flex flex-col md:col-span-4 pr-2 min-w-0 w-full mb-3 md:mb-0">
                    <span className="font-bold md:font-medium text-base md:text-sm truncate text-foreground">{c.name}</span>
                    <span className="text-xs text-foreground/50 mt-1 truncate font-medium">Template: {getTemplateName(c.template)}</span>
                    <span className="text-xs text-foreground/50 mt-0.5 truncate">From: {c.from_email}</span>
                  </div>

                  {/* Status Group */}
                  <div className="flex flex-col md:col-span-3 md:block mb-2 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Status</span>
                    <span className="capitalize text-xs">
                      <span className={`px-2 py-0.5 border rounded-full inline-flex items-center space-x-1 ${
                        c.status === 'sent' ? 'border-foreground text-foreground font-bold' :
                        c.status === 'sending' ? 'border-foreground/30 text-foreground/50 animate-pulse' :
                        c.status === 'failed' ? 'border-red-900/40 text-red-500 font-bold' :
                        'border-border text-foreground/40'
                      }`}>
                        {c.status === 'sending' && <RefreshCw size={10} className="animate-spin mr-1" />}
                        <span>{c.status}</span>
                      </span>
                    </span>
                  </div>

                  {/* Sent Date Group */}
                  <div className="flex flex-col md:col-span-3 md:block w-full mb-4 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Sent At</span>
                    <span className="text-foreground/70">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}</span>
                  </div>

                  {/* Actions Group */}
                  <div className="w-full pt-3 border-t border-border/50 md:border-0 md:pt-0 md:col-span-2 text-left md:text-right">
                    {(c.status === 'draft' || c.status === 'failed') ? (
                      <div className="flex items-center md:justify-end gap-2">
                        <Button variant="outline" className="py-1.5 md:py-1 px-3 text-xs w-full md:w-auto justify-center" onClick={() => handleSendCampaign(c.id)}>
                          <Send size={12} />
                          <span>Send Now</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="py-1.5 md:py-1 px-3 md:px-2 text-red-600 border-red-600/40 hover:bg-red-600 hover:text-white hover:border-red-600"
                          onClick={() => handleDeleteCampaign(c)}
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 size={14} className="md:w-3.5 md:h-3.5" />
                        </Button>
                      </div>
                    ) : c.status === 'sending' ? (
                      <span className="text-xs text-foreground/40 italic">Sending...</span>
                    ) : (
                      <div className="flex items-center md:justify-end gap-2">
                        <Link
                          href={`/advance-campaigns/${advCampaign.id}/sends/${c.id}`}
                          className="inline-flex items-center justify-center gap-1 w-full md:w-auto rounded-md border border-foreground bg-background px-3 py-1.5 md:py-1 text-xs font-medium hover:bg-foreground hover:text-background transition-colors"
                        >
                          <ChartNoAxesCombined size={13} />
                          Analytics
                        </Link>
                        <Button
                          variant="outline"
                          className="py-1.5 md:py-1 px-3 md:px-2 text-red-600 border-red-600/40 hover:bg-red-600 hover:text-white hover:border-red-600"
                          onClick={() => handleDeleteCampaign(c)}
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 size={14} className="md:w-3.5 md:h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
