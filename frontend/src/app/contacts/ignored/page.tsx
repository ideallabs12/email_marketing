'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft, Trash2, AlertCircle, Download } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import Link from 'next/link';

interface IgnoredContact {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  reason: string;
  imported_at: string;
}

export default function IgnoredContactsPage() {
  const [ignoredContacts, setIgnoredContacts] = useState<IgnoredContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/ignored-contacts/?limit=10000');
      setIgnoredContacts(res.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ignored contacts.');
    } finally {
      setLoading(false);
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all ignored contacts?')) return;
    
    setClearing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.delete('/api/v1/ignored-contacts/clear-all/');
      setIgnoredContacts([]);
    } catch (err: any) {
      setError(err.message || 'Failed to clear ignored contacts.');
    } finally {
      setClearing(false);
    }
  };

  const handleDownloadCSV = async () => {
    setError('');
    try {
      await apiClient.download('/api/v1/ignored-contacts/export-csv/', 'ignored_contacts.csv');
    } catch (err: any) {
      setError(err.message || 'Failed to download CSV.');
    }
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-text-main">Ignored Contacts</h1>
          <p className="text-text-muted mt-1">
            Contacts that were skipped during CSV imports due to formatting errors, missing data, or cross-list rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadCSV} 
            disabled={ignoredContacts.length === 0}
            className="flex items-center gap-2 border-border hover:bg-foreground/5"
          >
            <Download size={16} />
            Download CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearAll} 
            disabled={ignoredContacts.length === 0 || clearing}
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
          className="pb-3 border-b-2 border-transparent text-foreground/60 hover:text-foreground hover:border-border flex items-center gap-2"
        >
          <span>Mutual Contacts</span>
        </Link>
        <Link
          href="/contacts/ignored"
          className="pb-3 border-b-2 border-primary text-primary flex items-center gap-2"
        >
          <span>Ignored / Invalid Contacts ({ignoredContacts.length})</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      <Card className="p-0 bg-background border border-border shadow-sm rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-foreground/5 border-b border-border">
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 whitespace-nowrap">Email</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 whitespace-nowrap">First Name</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 whitespace-nowrap">Last Name</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 whitespace-nowrap">Reason</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground/70 whitespace-nowrap">Imported At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground/50">
                    <div className="inline-block w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading ignored contacts...</p>
                  </td>
                </tr>
              ) : ignoredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground/50">
                    No ignored contacts found.
                  </td>
                </tr>
              ) : (
                ignoredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                      {contact.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground/70 whitespace-nowrap">
                      {contact.first_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground/70 whitespace-nowrap">
                      {contact.last_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                        {contact.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 text-xs whitespace-nowrap">
                      {new Date(contact.imported_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
