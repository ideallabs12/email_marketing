'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { 
  UserX, Search, X, Trash2, ArrowLeft, Download, Plus, 
  Check, AlertCircle, RefreshCw, Mail, MousePointerClick, 
  Inbox, UserCheck, ShieldAlert, Users, Layers
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { UnsubscribedContact, UnsubscribedSummary } from '../../../types';
import Link from 'next/link';

export default function UnsubscribedContactsPage() {
  const [contacts, setContacts] = useState<UnsubscribedContact[]>([]);
  const [summary, setSummary] = useState<UnsubscribedSummary>({
    total: 0,
    body_link: 0,
    header_button: 0,
    manual: 0,
    webhook: 0,
    complaint: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newReason, setNewReason] = useState('Speaker emailed direct request');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Delete / Re-subscribe State
  const [resubscribingId, setResubscribingId] = useState<number | null>(null);
  const [confirmContact, setConfirmContact] = useState<UnsubscribedContact | null>(null);

  // Messages
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedSource]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      let url = '/api/v1/unsubscribed-contacts/?limit=1000';
      if (selectedSource !== 'all') {
        url += `&source=${encodeURIComponent(selectedSource)}`;
      }

      const [listRes, summaryRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get('/api/v1/unsubscribed-contacts/summary/'),
      ]);

      setContacts(listRes.results || listRes || []);
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err: any) {
      console.error('Failed to load unsubscribed contacts:', err);
      setError(err?.message || 'Failed to load unsubscribed contacts.');
    } finally {
      setLoading(false);
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAddError('Please enter a valid email address.');
      return;
    }

    setAddLoading(true);
    try {
      await apiClient.post('/api/v1/unsubscribed-contacts/', {
        email: cleanEmail,
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        reason: newReason.trim() || 'Speaker emailed direct request',
        source: 'manual',
      });

      setShowAddModal(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewReason('Speaker emailed direct request');
      setSuccessMsg(`Successfully added ${cleanEmail} to the suppression list.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err: any) {
      console.error('Failed to add unsubscribed contact:', err);
      setAddError(err?.response?.data?.email?.[0] || err?.message || 'Failed to add email to suppression list.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleResubscribe = async (contact: UnsubscribedContact) => {
    setResubscribingId(contact.id);
    try {
      await apiClient.delete(`/api/v1/unsubscribed-contacts/${contact.id}/`);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      setSummary(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        [contact.source]: Math.max(0, ((prev as any)[contact.source] || 1) - 1),
      }));
      setConfirmContact(null);
      setSuccessMsg(`Successfully re-subscribed ${contact.email}. They can now receive invitations again.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to re-subscribe contact:', err);
      setError(err?.message || 'Failed to re-subscribe contact.');
    } finally {
      setResubscribingId(null);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase().trim();
    return contacts.filter(c => 
      c.email.toLowerCase().includes(query) ||
      (c.first_name && c.first_name.toLowerCase().includes(query)) ||
      (c.last_name && c.last_name.toLowerCase().includes(query)) ||
      (c.campaign_name && c.campaign_name.toLowerCase().includes(query)) ||
      (c.reason && c.reason.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'body_link':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <MousePointerClick size={12} />
            Email Body Link
          </span>
        );
      case 'header_button':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <Inbox size={12} />
            Inbox Button (Gmail/Yahoo)
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Mail size={12} />
            Speaker Direct Request
          </span>
        );
      case 'webhook':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <RefreshCw size={12} />
            Brevo Webhook
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle size={12} />
            Spam Complaint
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-foreground/10 text-foreground/70">
            {source}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/contacts" className="text-foreground/50 hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <UserX className="text-rose-500" size={28} />
              Unsubscribed List (Suppression)
            </h1>
          </div>
          <p className="text-sm text-foreground/60 ml-7">
            Global suppression database. These contacts will <strong>never</strong> be emailed and cannot be re-imported as active.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/v1/unsubscribed-contacts/export-csv/"
            download="unsubscribed_contacts.csv"
            className="w-full sm:w-auto"
          >
            <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
              <Download size={16} />
              <span>Export CSV</span>
            </Button>
          </a>
          <Button 
            onClick={() => setShowAddModal(true)} 
            className="w-full sm:w-auto flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white border-0"
          >
            <Plus size={16} />
            <span>Add Unsubscribed Email</span>
          </Button>
        </div>
      </div>

      {/* Unified Tab Switcher across Contacts */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <Link
          href="/contacts/mutuals"
          className="pb-3 border-b-2 border-transparent text-foreground/60 hover:text-foreground hover:border-border flex items-center gap-2"
        >
          <Users size={16} />
          <span>Mutual Contacts</span>
        </Link>
        <Link
          href="/contacts/ignored"
          className="pb-3 border-b-2 border-transparent text-foreground/60 hover:text-foreground hover:border-border flex items-center gap-2"
        >
          <ShieldAlert size={16} />
          <span>Ignored / Invalid Contacts</span>
        </Link>
        <Link
          href="/contacts/unsubscribed"
          className="pb-3 border-b-2 border-rose-500 text-rose-500 flex items-center gap-2 font-semibold"
        >
          <UserX size={16} />
          <span>Unsubscribed List ({summary.total})</span>
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 border border-border/80 bg-card/60">
          <div className="flex items-center justify-between text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
            <span>Total Suppressed</span>
            <UserX size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{summary.total}</div>
          <div className="text-[11px] text-foreground/40 mt-1">100% skipped in sends</div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card/60">
          <div className="flex items-center justify-between text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
            <span>Email Body Link</span>
            <MousePointerClick size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-500">{summary.body_link}</div>
          <div className="text-[11px] text-foreground/40 mt-1">Clicked email footer</div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card/60">
          <div className="flex items-center justify-between text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
            <span>Inbox Button</span>
            <Inbox size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-500">{summary.header_button}</div>
          <div className="text-[11px] text-foreground/40 mt-1">Gmail / Apple native</div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card/60">
          <div className="flex items-center justify-between text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
            <span>Direct Requests</span>
            <Mail size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500">{summary.manual}</div>
          <div className="text-[11px] text-foreground/40 mt-1">Emailed admin to remove</div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card/60">
          <div className="flex items-center justify-between text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
            <span>Brevo Webhook</span>
            <RefreshCw size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500">{summary.webhook + summary.complaint}</div>
          <div className="text-[11px] text-foreground/40 mt-1">Provider auto-sync</div>
        </Card>
      </div>

      {/* Controls: Search and Source Channel Tabs */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center space-x-3 bg-background border border-border rounded-lg px-3.5 py-2 w-full max-w-md focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500 transition-all">
            <Search size={16} className="text-foreground/40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, name, campaign, reason..."
              className="w-full text-sm bg-transparent border-0 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-foreground/40 hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Sources' },
              { id: 'body_link', label: 'Body Link' },
              { id: 'header_button', label: 'Inbox Button' },
              { id: 'manual', label: 'Speaker Request' },
              { id: 'webhook', label: 'Brevo Webhook' },
              { id: 'complaint', label: 'Complaint' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedSource(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedSource === tab.id
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30 font-semibold'
                    : 'bg-background hover:bg-foreground/5 text-foreground/60 border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contacts Table */}
        <div className="mt-6 border-t border-border pt-4">
          <div className="hidden lg:grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-foreground/40 pb-3 border-b border-border px-3">
            <span className="col-span-4">Email Address</span>
            <span className="col-span-2">Speaker Name</span>
            <span className="col-span-2">Unsubscribe Channel</span>
            <span className="col-span-2">Campaign / Reason</span>
            <span className="col-span-1">Date</span>
            <span className="col-span-1 text-right">Action</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-foreground/40 flex items-center justify-center gap-2.5">
              <RefreshCw size={18} className="animate-spin text-rose-500" />
              Loading suppression list...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-16 text-center text-sm text-foreground/40">
              {searchQuery
                ? 'No unsubscribed contacts match your search query.'
                : 'No contacts found on the suppression list.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts.map(c => (
                <div 
                  key={c.id} 
                  className="flex flex-col lg:grid lg:grid-cols-12 gap-2 lg:gap-0 py-3.5 text-sm items-start lg:items-center hover:bg-foreground/[0.02] px-3 rounded-lg transition-colors group"
                >
                  {/* Email */}
                  <div className="lg:col-span-4 min-w-0 pr-2">
                    <span className="lg:hidden text-[10px] uppercase font-bold text-foreground/40 block mb-0.5">Email</span>
                    <span className="font-semibold text-foreground text-sm font-mono truncate block" title={c.email}>
                      {c.email}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="lg:col-span-2 min-w-0 pr-2">
                    <span className="lg:hidden text-[10px] uppercase font-bold text-foreground/40 block mb-0.5">Speaker</span>
                    <span className="text-foreground/80 truncate block">
                      {c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : '—'}
                    </span>
                  </div>

                  {/* Source */}
                  <div className="lg:col-span-2">
                    <span className="lg:hidden text-[10px] uppercase font-bold text-foreground/40 block mb-0.5">Source</span>
                    {getSourceBadge(c.source)}
                  </div>

                  {/* Campaign / Reason */}
                  <div className="lg:col-span-2 min-w-0 pr-2">
                    <span className="lg:hidden text-[10px] uppercase font-bold text-foreground/40 block mb-0.5">Campaign / Reason</span>
                    {c.campaign_name && (
                      <div className="text-xs font-medium text-foreground truncate" title={c.campaign_name}>
                        {c.campaign_name}
                      </div>
                    )}
                    <div className="text-xs text-foreground/50 truncate" title={c.reason}>
                      {c.reason || 'Requested removal'}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="lg:col-span-1 text-xs text-foreground/50">
                    <span className="lg:hidden text-[10px] uppercase font-bold text-foreground/40 block mb-0.5">Unsubscribed At</span>
                    {c.unsubscribed_at ? new Date(c.unsubscribed_at).toLocaleDateString() : '—'}
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-1 flex justify-start lg:justify-end w-full lg:w-auto mt-2 lg:mt-0">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmContact(c)}
                      className="text-xs text-foreground/60 hover:text-emerald-500 hover:border-emerald-500/30 flex items-center gap-1.5 h-8 px-2.5"
                      title="Re-subscribe speaker"
                    >
                      <UserCheck size={14} />
                      <span>Re-subscribe</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Add Unsubscribed Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserX size={20} className="text-rose-500" />
                Add to Unsubscribe / Suppression List
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-foreground/40 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="speaker@university.edu"
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                <p className="text-[11px] text-foreground/40 mt-1">
                  This email will be permanently blocked from all future campaigns across all lists.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Dr. John"
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Speaker emailed requesting removal"
                  className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white border-0 flex items-center gap-2"
                >
                  {addLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UserX size={14} />
                      Add to Suppression List
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Re-subscribe Modal */}
      {confirmContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-500 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <h3 className="text-lg font-bold text-foreground">Re-subscribe Contact</h3>
            </div>
            
            <p className="text-sm text-foreground/70 leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-foreground">{confirmContact.email}</strong> from the suppression list?
            </p>
            <p className="text-xs text-foreground/50 mb-6 bg-foreground/[0.03] p-3 rounded-lg border border-border">
              This will re-activate their subscriber status and allow campaigns targeting their lists to send emails to them again.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setConfirmContact(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={resubscribingId !== null}
                onClick={() => handleResubscribe(confirmContact)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 flex items-center gap-2"
              >
                {resubscribingId === confirmContact.id ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Re-subscribing...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirm Re-subscribe
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
