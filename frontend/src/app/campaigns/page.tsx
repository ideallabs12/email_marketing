'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, X, Send, AlertCircle, RefreshCw, ChartNoAxesCombined, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Campaign, ContactList, EmailTemplate } from '../../types';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);


  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const hasSending = campaigns.some(c => c.status === 'sending');
    if (hasSending && !polling) {
      setPolling(true);
    }
  }, [campaigns, polling]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (polling) {
      intervalId = setInterval(async () => {
        try {
          const campaignsRes = await apiClient.get('/api/v1/campaigns/');
          const activeCampaigns: Campaign[] = campaignsRes.results || [];
          setCampaigns(activeCampaigns);

          const stillSending = activeCampaigns.some(c => c.status === 'sending');
          if (!stillSending) {
            setPolling(false);
          }
        } catch (err) {
          console.error('Failed to poll campaigns:', err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [polling]);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [campaignsRes, listsRes, templatesRes] = await Promise.all([
        apiClient.get('/api/v1/campaigns/?limit=10000'),
        apiClient.get('/api/v1/contact-lists/?limit=10000'),
        apiClient.get('/api/v1/templates/?limit=10000'),
      ]);
      setCampaigns(campaignsRes.results || []);
      setLists(listsRes.results || []);
      setTemplates(templatesRes.results || []);
    } catch (err) {
      console.error('Failed to load campaigns initial data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSendCampaign = async (campaignId: number) => {
    setActionError('');
    const confirmed = window.confirm('Are you sure you want to send this campaign now? This will immediately mail all contacts in the target list.');
    if (!confirmed) return;

    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'sending' } : c));

    try {
      await apiClient.post(`/api/v1/campaigns/${campaignId}/send/`, {});
      setPolling(true);
    } catch (err: any) {
      setActionError(err.message || 'Failed to send campaign.');
      loadInitialData();
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    setActionError('');
    const confirmed = window.confirm(
      `Delete “${campaign.name}”? This permanently removes the campaign and its analytics.`
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/v1/campaigns/${campaign.id}/`);
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete campaign.');
    }
  };

  const getListName = (id: number) => lists.find(l => l.id === id)?.name || `List #${id}`;
  const getTemplateName = (id: number) => templates.find(t => t.id === id)?.name || `Template #${id}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage and send your email campaigns.</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus size={16} />
            <span>New Campaign</span>
          </Button>
        </Link>
      </div>

      {actionError && (
        <div className="p-3 bg-red-950/20 text-red-500 text-sm rounded-md font-medium border border-red-900/30 flex items-start space-x-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <Card className="p-4">
        <div className="border-t border-border pt-3">
          <div className="grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-2 border-b border-border mb-2">
            <span className="col-span-3">Name</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-3">Target List</span>
            <span className="col-span-2">Sent At</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {loading ? (
            <div className="text-sm text-foreground/40 py-12 text-center">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              No campaigns found. Create your first campaign to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <div key={c.id} className="grid grid-cols-12 py-3 text-sm items-center">
                  <div className="col-span-3 flex flex-col pr-2">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-[10px] text-foreground/40 mt-1 truncate font-medium">Template: {getTemplateName(c.template)}</span>
                    <span className="text-[10px] text-foreground/40 mt-0.5 truncate">From: {c.from_email}</span>
                  </div>
                  <span className="col-span-2 capitalize text-xs">
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
                  <span className="col-span-3 truncate">{getListName(c.target_list)}</span>
                  <span className="col-span-2">{c.sent_at ? new Date(c.sent_at).toLocaleString() : '—'}</span>
                  <div className="col-span-2 text-right">
                    {(c.status === 'draft' || c.status === 'failed') ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" className="py-1 px-3 text-xs" onClick={() => handleSendCampaign(c.id)}>
                          <Send size={12} />
                          <span>Send Now</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="py-1 px-2 text-red-600 border-red-600/40 hover:bg-red-600 hover:text-white hover:border-red-600"
                          onClick={() => handleDeleteCampaign(c)}
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    ) : c.status === 'sending' ? (
                      <span className="text-xs text-foreground/40 italic">Sending...</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/campaigns/${c.id}/analytics`}
                          className="inline-flex items-center gap-1 rounded-md border border-foreground bg-background px-3 py-1 text-xs font-medium hover:bg-foreground hover:text-background transition-colors"
                        >
                          <ChartNoAxesCombined size={13} />
                          View Analytics
                        </Link>
                        <Button
                          variant="outline"
                          className="py-1 px-2 text-red-600 border-red-600/40 hover:bg-red-600 hover:text-white hover:border-red-600"
                          onClick={() => handleDeleteCampaign(c)}
                          title={`Delete ${c.name}`}
                        >
                          <Trash2 size={13} />
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
