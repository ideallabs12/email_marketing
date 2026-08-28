'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, Upload, Search, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Contact, ContactList } from '../../types';
import Link from 'next/link';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newSubscribed, setNewSubscribed] = useState(true);
  const [newSelectedLists, setNewSelectedLists] = useState<number[]>([]);
  const [addError, setAddError] = useState('');

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [targetListId, setTargetListId] = useState<string>('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [contactsRes, listsRes] = await Promise.all([
        apiClient.get('/api/v1/contacts/?limit=10000'),
        apiClient.get('/api/v1/contact-lists/?limit=10000'),
      ]);
      setContacts(contactsRes.results || []);
      setLists(listsRes.results || []);
    } catch (err) {
      console.error('Failed to load contacts data:', err);
    } finally {
      setLoading(false);
    }
  }

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
      });
      setShowAddModal(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewSubscribed(true);
      setNewSelectedLists([]);
      loadData();
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
        loadData();
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
      loadData();
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      alert('Failed to delete contact.');
    }
  };



  const filteredContacts = contacts.filter(c => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = c.email.toLowerCase().includes(term) ||
      (c.first_name || '').toLowerCase().includes(term) ||
      (c.last_name || '').toLowerCase().includes(term);
      
    const matchesList = selectedListFilter === 'all' || c.lists.includes(Number(selectedListFilter));
    
    return matchesSearch && matchesList;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage your lists and subscribers.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 sm:mt-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link href="/contacts/ignored" className="w-full sm:w-auto">
              <Button variant="outline" className="flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 hover:border-red-200 w-full">
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
      </div>

      <Card>
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
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={16} className="text-foreground/40 hover:text-foreground" />
              </button>
            )}
          </div>
          
          <div className="w-full max-w-xs">
            <select
              value={selectedListFilter}
              onChange={(e) => setSelectedListFilter(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background h-[38px]"
            >
              <option value="all">All Contacts</option>
              {lists.filter(list => !list.is_default && list.name !== 'All Contacts').map(list => (
                <option key={list.id} value={list.id.toString()}>{list.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="hidden md:grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-3 border-b border-border mb-3 px-2">
            <span className="col-span-3">Email</span>
            <span className="col-span-2">First Name</span>
            <span className="col-span-2">Last Name</span>
            <span className="col-span-2">List</span>
            <span className="col-span-2 text-right">Status</span>
            <span className="col-span-1 text-right"></span>
          </div>

          {loading ? (
            <div className="text-sm text-foreground/40 py-12 text-center">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              No contacts found. Use buttons above to add subscribers.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts.map(c => (
                <div key={c.id} className="flex flex-col md:grid md:grid-cols-12 gap-1 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/5 rounded-lg md:rounded-md border border-border md:border-transparent bg-foreground/[0.02] md:bg-transparent px-3 md:px-2 -mx-3 md:-mx-2 mb-3 md:mb-0 transition-colors shadow-sm md:shadow-none group relative">
                  
                  {/* Mobile: Combined Email & Name */}
                  <div className="flex flex-col md:col-span-3 min-w-0 pr-8 md:pr-0 w-full mb-2 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Contact</span>
                    <span className="font-bold md:font-medium text-base md:text-sm truncate text-foreground">{c.email}</span>
                    <span className="text-xs text-foreground/50 mt-0.5 truncate md:hidden">
                      {c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : 'No name provided'}
                    </span>
                  </div>

                  {/* Desktop Only: Separate First/Last Name */}
                  <div className="hidden md:flex flex-col md:col-span-2 truncate">
                    <span>{c.first_name || '—'}</span>
                  </div>
                  <div className="hidden md:flex flex-col md:col-span-2 truncate">
                    <span>{c.last_name || '—'}</span>
                  </div>

                  {/* Mobile: Status and List Row */}
                  <div className="flex justify-between items-center w-full md:contents mt-1 md:mt-0 pt-2 md:pt-0 border-t border-border/50 md:border-0">
                    <div className="flex flex-col md:col-span-2 md:text-right md:order-last">
                      <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Status</span>
                      <span>
                        <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                          c.is_subscribed ? 'border-foreground text-foreground bg-foreground/5 md:bg-transparent' : 'border-border text-foreground/30'
                        }`}>
                          {c.is_subscribed ? 'Active' : 'Unsub'}
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-col md:col-span-2 truncate text-right md:text-left" title={c.lists.map(listId => lists.find(l => l.id === listId)?.name).filter(Boolean).join(', ')}>
                      <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">List</span>
                      <span className="font-medium text-foreground/80">
                        {(() => {
                          const listNames = c.lists.map(listId => lists.find(l => l.id === listId)?.name).filter(Boolean).join(', ');
                          if (!listNames) return '—';
                          return listNames.length > 15 ? listNames.slice(0, 15) + '...' : listNames;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Delete Action (Top right on mobile) */}
                  <div className="absolute right-3 top-4 md:relative md:right-0 md:top-0 md:col-span-1 text-right">
                    <button 
                      onClick={() => handleDeleteContact(c.id)}
                      className="text-foreground/40 md:text-foreground/30 hover:text-red-500 transition-all p-2 md:p-1 md:opacity-50 hover:opacity-100"
                      title="Delete Contact"
                    >
                      <Trash2 size={16} className="md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>



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
                  multiple
                  value={newSelectedLists.map(String)}
                  onChange={e => {
                    const vals = Array.from(e.target.selectedOptions, option => Number(option.value));
                    setNewSelectedLists(vals);
                  }}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
                >
                  {lists.filter(l => !l.is_default).map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-foreground/40 mt-1">Hold Ctrl (Cmd) to select multiple lists.</p>
              </div>

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
