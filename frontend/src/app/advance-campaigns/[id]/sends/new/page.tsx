'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Card from '../../../../../components/Card';
import Button from '../../../../../components/Button';
import { ArrowLeft, Building2, Calendar, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../../services/apiClient';
import { AdvanceCampaign, EmailTemplate, ContactBatch, Conference } from '../../../../../types';

export default function NewSendPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [advCampaign, setAdvCampaign] = useState<AdvanceCampaign | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<{name: string, email: string}[]>([]);
  const [batches, setBatches] = useState<ContactBatch[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);

  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  // Company & Conference dynamic selection
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedConference, setSelectedConference] = useState('');

  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [campaignRes, templatesRes, sendersRes, conferencesRes] = await Promise.all([
          apiClient.get(`/api/v1/advance-campaigns/${id}/`),
          apiClient.get('/api/v1/templates/?limit=10000'),
          apiClient.get('/api/v1/senders/'),
          apiClient.get('/api/v1/conferences/?limit=10000'),
        ]);
        setAdvCampaign(campaignRes);
        setTemplates(templatesRes.results || []);
        setConferences(conferencesRes.results || conferencesRes || []);
        
        const sendersData = sendersRes || [];
        setSenders(sendersData);
        if (sendersData.length > 0) {
          setFromEmail(`${sendersData[0].name} <${sendersData[0].email}>`);
        }

        if (campaignRes.target_list) {
          try {
            const batchesRes = await apiClient.get(`/api/v1/contact-batches/?contact_list=${campaignRes.target_list}`);
            setBatches(batchesRes.results || []);
          } catch (e) {
            console.error('Failed to load batches', e);
          }
        }
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    async function checkDuplicate() {
      if (advCampaign?.target_list && selectedTemplate && fromEmail) {
        try {
          const res = await apiClient.post('/api/v1/campaigns/check-duplicate/', {
            target_list: advCampaign.target_list,
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
  }, [advCampaign, selectedTemplate, fromEmail, selectedBatches]);

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

  const currentTemplate = useMemo(() => {
    return templates.find(t => String(t.id) === String(selectedTemplate));
  }, [templates, selectedTemplate]);

  const isUniversalInvite = useMemo(() => {
    const n = currentTemplate?.name?.toUpperCase() || '';
    return n.includes('UNIVERSAL_CONFERENCE_INVITE') || n.includes('SECOND_SERIES');
  }, [currentTemplate]);

  const isInviteMode = useMemo(() => {
    return templateCategory === 'SECOND_SERIES' || 
           templateCategory === 'INVITE' || 
           isUniversalInvite || 
           !!selectedConference || 
           !!selectedCompany;
  }, [templateCategory, isUniversalInvite, selectedConference, selectedCompany]);

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

    // Auto-select corresponding company template if available
    if (company) {
      const compTpl = templates.find(t => 
        t.name.toUpperCase().includes('SECOND_SERIES') && 
        t.name.toUpperCase().includes(company.toUpperCase())
      );
      if (compTpl) {
        setSelectedTemplate(String(compTpl.id));
      }
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    setTemplateCategory(cat);
    setSelectedTemplate('');
    
    if (cat === 'SECOND_SERIES') {
      const uTpl = templates.find(t => 
        t.name.toUpperCase().includes('SECOND_SERIES') || 
        t.name.toUpperCase().includes('UNIVERSAL_CONFERENCE')
      );
      if (uTpl) {
        setSelectedTemplate(String(uTpl.id));
      }
    } else if (cat === 'INVITE') {
      const uTpl = templates.find(t => t.name.toUpperCase().includes('INVITE'));
      if (uTpl) {
        setSelectedTemplate(String(uTpl.id));
      }
    }
  };

  const filteredTemplates = templates.filter(t => {
    const tName = t.name.toLowerCase();
    if (templateCategory === 'SECOND_SERIES') {
      return tName.includes('second_series') || 
             tName.includes('secondseries') || 
             tName.includes('second series') || 
             tName.includes('universal_conference');
    }
    if (templateCategory === 'INVITE') {
      return tName.includes('invite') && !tName.includes('podcast');
    }
    if (templateCategory === 'FOLLOWUP') return tName.includes('followup');
    if (templateCategory === 'PODCAST') return tName.includes('podcast');
    return true;
  });

  const handleCreateSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!selectedTemplate || !advCampaign) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    if (isUniversalInvite && !selectedConference) {
      setCreateError('Please select a Company and Conference for the Universal Conference Invite template.');
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
        target_list: advCampaign.target_list,
        target_batches: selectedBatches,
        template: Number(selectedTemplate),
        advance_campaign: advCampaign.id,
        conference: selectedConference ? Number(selectedConference) : null,
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
              <option value="SECOND_SERIES">Second Series Templates</option>
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

          {/* ── Conference & Company Selector (Placed right below template!) ── */}
          {(isInviteMode || isUniversalInvite || conferences.length > 0) && (
            <div className={`p-4 rounded-xl border transition-all space-y-4 ${
              isUniversalInvite 
                ? 'bg-primary/5 border-primary/40 shadow-sm' 
                : 'bg-muted/40 border-border/80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className={`w-4 h-4 ${isUniversalInvite ? 'text-primary' : 'text-foreground/70'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground/90">
                    Conference &amp; Brand Selection
                  </span>
                </div>
                {isUniversalInvite && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Required for Universal Invite
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Company dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground/70">1. Select Company / Brand</label>
                  <select
                    value={selectedCompany}
                    onChange={e => handleCompanyChange(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Choose Company --</option>
                    {availableCompanies.map(comp => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>

                {/* Conference dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground/70">2. Select Conference</label>
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
                <div className="p-3 rounded-lg bg-background border border-primary/20 text-xs space-y-2 mt-2 shadow-sm">
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
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Target Batches (Optional)</label>
              <p className="text-[10px] text-foreground/40 mt-1 mb-2">Select specific batches to send to, or leave empty to target the entire list.</p>
            </div>
            
            {batches.length === 0 ? (
              <div className="text-sm italic text-foreground/40 p-4 border border-dashed border-border rounded-md text-center">
                No batches found for this list.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto p-1">
                {batches.map(b => (
                  <label 
                    key={b.id} 
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedBatches.includes(b.id) 
                        ? 'border-foreground bg-foreground/5 shadow-sm' 
                        : 'border-border hover:border-foreground/30 hover:bg-foreground/[0.02]'
                    }`}
                  >
                    <div className="flex h-5 items-center mt-0.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground/20 bg-background accent-foreground cursor-pointer"
                        checked={selectedBatches.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatches(prev => [...prev, b.id]);
                          } else {
                            setSelectedBatches(prev => prev.filter(id => id !== b.id));
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">{b.name}</span>
                      {b.contacts_count !== undefined && (
                        <span className="text-xs text-foreground/50">{b.contacts_count} contacts</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {isDuplicate && (
            <div className="p-3 bg-amber-950/20 text-amber-500 text-sm rounded-md font-medium border border-amber-900/30 flex items-start gap-2">
              <span className="text-lg leading-none">⚠️</span>
              <p>A blast using this exact Contact List, Template, and Sender has already been created before. You can still proceed, but please double check if this is intentional.</p>
            </div>
          )}

          <Button type="submit" className="w-full py-2.5 mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Blast'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
