'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { Users, Search, X, Trash2, ArrowLeft, Calendar, Layers } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { Contact, ContactList, ContactBatch } from '../../../types';
import Link from 'next/link';

export default function ContactListDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const listId = Number(params.id);

  const [list, setList] = useState<ContactList | null>(null);
  const [batches, setBatches] = useState<ContactBatch[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');

  useEffect(() => {
    if (!listId || isNaN(listId)) {
      router.push('/contacts');
      return;
    }
    loadData();
  }, [listId, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [listRes, batchesRes, contactsRes] = await Promise.all([
        apiClient.get(`/api/v1/contact-lists/${listId}/`),
        apiClient.get(`/api/v1/contact-batches/?contact_list=${listId}&limit=10000`),
        apiClient.get(`/api/v1/contacts/?lists=${listId}&limit=10000`),
      ]);

      setList(listRes);
      // Ensure we only keep batches for this specific list (just in case the API filter didn't work perfectly)
      const listBatches = (batchesRes.results || []).filter((b: ContactBatch) => b.contact_list === listId);
      setBatches(listBatches);
      
      const listContacts = (contactsRes.results || []).filter((c: Contact) => c.lists.includes(listId));
      setContacts(listContacts);
    } catch (err) {
      console.error('Failed to load contact list details:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
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
      
    let matchesBatch = true;
    if (selectedBatchFilter !== 'all') {
      const batchId = Number(selectedBatchFilter);
      matchesBatch = c.batches && c.batches.includes(batchId);
    }
    
    return matchesSearch && matchesBatch;
  });

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
      <div className="flex items-center gap-4">
        <Link href="/contacts" className="text-foreground/50 hover:text-foreground transition-colors p-2 rounded-full hover:bg-foreground/5">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {list.name}
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">{list.description || 'No description provided'}</p>
        </div>
      </div>

      {/* Batches Overview Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Layers size={20} />
          Available Batches
        </h2>
        
        {batches.length === 0 ? (
          <Card className="p-6 text-center text-foreground/50 text-sm">
            No batches found in this list. You can create batches when adding contacts or importing a CSV.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Card 
              className={`p-4 cursor-pointer transition-all border-2 ${selectedBatchFilter === 'all' ? 'border-primary' : 'border-transparent hover:border-foreground/10'}`}
              onClick={() => setSelectedBatchFilter('all')}
            >
              <h3 className="font-semibold text-lg text-foreground">All Contacts</h3>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                <div className="text-2xl font-bold text-foreground">
                  {contacts.length} <span className="text-xs font-normal text-foreground/50 uppercase tracking-widest ml-1">Total</span>
                </div>
              </div>
            </Card>

            {batches.map(batch => {
              const batchContacts = contacts.filter(c => c.batches && c.batches.includes(batch.id));
              const isSelected = selectedBatchFilter === String(batch.id);
              
              return (
                <Card 
                  key={batch.id} 
                  className={`p-4 cursor-pointer transition-all border-2 ${isSelected ? 'border-primary' : 'border-transparent hover:border-foreground/10'}`}
                  onClick={() => setSelectedBatchFilter(String(batch.id))}
                >
                  <h3 className="font-semibold text-lg text-foreground truncate" title={batch.name}>{batch.name}</h3>
                  {batch.created_at && (
                    <div className="text-xs text-foreground/50 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      {new Date(batch.created_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                    <div className="text-2xl font-bold text-foreground">
                      {batchContacts.length} <span className="text-xs font-normal text-foreground/50 uppercase tracking-widest ml-1">Contacts</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={16} className="text-foreground/40 hover:text-foreground" />
              </button>
            )}
          </div>
          
          <div className="w-full max-w-xs">
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
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
            <span className="col-span-3">First Name</span>
            <span className="col-span-3">Last Name</span>
            <span className="col-span-1 text-right">Status</span>
            <span className="col-span-1 text-right"></span>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              No contacts found in this list or batch.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts.map(c => (
                <div key={c.id} className="flex flex-col md:grid md:grid-cols-12 gap-1 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-foreground/5 rounded-lg md:rounded-md border border-border md:border-transparent bg-foreground/[0.02] md:bg-transparent px-3 md:px-2 -mx-3 md:-mx-2 mb-3 md:mb-0 transition-colors shadow-sm md:shadow-none group relative">
                  
                  <div className="flex flex-col md:col-span-4 min-w-0 pr-8 md:pr-0 w-full mb-2 md:mb-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Email</span>
                    <span className="font-bold md:font-medium text-base md:text-sm truncate text-foreground">{c.email}</span>
                  </div>

                  <div className="flex flex-col md:col-span-3 truncate w-full">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">First Name</span>
                    <span>{c.first_name || '—'}</span>
                  </div>

                  <div className="flex flex-col md:col-span-3 truncate w-full">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Last Name</span>
                    <span>{c.last_name || '—'}</span>
                  </div>

                  <div className="flex flex-col md:col-span-1 text-left md:text-right w-full mt-2 md:mt-0 pt-2 md:pt-0 border-t border-border/50 md:border-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Status</span>
                    <span>
                      <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-full ${
                        c.is_subscribed ? 'border-foreground text-foreground bg-foreground/5 md:bg-transparent' : 'border-border text-foreground/30'
                      }`}>
                        {c.is_subscribed ? 'Active' : 'Unsub'}
                      </span>
                    </span>
                  </div>

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
    </div>
  );
}
