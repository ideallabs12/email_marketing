'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../services/apiClient';
import { ContactList, EmailTemplate } from '../../../types';

export default function NewCampaignPage() {
  const router = useRouter();
  
  const [lists, setLists] = useState<ContactList[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [targetList, setTargetList] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [fromEmail, setFromEmail] = useState('Signature Talks <global@signaturetalks.org>');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [listsRes, templatesRes] = await Promise.all([
          apiClient.get('/api/v1/contact-lists/?limit=10000'),
          apiClient.get('/api/v1/templates/?limit=10000'),
        ]);
        setLists(listsRes.results || []);
        setTemplates(templatesRes.results || []);
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTemplateCategory(e.target.value);
    setSelectedTemplate('');
  };

  const filteredTemplates = templates.filter(t => {
    if (templateCategory === 'INVITE') return t.name.toLowerCase().includes('invite');
    if (templateCategory === 'FOLLOWUP') return t.name.toLowerCase().includes('followup');
    return true;
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!name.trim() || !targetList || !selectedTemplate) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/v1/campaigns/', {
        name,
        subject: subject.trim() || undefined,
        from_email: fromEmail,
        target_list: Number(targetList),
        template: Number(selectedTemplate),
        status: 'draft',
      });
      router.push('/campaigns');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create campaign.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-foreground/50">Loading form data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/campaigns" className="text-foreground/50 hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Launch New Campaign</h1>
          <p className="text-foreground/50 mt-1 text-sm">Create a new email campaign.</p>
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
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              placeholder="e.g. WTLS 2027 Speaker Outreach"
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
              <option value="Signature Talks <global@signaturetalks.org>">Signature Talks (global@signaturetalks.org)</option>
              <option value="WYNxTALKS <info@wynxtalks.com>">WYNx Talks (info@wynxtalks.com)</option>
              <option value="VOICETALKS <info@voicetalks.org>">Voice Talks (info@voicetalks.org)</option>
              <option value="ICON Conferences <contact@iconconferences.org>">ICON Conferences (contact@iconconferences.org)</option>
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
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
