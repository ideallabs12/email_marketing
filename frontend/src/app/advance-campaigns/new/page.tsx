'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../services/apiClient';
import { ContactList } from '../../../types';

export default function NewAdvanceCampaignPage() {
  const router = useRouter();
  
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [targetList, setTargetList] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const listsRes = await apiClient.get('/api/v1/contact-lists/?limit=10000');
        setLists(listsRes.results || []);
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!name.trim() || !targetList) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/api/v1/advance-campaigns/', {
        name,
        target_list: Number(targetList),
      });
      // Redirect to the detail page of the new container
      router.push(`/advance-campaigns/${res.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create advanced campaign.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-foreground/50">Loading form data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/advance-campaigns" className="text-foreground/50 hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Advanced Campaign</h1>
          <p className="text-foreground/50 mt-1 text-sm">Create an empty container for a multi-touch sequence.</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleCreateCampaign} className="space-y-6">
          {createError && (
            <div className="p-3 bg-red-950/20 text-red-500 text-sm rounded-md font-medium border border-red-900/30">
              {createError}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Container Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="e.g. November Invite Sequence"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Target List</label>
            <select
              value={targetList}
              onChange={e => setTargetList(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              required
            >
              <option value="">-- Select Target List --</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full py-2.5 mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Container'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
