'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { 
  Users, Search, X, Trash2, ArrowLeft, Calendar, Layers, 
  Edit, ChevronLeft, ChevronRight, Loader2, Plus, AlertCircle, 
  Check, UserX, UserCheck, ShieldAlert 
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { Contact, ContactList, ContactBatch } from '../../../types';
import Link from 'next/link';

function getNextBatchName(existingBatches: ContactBatch[]): string {
  let maxNum = 0;
  for (const b of existingBatches) {
    const match = b.name.match(/batch_?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : (existingBatches.length + 1);
  return `batch_${String(nextNum).padStart(2, '0')}`;
}

export default function ContactListDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const [list, setList] = useState<ContactList | null>(null);
  const [batches, setBatches] = useState<ContactBatch[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Edit List Modal
  const [showEditListModal, setShowEditListModal] = useState(false);
  const [editListName, setEditListName] = useState('');
  const [editListDesc, setEditListDesc] = useState('');
  const [editListError, setEditListError] = useState('');

  // Create Batch Modal
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [createBatchError, setCreateBatchError] = useState('');
  const [createBatchLoading, setCreateBatchLoading] = useState(false);

  // Edit Batch Modal
  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchError, setEditBatchError] = useState('');

  // Unsubscribe & Resubscribe Modal
  const [unsubModalContact, setUnsubModalContact] = useState<Contact | null>(null);
  const [unsubReason, setUnsubReason] = useState('Speaker emailed direct request');
  const [customReason, setCustomReason] = useState('');
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubError, setUnsubError] = useState('');

  const [resubscribeContact, setResubscribeContact] = useState<Contact | null>(null);
  const [resubscribeLoading, setResubscribeLoading] = useState(false);

  // Feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!feedbackMsg) return;
    const t = setTimeout(() => setFeedbackMsg(null), 4000);
    return () => clearTimeout(t);
  }, [feedbackMsg]);

  useEffect(() => {
    if (!listId || isNaN(listId)) {
      router.push('/contacts');
      return;
    }
    loadListInfo();
  }, [listId, router]);

  async function loadListInfo() {
    setLoading(true);
    try {
      const [listRes, batchesRes] = await Promise.all([
        apiClient.get(`/api/v1/contact-lists/${listId}/`),
        apiClient.get(`/api/v1/contact-batches/?contact_list=${listId}&limit=500`),
      ]);

      setList(listRes);
      const listBatches = (batchesRes.results || []).filter((b: ContactBatch) => b.contact_list === listId);
      setBatches(listBatches);
    } catch (err) {
      console.error('Failed to load contact list details:', err);
    } finally {
      setLoading(false);
    }
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load contacts when debouncedSearch, selectedBatchFilter, page, or pageSize changes
  const loadContacts = useCallback(async () => {
    if (!listId || isNaN(listId)) return;
    setLoadingContacts(true);
    try {
      let url = `/api/v1/contacts/?lists=${listId}&page=${page}&limit=${pageSize}`;
      if (debouncedSearch.trim()) {
        url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      }
      if (selectedBatchFilter !== 'all') {
        url += `&batches=${encodeURIComponent(selectedBatchFilter)}`;
      }
      const res = await apiClient.get(url);
      setContacts(res.results || []);
      setTotalCount(res.count ?? (res.results?.length || 0));
    } catch (err) {
      console.error('Failed to load contacts for list:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [listId, debouncedSearch, selectedBatchFilter, page, pageSize]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleEditList = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditListError('');
    if (!editListName.trim()) {
      setEditListError('Please enter a list name.');
      return;
    }

    try {
      await apiClient.patch(`/api/v1/contact-lists/${listId}/`, {
        name: editListName,
        description: editListDesc,
      });
      setShowEditListModal(false);
      loadListInfo();
      setFeedbackMsg({ type: 'success', text: 'List updated successfully.' });
    } catch (err: any) {
      setEditListError(err.message || 'Failed to update list.');
    }
  };

  const openEditListModal = () => {
    if (!list) return;
    setEditListName(list.name);
    setEditListDesc(list.description || '');
    setEditListError('');
    setShowEditListModal(true);
  };

  // Open Create Batch Modal
  const openCreateBatchModal = () => {
    setNewBatchName(getNextBatchName(batches));
    setCreateBatchError('');
    setShowCreateBatchModal(true);
  };

  // Handle Create Batch Form Submit
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBatchError('');
    const trimmed = newBatchName.trim();
    if (!trimmed) {
      setCreateBatchError('Please enter a batch name.');
      return;
    }

    setCreateBatchLoading(true);
    try {
      const created = await apiClient.post('/api/v1/contact-batches/', {
        name: trimmed,
        contact_list: listId,
      });

      setShowCreateBatchModal(false);
      setNewBatchName('');
      await loadListInfo();

      if (created?.id) {
        setSelectedBatchFilter(String(created.id));
        setPage(1);
      }

      setFeedbackMsg({ type: 'success', text: `Batch "${trimmed}" created successfully.` });
    } catch (err: any) {
      console.error('Failed to create batch:', err);
      setCreateBatchError(err?.message || 'Failed to create batch.');
    } finally {
      setCreateBatchLoading(false);
    }
  };

  const handleEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditBatchError('');
    if (!editBatchName.trim()) {
      setEditBatchError('Please enter a batch name.');
      return;
    }

    try {
      await apiClient.patch(`/api/v1/contact-batches/${editingBatchId}/`, {
        name: editBatchName,
      });
      setShowEditBatchModal(false);
      setEditingBatchId(null);
      loadListInfo();
      setFeedbackMsg({ type: 'success', text: 'Batch renamed successfully.' });
    } catch (err: any) {
      setEditBatchError(err.message || 'Failed to update batch.');
    }
  };

  const openEditBatchModal = (batch: ContactBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBatchId(batch.id);
    setEditBatchName(batch.name);
    setEditBatchError('');
    setShowEditBatchModal(true);
  };

  const handleDeleteBatch = async (batch: ContactBatch, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete batch "${batch.name}"? Contacts in this batch will NOT be deleted from the database.`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/contact-batches/${batch.id}/`);
      if (selectedBatchFilter === String(batch.id)) {
        setSelectedBatchFilter('all');
        setPage(1);
      }
      loadListInfo();
      loadContacts();
      setFeedbackMsg({ type: 'success', text: `Batch "${batch.name}" deleted.` });
    } catch (err: any) {
      console.error('Failed to delete batch:', err);
      alert(err?.message || 'Failed to delete batch.');
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    try {
      await apiClient.delete(`/api/v1/contacts/${id}/`);
      loadContacts();
      loadListInfo();
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

  if (loading) {
    return <div className="text-sm text-foreground/40 py-12 text-center">Loading contact list details...</div>;
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">List not found</h2>
        <Button onClick={() => router.push('/contacts')}>Back to Contacts</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/contacts" className="text-foreground/50 hover:text-foreground transition-colors p-2 rounded-full hover:bg-foreground/5">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                {list.name}
              </h1>
              <button
                onClick={openEditListModal}
                className="text-foreground/40 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-500/10"
                title="Edit List"
              >
                <Edit size={18} />
              </button>
            </div>
            <p className="text-foreground/50 mt-1 text-sm">{list.description || 'No description provided'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openCreateBatchModal} className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus size={18} />
            <span>Create Batch</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
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

      {/* Batches Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers size={20} />
            Available Batches
          </h2>
          <button
            onClick={openCreateBatchModal}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            New Batch
          </button>
        </div>
        
        {batches.length === 0 ? (
          <Card className="p-8 text-center text-foreground/50 text-sm flex flex-col items-center justify-center gap-3 border-dashed">
            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/40">
              <Layers size={24} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">No batches created yet in this list</p>
              <p className="text-xs text-foreground/50 mt-1 max-w-sm">
                Batches help you segment contacts for scheduled outreach and multi-stage campaign sequences.
              </p>
            </div>
            <Button onClick={openCreateBatchModal} className="flex items-center gap-2 mt-2">
              <Plus size={16} />
              <span>Create First Batch</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* All Contacts card */}
            <Card 
              className={`p-4 cursor-pointer transition-all border-2 ${selectedBatchFilter === 'all' ? 'border-primary' : 'border-transparent hover:border-foreground/10'}`}
              onClick={() => {
                setSelectedBatchFilter('all');
                setPage(1);
              }}
            >
              <h3 className="font-semibold text-lg text-foreground">All Contacts</h3>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                <div className="text-2xl font-bold text-foreground">
                  {list.contacts_count ?? totalCount} <span className="text-xs font-normal text-foreground/50 uppercase tracking-widest ml-1">Total</span>
                </div>
              </div>
            </Card>

            {/* Batch Cards */}
            {batches.map(batch => {
              const isSelected = selectedBatchFilter === String(batch.id);
              
              return (
                <Card 
                  key={batch.id} 
                  className={`p-4 cursor-pointer transition-all border-2 relative group overflow-hidden ${isSelected ? 'border-primary' : 'border-transparent hover:border-foreground/10'}`}
                  onClick={() => {
                    setSelectedBatchFilter(String(batch.id));
                    setPage(1);
                  }}
                >
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => openEditBatchModal(batch, e)}
                      className="text-foreground/50 hover:text-blue-500 p-1.5 rounded-md hover:bg-blue-500/10 transition-colors"
                      title="Rename Batch"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteBatch(batch, e)}
                      className="text-foreground/50 hover:text-red-500 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Delete Batch"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-lg text-foreground pr-16 truncate" title={batch.name}>{batch.name}</h3>
                  {batch.tracking_id && (
                    <div className="mt-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70 border border-border">
                        #{batch.tracking_id}
                      </span>
                    </div>
                  )}
                  {batch.created_at && (
                    <div className="text-xs text-foreground/50 flex items-center gap-1 mt-1.5">
                      <Calendar size={12} />
                      {new Date(batch.created_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                    <div className="text-2xl font-bold text-foreground">
                      {batch.contacts_count ?? 0} <span className="text-xs font-normal text-foreground/50 uppercase tracking-widest ml-1">Contacts</span>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Quick "+ Create Batch" card */}
            <Card 
              className="p-4 cursor-pointer transition-all border-2 border-dashed border-border hover:border-primary/60 hover:bg-foreground/[0.02] flex flex-col items-center justify-center text-center gap-2 min-h-[120px] group"
              onClick={openCreateBatchModal}
            >
              <div className="w-9 h-9 rounded-full bg-foreground/5 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-foreground/50 transition-colors">
                <Plus size={18} />
              </div>
              <div>
                <span className="font-semibold text-sm text-foreground block">Create Batch</span>
                <span className="text-[11px] text-foreground/50">Add new batch</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Contacts List Card */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center space-x-3 bg-background border border-border rounded-md px-3 py-2 w-full max-w-md">
            <Search size={16} className="text-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts in this list..."
              className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
            />
            {loadingContacts ? (
              <Loader2 size={16} className="text-foreground/40 animate-spin shrink-0" />
            ) : searchQuery ? (
              <button onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setPage(1); }}>
                <X size={16} className="text-foreground/40 hover:text-foreground" />
              </button>
            ) : null}
          </div>
          
          <div className="w-full max-w-xs">
            <select
              value={selectedBatchFilter}
              onChange={(e) => {
                setSelectedBatchFilter(e.target.value);
                setPage(1);
              }}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background h-[38px]"
            >
              <option value="all">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id.toString()}>{batch.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="hidden md:grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-3 border-b border-border mb-3 px-2">
            <span className="col-span-4">Email</span>
            <span className="col-span-2">First Name</span>
            <span className="col-span-2">Last Name</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {loadingContacts && contacts.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              {debouncedSearch ? 'No contacts match your search in this list.' : 'No contacts found in this list or batch.'}
            </div>
          ) : (
            <div className={`divide-y divide-border ${loadingContacts ? 'opacity-60 transition-opacity' : ''}`}>
              {contacts.map(c => (
                <div key={c.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/[0.03] rounded-lg md:rounded-md border border-border md:border-transparent bg-foreground/[0.01] md:bg-transparent px-3 md:px-2 -mx-3 md:-mx-2 mb-3 md:mb-0 transition-colors shadow-sm md:shadow-none group relative">
                  
                  <div className="flex flex-col md:col-span-4 min-w-0 pr-2 w-full mb-1 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Email</span>
                    <span className="font-semibold md:font-medium text-base md:text-sm truncate text-foreground" title={c.email}>
                      {c.email}
                    </span>
                  </div>

                  <div className="hidden md:flex flex-col md:col-span-2 truncate pr-2 text-foreground/80">
                    <span>{c.first_name || '—'}</span>
                  </div>

                  <div className="hidden md:flex flex-col md:col-span-2 truncate pr-2 text-foreground/80">
                    <span>{c.last_name || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between md:justify-center w-full md:w-auto md:col-span-2">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40">Status</span>
                    <span>
                      {c.is_subscribed ? (
                        <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">
                          <UserX size={10} className="shrink-0" />
                          Unsub
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions (Unsubscribe + Delete) */}
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
                      title="Delete Contact"
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
                    disabled={page <= 1 || loadingContacts}
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
                    disabled={page >= Math.max(1, Math.ceil(totalCount / pageSize)) || loadingContacts}
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

      {/* Create Batch Modal */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-xl relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button 
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" 
              onClick={() => setShowCreateBatchModal(false)}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Create New Batch</h2>
                <p className="text-xs text-foreground/50">Add a sub-group batch to &ldquo;{list.name}&rdquo;</p>
              </div>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              {createBatchError && (
                <div className="p-3 bg-red-950/20 text-red-500 text-xs rounded-md font-medium border border-red-900/30 flex items-start space-x-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{createBatchError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. batch_02, VIP Speakers, Wave 1"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-foreground/40">
                  Batches are used in Advanced Campaigns to send phased sequences.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateBatchModal(false)}
                  disabled={createBatchLoading}
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={createBatchLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {createBatchLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Create Batch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit List Modal */}
      {showEditListModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-lg relative">
            <button className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setShowEditListModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Edit Contact List</h2>
            <form onSubmit={handleEditList} className="space-y-4">
              {editListError && <div className="text-xs text-red-500">{editListError}</div>}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">List Name</label>
                <input
                  type="text"
                  value={editListName}
                  onChange={e => setEditListName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Speaker Invites"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Description</label>
                <textarea
                  value={editListDesc}
                  onChange={e => setEditListDesc(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="Short explanation of this list..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full py-2">Save Changes</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditBatchModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-lg relative">
            <button className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setShowEditBatchModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Edit Batch Name</h2>
            <form onSubmit={handleEditBatch} className="space-y-4">
              {editBatchError && <div className="text-xs text-red-500">{editBatchError}</div>}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Batch Name</label>
                <input
                  type="text"
                  value={editBatchName}
                  onChange={e => setEditBatchName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Batch 1"
                  required
                />
              </div>
              <Button type="submit" className="w-full py-2">Save Changes</Button>
            </form>
          </Card>
        </div>
      )}

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
                This contact will be permanently suppressed. All current and future email campaigns will automatically skip this email.
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
    </div>
  );
}
