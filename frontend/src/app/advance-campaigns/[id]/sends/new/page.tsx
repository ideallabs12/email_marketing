'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Card from '../../../../../components/Card';
import Button from '../../../../../components/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../../services/apiClient';
import { AdvanceCampaign, EmailTemplate } from '../../../../../types';

export default function NewSendPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [advCampaign, setAdvCampaign] = useState<AdvanceCampaign | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<{name: string, email: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [campaignRes, templatesRes, sendersRes] = await Promise.all([
          apiClient.get(`/api/v1/advance-campaigns/${id}/`),
          apiClient.get('/api/v1/templates/?limit=10000'),
          apiClient.get('/api/v1/senders/'),
        ]);
        setAdvCampaign(campaignRes);
        setTemplates(templatesRes.results || []);
        
        const sendersData = sendersRes || [];
        setSenders(sendersData);
        if (sendersData.length > 0) {
          setFromEmail(`${sendersData[0].name} <${sendersData[0].email}>`);
        }
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTemplateCategory(e.target.value);
    setSelectedTemplate('');
  };

  const filteredTemplates = templates.filter(t => {
    if (templateCategory === 'INVITE') return t.name.toLowerCase().includes('invite');
    if (templateCategory === 'FOLLOWUP') return t.name.toLowerCase().includes('followup');
    return true;
  });

  const handleCreateSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!name.trim() || !selectedTemplate || !advCampaign) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/v1/campaigns/', {
        name,
        subject: subject.trim() || undefined,
        from_email: fromEmail,
        target_list: advCampaign.target_list,
        template: Number(selectedTemplate),
        advance_campaign: advCampaign.id,
        status: 'draft',
      });
      router.push(`/advance-campaigns/${advCampaign.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create blast.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-foreground/50">Loading form data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href={`/advance-campaigns/${id}`} className="text-foreground/50 hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Blast</h1>
          <p className="text-foreground/50 mt-1 text-sm">Send a new email inside {advCampaign?.name}.</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleCreateSend} className="space-y-6">
          {createError && (
            <div className="p-3 bg-red-950/20 text-red-500 text-sm rounded-md font-medium border border-red-900/30">
              {createError}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Blast Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="e.g. Follow-up 1"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              Email Subject Override <span className="text-[10px] lowercase text-foreground/30">(Optional)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="Defaults to template subject"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Sender Email</label>
            <select
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              required
            >
              {senders.map(s => (
                <option key={s.email} value={`${s.name} <${s.email}>`}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Template Category</label>
            <select
              value={templateCategory}
              onChange={handleCategoryChange}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">All Templates</option>
              <option value="INVITE">Invite Templates</option>
              <option value="FOLLOWUP">Follow-up Templates</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Email Template</label>
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              required
            >
              <option value="">-- Select Template --</option>
              {filteredTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full py-2.5 mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Blast'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
