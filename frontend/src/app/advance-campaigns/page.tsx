'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, AlertCircle, Trash2, Layers } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { AdvanceCampaign, ContactList } from '../../types';

export default function AdvanceCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdvanceCampaign[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [campaignsRes, listsRes] = await Promise.all([
        apiClient.get('/api/v1/advance-campaigns/?limit=10000'),
        apiClient.get('/api/v1/contact-lists/?limit=10000'),
      ]);
      setCampaigns(campaignsRes.results || []);
      setLists(listsRes.results || []);
    } catch (err) {
      console.error('Failed to load advance campaigns initial data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteCampaign = async (campaign: AdvanceCampaign) => {
    setActionError('');
    const confirmed = window.confirm(
      `Delete “${campaign.name}”? This permanently removes the advanced campaign and all its child sends/analytics.`
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/v1/advance-campaigns/${campaign.id}/`);
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete advanced campaign.');
    }
  };

  const getListName = (id: number) => lists.find(l => l.id === id)?.name || `List #${id}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Campaigns</h1>
          <p className="text-foreground/50 mt-1 text-sm">Group multiple email sends to the same target list over time.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/advance-campaigns/new">
            <Button>
              <Plus size={16} />
              <span>New Adv. Campaign</span>
            </Button>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-950/20 text-red-500 text-sm rounded-md font-medium border border-red-900/30 flex items-start space-x-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <Card className="p-4">
        <div className="border-t border-border pt-3">
          <div className="hidden md:grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-2 border-b border-border mb-2 px-2">
            <span className="col-span-4">Name</span>
            <span className="col-span-3">Target List</span>
            <span className="col-span-3">Created At</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {loading ? (
            <div className="text-sm text-foreground/40 py-12 text-center">Loading advanced campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              No advanced campaigns found. Create your first container to get started.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <div key={c.id} className="flex flex-col md:grid md:grid-cols-12 gap-1 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/5 rounded-lg md:rounded-md border border-border md:border-transparent bg-foreground/[0.02] md:bg-transparent px-3 md:px-2 mb-4 md:mb-0 transition-colors shadow-sm md:shadow-none">
                  {/* Name and Basic Info */}
                  <div className="flex flex-col md:col-span-4 pr-2 min-w-0 w-full mb-3 md:mb-0">
                    <span className="font-bold md:font-medium text-base md:text-sm truncate text-foreground">{c.name}</span>
                  </div>

                  {/* List Group */}
                  <div className="flex flex-col text-left md:col-span-3 md:block min-w-0 mb-2 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Target List</span>
                    <span className="truncate font-medium text-foreground/80">{getListName(c.target_list)}</span>
                  </div>

                  {/* Created Date Group */}
                  <div className="flex flex-col md:col-span-3 md:block w-full mb-4 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Created At</span>
                    <span className="text-foreground/70">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Actions Group */}
                  <div className="w-full pt-3 border-t border-border/50 md:border-0 md:pt-0 md:col-span-2 text-left md:text-right">
                    <div className="flex items-center md:justify-end gap-2">
                      <Link
                        href={`/advance-campaigns/${c.id}`}
                        className="inline-flex items-center justify-center gap-1 w-full md:w-auto rounded-md border border-foreground bg-background px-3 py-1.5 md:py-1 text-xs font-medium hover:bg-foreground hover:text-background transition-colors"
                      >
                        <Layers size={13} />
                        View Sends
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
