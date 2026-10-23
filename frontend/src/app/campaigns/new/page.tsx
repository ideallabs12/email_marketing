'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft, Building2, Calendar, MapPin, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../services/apiClient';
import { ContactList, EmailTemplate, ContactBatch, Conference } from '../../../types';

export default function NewCampaignPage() {
  const router = useRouter();
  
  const [lists, setLists] = useState<ContactList[]>([]);
  const [batches, setBatches] = useState<ContactBatch[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<{name: string, email: string}[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [targetList, setTargetList] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  // Company & Conference dynamic selection
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedConference, setSelectedConference] = useState('');

  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [listsRes, batchesRes, templatesRes, sendersRes, conferencesRes] = await Promise.all([
          apiClient.get('/api/v1/contact-lists/?limit=10000'),
          apiClient.get('/api/v1/contact-batches/?limit=10000'),
          apiClient.get('/api/v1/templates/?limit=10000'),
          apiClient.get('/api/v1/senders/'),
          apiClient.get('/api/v1/conferences/?limit=10000'),
        ]);
        setLists(listsRes.results || []);
        setBatches(batchesRes.results || []);
        setTemplates(templatesRes.results || []);
        setConferences(conferencesRes.results || conferencesRes || []);
        
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
  }, []);

  // Duplicate detection
  useEffect(() => {
    async function checkDuplicate() {
      if (targetList && selectedTemplate && fromEmail) {
        try {
          const res = await apiClient.post('/api/v1/campaigns/check-duplicate/', {
            target_list: Number(targetList),
            template: Number(selectedTemplate),
            from_email: fromEmail,
            target_batches: selectedBatches
          });
          setIsDuplicate(res.duplicate);
        } catch (e) {
          console.error('Failed to check duplicate', e);
        }
      } else {
        setIsDuplicate(false);
      }
    }
    checkDuplicate();
  }, [targetList, selectedTemplate, fromEmail, selectedBatches]);

  // Derived company list
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    conferences.forEach(c => {
      if (c.company_name) set.add(c.company_name);
    });
    return Array.from(set).sort();
  }, [conferences]);

  // Conferences filtered by company
  const filteredConferences = useMemo(() => {
    if (!selectedCompany) return conferences;
    return conferences.filter(c => c.company_name.toLowerCase() === selectedCompany.toLowerCase());
  }, [conferences, selectedCompany]);

  // Active conference details
  const activeConference = useMemo(() => {
    return conferences.find(c => String(c.id) === String(selectedConference));
  }, [conferences, selectedConference]);

  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
    setSelectedConference('');

    // Pre-select matching sender if available
    if (company && senders.length > 0) {
      const match = senders.find(s => 
        s.name.toUpperCase().includes(company.toUpperCase()) || 
        s.email.toUpperCase().includes(company.toUpperCase())
      );
      if (match) {
        setFromEmail(`${match.name} <${match.email}>`);
      }
    }

    // Auto-select UNIVERSAL_CONFERENCE_INVITE if not already selected
    if (!selectedTemplate) {
      const universalTpl = templates.find(t => t.name.toUpperCase() === 'UNIVERSAL_CONFERENCE_INVITE');
      if (universalTpl) {
        setSelectedTemplate(String(universalTpl.id));
        setTemplateCategory('INVITE');
      }
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTemplateCategory(e.target.value);
    setSelectedTemplate('');
  };

  const filteredTemplates = templates.filter(t => {
    if (templateCategory === 'INVITE') return t.name.toLowerCase().includes('invite') && !t.name.toLowerCase().includes('podcast');
    if (templateCategory === 'FOLLOWUP') return t.name.toLowerCase().includes('followup');
    if (templateCategory === 'PODCAST') return t.name.toLowerCase().includes('podcast');
    return true;
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!targetList || !selectedTemplate) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const catName = templateCategory 
        ? templateCategory.charAt(0) + templateCategory.slice(1).toLowerCase() 
        : 'Blast';
      
      const compName = selectedCompany || (fromEmail.split(' ')[0] || 'UnknownBrand');

      const dateStr = new Date().toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      const autoName = `${catName} - ${compName} - ${dateStr}`;

      await apiClient.post('/api/v1/campaigns/', {
        name: autoName,
        subject: subject.trim() || undefined,
        from_email: fromEmail,
        target_list: Number(targetList),
        target_batches: selectedBatches,
        template: Number(selectedTemplate),
        conference: selectedConference ? Number(selectedConference) : null,
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

          {/* ── Conference & Company Selector ── */}
          <div className="p-4 bg-muted/40 rounded-xl border border-border/80 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Conference Selection (Dynamic Invite)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Company dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground/60">Company / Brand</label>
                <select
                  value={selectedCompany}
                  onChange={e => handleCompanyChange(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">-- All Companies --</option>
                  {availableCompanies.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              {/* Conference dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground/60">Conference</label>
                <select
                  value={selectedConference}
                  onChange={e => setSelectedConference(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">
                    {selectedCompany ? `-- Select Conference for ${selectedCompany} --` : '-- Select Conference --'}
                  </option>
                  {filteredConferences.map(conf => (
                    <option key={conf.id} value={conf.id}>
                      {conf.conference_name} ({conf.venue})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conference Details Card Preview */}
            {activeConference && (
              <div className="p-3 rounded-lg bg-background border border-primary/20 text-xs space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{activeConference.conference_name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[10px]">
                    {activeConference.company_name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-foreground/70">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-foreground/50" />
                    {activeConference.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-foreground/50" />
                    {activeConference.venue}
                  </span>
                </div>
                {activeConference.theme && (
                  <p className="text-foreground/60 italic text-[11px]">
                    &ldquo;{activeConference.theme}&rdquo;
                  </p>
                )}
              </div>
            )}
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
              <option value="PODCAST">Podcast Templates</option>
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
                <option key={t.id} value={t.id}>
                  {t.name === 'UNIVERSAL_CONFERENCE_INVITE' ? '✨ UNIVERSAL_CONFERENCE_INVITE (Dynamic Brand Themes)' : t.name}
                </option>
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

          {targetList && batches.filter(b => b.contact_list === Number(targetList)).length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Target Batches (Optional)</label>
              <select
                multiple
                value={selectedBatches.map(String)}
                onChange={e => {
                  const vals = Array.from(e.target.selectedOptions, option => Number(option.value));
                  setSelectedBatches(vals);
                }}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
              >
                {batches.filter(b => b.contact_list === Number(targetList)).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.contacts_count !== undefined ? ` (${b.contacts_count} contacts)` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-foreground/40 mt-1">Leave empty to send to the entire list. Hold Ctrl (Cmd) to select multiple batches.</p>
            </div>
          )}

          {isDuplicate && (
            <div className="p-3 bg-amber-950/20 text-amber-500 text-sm rounded-md font-medium border border-amber-900/30 flex items-start gap-2">
              <span className="text-lg leading-none">⚠️</span>
              <p>A blast using this exact Contact List, Template, and Sender has already been created before. You can still proceed, but please double check if this is intentional.</p>
            </div>
          )}

          <Button type="submit" className="w-full py-2.5 mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
