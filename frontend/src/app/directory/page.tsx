'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { 
  Plus, Upload, Search, X, Check, AlertCircle, Trash2, Users, 
  ChevronLeft, ChevronRight, Loader2, UserX, UserCheck, ShieldAlert 
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Contact, ContactList, ContactBatch } from '../../types';
import Link from 'next/link';

export default function DirectoryPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Unsubscribe & Resubscribe Modal State
  const [unsubModalContact, setUnsubModalContact] = useState<Contact | null>(null);
  const [unsubReason, setUnsubReason] = useState('Speaker emailed direct request');
  const [customReason, setCustomReason] = useState('');
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubError, setUnsubError] = useState('');

  const [resubscribeContact, setResubscribeContact] = useState<Contact | null>(null);
  const [resubscribeLoading, setResubscribeLoading] = useState(false);

  // User feedback toast / banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Contact Form State
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newSubscribed, setNewSubscribed] = useState(true);
  const [newSelectedLists, setNewSelectedLists] = useState<number[]>([]);
  const [newSelectedBatches, setNewSelectedBatches] = useState<number[]>([]);
  const [availableBatches, setAvailableBatches] = useState<ContactBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [addError, setAddError] = useState('');

  // Import CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [targetListId, setTargetListId] = useState<string>('');
  const [whoIsImporting, setWhoIsImporting] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);

  // Auto-dismiss feedback message after 4s
  useEffect(() => {
    if (!feedbackMsg) return;
    const t = setTimeout(() => setFeedbackMsg(null), 4000);
    return () => clearTimeout(t);
  }, [feedbackMsg]);

  // Load lists once on mount
  useEffect(() => {
    loadLists();
    try {
      const savedImporter = localStorage.getItem('who_is_importing');
      if (savedImporter) setWhoIsImporting(savedImporter);
    } catch (e) {}
  }, []);

  async function loadLists() {
    try {
      const listsRes = await apiClient.get('/api/v1/contact-lists/?limit=500');
      setLists(listsRes.results || []);
    } catch (err) {
      console.error('Failed to load contact lists:', err);
    }
  }

  // Debounce search query by 300ms to keep input instant and smooth
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load contacts whenever debouncedSearch, selectedListFilter, page, or pageSize changes
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/v1/contacts/?page=${page}&limit=${pageSize}`;
      if (debouncedSearch.trim()) {
        url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      }
      if (selectedListFilter !== 'all') {
        url += `&lists=${encodeURIComponent(selectedListFilter)}`;
      }
      const res = await apiClient.get(url);
      setContacts(res.results || []);
      setTotalCount(res.count ?? (res.results?.length || 0));
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedListFilter, page, pageSize]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newEmail || !newEmail.includes('@')) {
      setAddError('Please enter a valid email address.');
      return;
    }

    try {
      await apiClient.post('/api/v1/contacts/', {
        email: newEmail,
        first_name: newFirstName,
        last_name: newLastName,
        is_subscribed: newSubscribed,
        lists: newSelectedLists,
        batches: newSelectedBatches,
      });
      setShowAddModal(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewSubscribed(true);
      setNewSelectedLists([]);
      setNewSelectedBatches([]);
      setAvailableBatches([]);
      loadContacts();
      loadLists();
      setFeedbackMsg({ type: 'success', text: `Added ${newEmail} successfully.` });
    } catch (err: any) {
      setAddError(err.message || 'Failed to add contact.');
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');
    if (!csvFile) {
      setImportError('Please select a CSV file.');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', csvFile);
    if (targetListId) {
      formData.append('list_id', targetListId);
    }
    if (whoIsImporting.trim()) {
      formData.append('who_is_importing', whoIsImporting.trim());
      try {
        localStorage.setItem('who_is_importing', whoIsImporting.trim());
      } catch (e) {}
    }

    try {
      const token = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'))?.[2];
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/v1/contacts/import-csv/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'CSV import failed.');
      }

      setImportSuccess(resData.message);
      setCsvFile(null);
      setTimeout(() => {
        setShowImportModal(false);
        setImportSuccess('');
        loadContacts();
        loadLists();
      }, 3000);
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during import.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await apiClient.delete(`/api/v1/contacts/${id}/`);
      loadContacts();
      loadLists();
      setFeedbackMsg({ type: 'success', text: 'Contact deleted.' });
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      alert('Failed to delete contact.');
    }
  };

  // Open Unsubscribe Modal
  const handleOpenUnsubModal = (contact: Contact) => {
    setUnsubModalContact(contact);
    setUnsubReason('Speaker emailed direct request');
    setCustomReason('');
    setUnsubError('');
  };

  // Confirm Unsubscribe Contact
  const handleConfirmUnsubscribe = async () => {
    if (!unsubModalContact) return;
    setUnsubLoading(true);
    setUnsubError('');

    const finalReason = unsubReason === 'Other / Custom reason' 
      ? (customReason.trim() || 'Speaker direct request')
      : unsubReason;

    try {
      await apiClient.post('/api/v1/unsubscribed-contacts/', {
        email: unsubModalContact.email.trim().toLowerCase(),
        first_name: unsubModalContact.first_name || '',
        last_name: unsubModalContact.last_name || '',
        reason: finalReason,
        source: 'manual',
      });

      // Update state locally so UI updates immediately
      setContacts(prev => prev.map(c => 
        c.id === unsubModalContact.id ? { ...c, is_subscribed: false } : c
      ));

      setFeedbackMsg({
        type: 'success',
        text: `Added ${unsubModalContact.email} to Unsubscribe List.`
      });
      setUnsubModalContact(null);
    } catch (err: any) {
      console.error('Failed to add to unsubscribe list:', err);
      setUnsubError(err?.message || 'Failed to add contact to unsubscribe list.');
    } finally {
      setUnsubLoading(false);
    }
  };

  // Confirm Re-subscribe Contact
  const handleConfirmResubscribe = async () => {
    if (!resubscribeContact) return;
    setResubscribeLoading(true);
    try {
      await apiClient.post('/api/v1/unsubscribed-contacts/resubscribe/', {
        email: resubscribeContact.email.trim().toLowerCase(),
      });

      // Update state locally
      setContacts(prev => prev.map(c => 
        c.id === resubscribeContact.id ? { ...c, is_subscribed: true } : c
      ));

      setFeedbackMsg({
        type: 'success',
        text: `Re-subscribed ${resubscribeContact.email}. They are now active.`
      });
      setResubscribeContact(null);
    } catch (err: any) {
      console.error('Failed to re-subscribe contact:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to re-subscribe contact.'
      });
    } finally {
      setResubscribeLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users size={28} />
            User Directory
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage your contacts, subscribers, and suppression status.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mt-4 sm:mt-0">
          <Link href="/contacts/unsubscribed" className="w-full sm:w-auto">
            <Button variant="outline" className="flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-900/50 w-full">
              <UserX size={18} />
              Unsubscribed List
            </Button>
          </Link>
          <Link href="/contacts/mutuals" className="w-full sm:w-auto">
            <Button variant="outline" className="flex items-center justify-center gap-2 text-amber-500 hover:bg-amber-500/10 hover:border-amber-300 dark:hover:border-amber-900/50 w-full">
              <Users size={18} />
              Mutual Contacts
            </Button>
          </Link>
          <Link href="/contacts/ignored" className="w-full sm:w-auto">
            <Button variant="outline" className="flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-900/50 w-full">
              <AlertCircle size={18} />
              Ignored Contacts
            </Button>
          </Link>
          <Button onClick={() => setShowImportModal(true)} variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Upload size={18} />
            Import
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus size={18} />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-lg flex items-center justify-between text-sm border shadow-sm transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? <Check size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="opacity-70 hover:opacity-100 p-1">
            <X size={16} />
          </button>
        </div>
      )}

      <Card>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center space-x-3 bg-background border border-border rounded-md px-3 py-2 w-full max-w-md">
            <Search size={16} className="text-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or email..."
              className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
            />
            {loading ? (
              <Loader2 size={16} className="text-foreground/40 animate-spin shrink-0" />
            ) : searchQuery ? (
              <button onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); }}>
                <X size={16} className="text-foreground/40 hover:text-foreground" />
              </button>
            ) : null}
          </div>
          
          <div className="w-full max-w-xs">
            <select
              value={selectedListFilter}
              onChange={(e) => {
                setSelectedListFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background h-[38px]"
            >
              <option value="all">All Contacts</option>
              {lists.filter(list => !list.is_default && list.name !== 'All Contacts').map(list => (
                <option key={list.id} value={list.id.toString()}>{list.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="border-t border-border pt-4">
          <div className="hidden md:grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-3 border-b border-border mb-3 px-2">
            <span className="col-span-3">Email</span>
            <span className="col-span-2">First Name</span>
            <span className="col-span-2">Last Name</span>
            <span className="col-span-2">List</span>
            <span className="col-span-1 text-center">Status</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {loading && contacts.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              {debouncedSearch ? 'No contacts match your search query.' : 'No contacts found. Use buttons above to add subscribers.'}
            </div>
          ) : (
            <div className={`divide-y divide-border ${loading ? 'opacity-60 transition-opacity' : ''}`}>
              {contacts.map(c => (
                <div key={c.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/[0.03] rounded-lg md:rounded-md border border-border md:border-transparent bg-foreground/[0.01] md:bg-transparent px-3 md:px-2 -mx-3 md:-mx-2 mb-3 md:mb-0 transition-colors shadow-sm md:shadow-none group relative">
                  
                  {/* Email Column */}
                  <div className="flex flex-col md:col-span-3 min-w-0 pr-2 w-full mb-1 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Contact</span>
                    <span className="font-semibold md:font-medium text-base md:text-sm truncate text-foreground" title={c.email}>
                      {c.email}
                    </span>
                    <span className="text-xs text-foreground/50 mt-0.5 truncate md:hidden">
                      {c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : 'No name provided'}
                    </span>
                  </div>

                  {/* Desktop Only: First Name */}
                  <div className="hidden md:flex flex-col md:col-span-2 truncate pr-2 text-foreground/80">
                    <span>{c.first_name || '—'}</span>
                  </div>

                  {/* Desktop Only: Last Name */}
                  <div className="hidden md:flex flex-col md:col-span-2 truncate pr-2 text-foreground/80">
                    <span>{c.last_name || '—'}</span>
                  </div>

                  {/* List Column */}
                  <div className="flex items-center justify-between md:justify-start w-full md:w-auto md:col-span-2 truncate pr-2">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40">List</span>
                    <span className="font-medium text-foreground/80 text-xs md:text-sm" title={c.lists.map(listId => lists.find(l => l.id === listId)?.name).filter(Boolean).join(', ')}>
                      {(() => {
                        const listNames = c.lists.map(listId => lists.find(l => l.id === listId)?.name).filter(Boolean).join(', ');
                        if (!listNames) return '—';
                        return listNames.length > 18 ? listNames.slice(0, 18) + '...' : listNames;
                      })()}
                    </span>
                  </div>

                  {/* Status Column */}
                  <div className="flex items-center justify-between md:justify-center w-full md:w-auto md:col-span-1">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40">Status</span>
                    <span>
                      {c.is_subscribed ? (
                        <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10" title="Unsubscribed / Suppressed">
                          <UserX size={10} className="shrink-0" />
                          Unsub
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions Column (Unsubscribe + Delete) */}
                  <div className="flex items-center justify-end gap-1.5 w-full md:w-auto md:col-span-2 pt-2 md:pt-0 border-t border-border/50 md:border-0 mt-2 md:mt-0">
                    {c.is_subscribed ? (
                      <button
                        onClick={() => handleOpenUnsubModal(c)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/50 transition-colors shadow-sm"
                        title="Add to Unsubscribe List"
                      >
                        <UserX size={13} className="shrink-0 text-rose-500" />
                        <span>Unsubscribe</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setResubscribeContact(c)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-colors shadow-sm"
                        title="Re-subscribe Contact"
                      >
                        <UserCheck size={13} className="shrink-0 text-emerald-500" />
                        <span>Re-subscribe</span>
                      </button>
                    )}

                    <button 
                      onClick={() => handleDeleteContact(c.id)}
                      className="text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors p-1.5 rounded"
                      title="Delete Contact from Database"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border text-sm text-foreground/60">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Showing <span className="font-semibold text-foreground">{totalCount === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalCount}</span> contacts
                </span>
                {debouncedSearch && (
                  <span className="text-xs bg-foreground/5 border border-border px-2 py-0.5 rounded text-foreground/80">
                    &ldquo;{debouncedSearch}&rdquo;
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-border rounded px-2 py-1 text-xs bg-background text-foreground"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="h-8 px-2 flex items-center gap-1 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Prev</span>
                  </Button>

                  <span className="text-xs font-medium px-2">
                    Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
                  </span>

                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(totalCount / pageSize)), p + 1))}
                    disabled={page >= Math.max(1, Math.ceil(totalCount / pageSize)) || loading}
                    className="h-8 px-2 flex items-center gap-1 disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Unsubscribe Contact Modal */}
      {unsubModalContact && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-xl relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button 
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" 
              onClick={() => {
                setUnsubModalContact(null);
                setUnsubError('');
              }}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <UserX size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Add to Unsubscribe List</h2>
                <p className="text-xs text-foreground/50">Add this speaker to the suppression list</p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-lg border border-border bg-foreground/[0.02]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-foreground/40 block mb-1">Target Contact</span>
              <p className="font-semibold text-sm text-foreground">{unsubModalContact.email}</p>
              {(unsubModalContact.first_name || unsubModalContact.last_name) && (
                <p className="text-xs text-foreground/60 mt-0.5">
                  {[unsubModalContact.first_name, unsubModalContact.last_name].filter(Boolean).join(' ')}
                </p>
              )}
            </div>

            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>
                This contact will be permanently suppressed. All current and future email campaigns will automatically skip this email, even if re-imported.
              </span>
            </div>

            {unsubError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-500 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{unsubError}</span>
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Reason for Unsubscribe</label>
                <select
                  value={unsubReason}
                  onChange={(e) => setUnsubReason(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="Speaker emailed direct request">Speaker emailed direct request</option>
                  <option value="Speaker requested removal via phone / WhatsApp">Speaker requested removal via phone / WhatsApp</option>
                  <option value="Unsubscribed via speaker assistant">Unsubscribed via speaker assistant</option>
                  <option value="Wrong contact / Not interested">Wrong contact / Not interested</option>
                  <option value="Other / Custom reason">Other / Custom reason...</option>
                </select>
              </div>

              {unsubReason === 'Other / Custom reason' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Custom Reason</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter specific reason..."
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => {
                  setUnsubModalContact(null);
                  setUnsubError('');
                }}
                disabled={unsubLoading}
              >
                Cancel
              </Button>
              <button
                onClick={handleConfirmUnsubscribe}
                disabled={unsubLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 shadow-sm"
              >
                {unsubLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Adding to list...</span>
                  </>
                ) : (
                  <>
                    <UserX size={16} />
                    <span>Confirm Unsubscribe</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Re-subscribe Confirmation Modal */}
      {resubscribeContact && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-xl relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button 
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" 
              onClick={() => setResubscribeContact(null)}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Re-subscribe Contact</h2>
                <p className="text-xs text-foreground/50">Remove from suppression list</p>
              </div>
            </div>

            <p className="text-sm text-foreground/80 mb-4">
              Are you sure you want to remove <span className="font-semibold text-foreground">{resubscribeContact.email}</span> from the suppression list and restore their active status for campaigns?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setResubscribeContact(null)}
                disabled={resubscribeLoading}
              >
                Cancel
              </Button>
              <button
                onClick={handleConfirmResubscribe}
                disabled={resubscribeLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-sm"
              >
                {resubscribeLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Re-subscribing...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>Confirm Re-subscribe</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-lg relative">
            <button className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setShowAddModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Add Contact Manually</h2>
            <form onSubmit={handleAddContact} className="space-y-4">
              {addError && <div className="text-xs text-red-500">{addError}</div>}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">First Name</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Last Name</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Add to List</label>
                <select
                  value={newSelectedLists[0]?.toString() ?? ''}
                  onChange={async e => {
                    const listId = e.target.value ? Number(e.target.value) : null;
                    setNewSelectedLists(listId ? [listId] : []);
                    setNewSelectedBatches([]);
                    setAvailableBatches([]);
                    if (listId) {
                      setLoadingBatches(true);
                      try {
                        const res = await apiClient.get(`/api/v1/contact-batches/?contact_list=${listId}&limit=500`);
                        setAvailableBatches(res.results || []);
                      } catch (err) {
                        console.error('Failed to load batches:', err);
                      } finally {
                        setLoadingBatches(false);
                      }
                    }
                  }}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">-- Select a list --</option>
                  {lists.filter(l => !l.is_default).map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>

              {newSelectedLists.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                    Assign to Batch
                    {loadingBatches && <span className="ml-2 text-foreground/30 normal-case font-normal">(loading…)</span>}
                  </label>
                  {availableBatches.length === 0 && !loadingBatches ? (
                    <p className="text-[11px] text-foreground/40 border border-border rounded-md px-3 py-2">
                      No batches in this list yet.
                    </p>
                  ) : (
                    <>
                      <select
                        multiple
                        value={newSelectedBatches.map(String)}
                        onChange={e => {
                          const vals = Array.from(e.target.selectedOptions, opt => Number(opt.value));
                          setNewSelectedBatches(vals);
                        }}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
                        disabled={loadingBatches}
                      >
                        {availableBatches.map(batch => (
                          <option key={batch.id} value={batch.id}>{batch.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-foreground/40 mt-1">Hold Ctrl (Cmd) to select multiple batches.</p>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="subscribed"
                  checked={newSubscribed}
                  onChange={e => setNewSubscribed(e.target.checked)}
                  className="rounded border-border text-foreground"
                />
                <label htmlFor="subscribed" className="text-sm font-medium">Subscribed to mailings</label>
              </div>

              <Button type="submit" className="w-full py-2 mt-4">Add Contact</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-lg relative">
            <button className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setShowImportModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-2">Import Contacts from CSV</h2>
            <p className="text-xs text-foreground/50 mb-4">Upload a CSV file. Expected columns: <code className="bg-foreground/5 px-1 py-0.5 rounded">email</code>, <code className="bg-foreground/5 px-1 py-0.5 rounded">first_name</code>, <code className="bg-foreground/5 px-1 py-0.5 rounded">last_name</code>, <code className="bg-foreground/5 px-1 py-0.5 rounded">is_subscribed</code>.</p>
            
            <form onSubmit={handleImportCsv} className="space-y-4">
              {importError && (
                <div className="p-3 bg-red-950/20 text-red-500 text-xs rounded-md font-medium border border-red-900/30 flex items-start space-x-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}
              {importSuccess && (
                <div className="p-3 bg-green-950/20 text-green-500 text-xs rounded-md font-medium border border-green-900/30 flex items-start space-x-2">
                  <Check size={16} className="shrink-0 mt-0.5" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Target List (Optional)</label>
                <select
                  value={targetListId}
                  onChange={e => setTargetListId(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">-- None (Don't add to any list) --</option>
                  {lists.filter(l => !l.is_default).map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Who is Importing (Optional)</label>
                <input
                  type="text"
                  value={whoIsImporting}
                  onChange={e => setWhoIsImporting(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Your name or team"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50 font-medium">Select File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full text-sm border border-border rounded-md p-2 bg-background"
                  required
                />
              </div>

              <Button type="submit" className="w-full py-2.5 mt-4" disabled={importing || !!importSuccess}>
                {importing ? 'Importing contacts...' : 'Import CSV File'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
