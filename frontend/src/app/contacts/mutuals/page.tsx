'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft, Trash2, AlertCircle, Download, Search, Users, ShieldAlert, Check } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import Link from 'next/link';

interface MutualContact {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  who_is_importing: string;
  target_list_name: string;
  already_exists_in: string;
  reason: string;
  imported_at: string;
}

export default function MutualContactsPage() {
  const [mutuals, setMutuals] = useState<MutualContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/mutual-contacts/?limit=10000');
      setMutuals(res.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load mutual contacts.');
    } finally {
      setLoading(false);
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all mutual contact logs?')) return;

    setClearing(true);
    setError('');
    setSuccessMsg('');
    try {
      await apiClient.delete('/api/v1/mutual-contacts/clear-all/');
      setMutuals([]);
      setSuccessMsg('All mutual contact logs cleared.');
    } catch (err: any) {
      setError(err.message || 'Failed to clear mutual contacts.');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/v1/mutual-contacts/${id}/`);
      setMutuals(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadCSV = async () => {
    setError('');
    try {
      await apiClient.download('/api/v1/mutual-contacts/export-csv/', 'mutual_contacts.csv');
    } catch (err: any) {
      setError(err.message || 'Failed to download CSV.');
    }
  };

  const filteredMutuals = mutuals.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
    return (
      item.email.toLowerCase().includes(q) ||
      fullName.includes(q) ||
      (item.who_is_importing || '').toLowerCase().includes(q) ||
      (item.already_exists_in || '').toLowerCase().includes(q) ||
      (item.target_list_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/contacts" className="text-primary hover:underline flex items-center gap-1 text-sm font-medium">
              <ArrowLeft size={16} /> Back to Contacts
            </Link>
            <span className="text-foreground/30">|</span>
            <Link href="/directory" className="text-foreground/60 hover:text-foreground hover:underline text-sm">
              User Directory
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Mutual Contacts
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Speakers and contacts skipped during import because they already belong to another list. Under the unique list policy, one contact belongs to one list only.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={mutuals.length === 0}
            className="flex items-center gap-2 border-border hover:bg-foreground/5"
          >
            <Download size={16} />
            Download CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={mutuals.length === 0 || clearing}
            className="flex items-center gap-2 text-red-500 hover:bg-red-50 hover:border-red-200"
          >
            <Trash2 size={18} />
            {clearing ? 'Clearing...' : 'Clear List'}
          </Button>
        </div>
      </div>

      {/* Tab Switcher: Mutual Contacts vs Ignored Contacts */}
      <div className="flex border-b border-border space-x-6 text-sm font-medium">
        <Link
          href="/contacts/mutuals"
          className="pb-3 border-b-2 border-primary text-primary flex items-center gap-2"
        >
          <Users size={16} />
          <span>Mutual Contacts ({mutuals.length})</span>
        </Link>
        <Link
          href="/contacts/ignored"
          className="pb-3 border-b-2 border-transparent text-foreground/60 hover:text-foreground hover:border-border flex items-center gap-2"
        >
          <ShieldAlert size={16} />
          <span>Ignored / Invalid Contacts</span>
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="flex items-center space-x-3 bg-background border border-border rounded-md px-3 py-2 w-full max-w-md">
        <Search size={16} className="text-foreground/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by speaker, email, importer, or list..."
          className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-foreground/40 hover:text-foreground text-xs">
            Clear
          </button>
        )}
      </div>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden bg-transparent md:bg-background border-none md:border-solid">
        <div className="w-full px-2 md:px-0 mt-2 md:mt-0">
          <table className="w-full text-left md:border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-foreground/5 border-b border-border">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">#</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">Speaker Name</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">Email</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">Who is Importing</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">Target List</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">Already Exists In</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70">Imported At</th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-foreground/70 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group space-y-4 md:space-y-0">
              {loading ? (
                <tr className="block md:table-row">
                  <td colSpan={8} className="p-8 text-center text-foreground/50 block md:table-cell">
                    <div className="inline-block w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading mutual contacts...</p>
                  </td>
                </tr>
              ) : filteredMutuals.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={8} className="p-8 text-center text-foreground/50 block md:table-cell">
                    {searchQuery ? 'No mutual contacts match your search.' : 'No mutual contacts found. All lists are strictly unique!'}
                  </td>
                </tr>
              ) : (
                filteredMutuals.map((contact, idx) => {
                  const speakerName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '-';
                  return (
                    <tr
                      key={contact.id}
                      className="flex flex-col md:table-row bg-background border border-border md:border-0 rounded-lg md:rounded-none md:border-b hover:bg-foreground/5 transition-colors p-4 md:p-0"
                    >
                      <td className="hidden md:table-cell p-4 text-xs text-foreground/40 font-mono">
                        {idx + 1}
                      </td>
                      <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground font-semibold border-b border-border/50 md:border-none">
                        <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Speaker</span>
                        <span>{speakerName}</span>
                      </td>
                      <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground font-mono text-sm border-b border-border/50 md:border-none">
                        <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Email</span>
                        <span className="truncate max-w-[60%] md:max-w-none">{contact.email}</span>
                      </td>
                      <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground/80 text-sm border-b border-border/50 md:border-none">
                        <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Who Imported</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {contact.who_is_importing || 'Admin'}
                        </span>
                      </td>
                      <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground/70 text-sm border-b border-border/50 md:border-none">
                        <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Target List</span>
                        <span>{contact.target_list_name || '-'}</span>
                      </td>
                      <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground border-b border-border/50 md:border-none">
                        <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Already In</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          {contact.already_exists_in}
                        </span>
                      </td>
                      <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground/60 text-xs border-b border-border/50 md:border-none">
                        <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Imported At</span>
                        <span>{new Date(contact.imported_at).toLocaleString()}</span>
                      </td>
                      <td className="flex justify-end items-center md:table-cell p-2 md:p-4 text-right">
                        <button
                          onClick={() => handleDeleteItem(contact.id)}
                          disabled={deletingId === contact.id}
                          className="text-foreground/40 hover:text-red-500 p-1.5 rounded transition-colors"
                          title="Remove record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
