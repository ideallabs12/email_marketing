'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, Search, X, Trash2, Users } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { ContactList, Contact } from '../../types';

export default function DirectoryPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [showListModal, setShowListModal] = useState(false);
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');
  const [listError, setListError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [listsRes, contactsRes] = await Promise.all([
        apiClient.get('/api/v1/contact-lists/?limit=10000'),
        apiClient.get('/api/v1/contacts/?limit=10000'),
      ]);
      setLists(listsRes.results || []);
      setContacts(contactsRes.results || []);
    } catch (err) {
      console.error('Failed to load directory data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    setListError('');
    if (!listName.trim()) {
      setListError('Please enter a list name.');
      return;
    }

    try {
      await apiClient.post('/api/v1/contact-lists/', {
        name: listName,
        description: listDesc,
      });
      setShowListModal(false);
      setListName('');
      setListDesc('');
      loadData();
    } catch (err: any) {
      setListError(err.message || 'Failed to create list.');
    }
  };

  const handleDeleteList = async (id: number) => {
    if (!confirm('Are you sure you want to delete this list? The contacts inside it will not be deleted.')) return;
    try {
      await apiClient.delete(`/api/v1/contact-lists/${id}/`);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete list:', err);
      alert('Failed to delete list.');
    }
  };

  const filteredLists = lists.filter(l => {
    const term = searchQuery.toLowerCase();
    return l.name.toLowerCase().includes(term) || (l.description || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users size={28} />
            User Directory
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage and organize your contact lists.</p>
        </div>
        <div className="flex w-full sm:w-auto">
          <Button onClick={() => setShowListModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2">
            <Plus size={16} />
            <span>Create List</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center space-x-3 bg-background border border-border rounded-md px-3 py-2 w-full max-w-md">
          <Search size={16} className="text-foreground/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contact lists..."
            className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} className="text-foreground/40 hover:text-foreground" />
            </button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="text-sm text-foreground/40 py-12 text-center">Loading user directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 relative group flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-lg pr-6 text-foreground">All Contacts</h3>
              <p className="text-xs text-foreground/50 mt-1 line-clamp-2">Master list containing all contacts across the platform</p>
            </div>
            <div className="mt-6 flex items-end justify-between border-t border-border pt-3">
              <div className="text-2xl font-bold text-foreground">
                {contacts.length} <span className="text-xs font-normal text-foreground/50 uppercase tracking-widest ml-1">Contacts</span>
              </div>
            </div>
          </Card>
          
          {filteredLists.filter(list => !list.is_default).map(list => (
            <Card key={list.id} className="p-4 relative group flex flex-col justify-between">
              <button
                onClick={() => handleDeleteList(list.id)}
                className="absolute top-2 right-2 text-foreground/30 hover:text-red-500 transition-all p-2 opacity-50 hover:opacity-100 rounded-md hover:bg-red-500/10"
                title="Delete List"
              >
                <Trash2 size={16} />
              </button>
              <div>
                <h3 className="font-semibold text-lg pr-8 text-foreground">{list.name}</h3>
                <p className="text-xs text-foreground/50 mt-1 line-clamp-2">{list.description || 'No description provided'}</p>
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-border pt-3">
                <div className="text-2xl font-bold text-foreground">
                  {contacts.filter(c => c.lists.includes(list.id)).length} <span className="text-xs font-normal text-foreground/50 uppercase tracking-widest ml-1">Contacts</span>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredLists.filter(list => !list.is_default).length === 0 && searchQuery && (
            <div className="col-span-full py-8 text-center text-foreground/50 text-sm">
              No lists match your search query.
            </div>
          )}
        </div>
      )}

      {showListModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-lg relative">
            <button className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setShowListModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Create Contact List</h2>
            <form onSubmit={handleCreateList} className="space-y-4">
              {listError && <div className="text-xs text-red-500">{listError}</div>}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">List Name</label>
                <input
                  type="text"
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Speaker Invites"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Description</label>
                <textarea
                  value={listDesc}
                  onChange={e => setListDesc(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="Short explanation of this list..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full py-2">Create List</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
