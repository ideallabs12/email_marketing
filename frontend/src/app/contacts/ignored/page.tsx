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
          </div>
          <h1 className="text-2xl font-bold text-text-main">Ignored Contacts</h1>
          <p className="text-text-muted mt-1">
            Contacts that were skipped during CSV imports due to formatting errors or missing data.
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

      <Card className="p-0 overflow-hidden bg-transparent md:bg-background border-none md:border-solid">
        <div className="w-full px-2 md:px-0 mt-2 md:mt-0">
          <table className="w-full text-left md:border-collapse block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-foreground/5 border-b border-border">
                <th className="p-4 text-sm font-semibold text-foreground/70">Email</th>
                <th className="p-4 text-sm font-semibold text-foreground/70">First Name</th>
                <th className="p-4 text-sm font-semibold text-foreground/70">Last Name</th>
                <th className="p-4 text-sm font-semibold text-foreground/70">Reason</th>
                <th className="p-4 text-sm font-semibold text-foreground/70">Imported At</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group space-y-4 md:space-y-0">
              {loading ? (
                <tr className="block md:table-row">
                  <td colSpan={5} className="p-8 text-center text-foreground/50 block md:table-cell">
                    <div className="inline-block w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading ignored contacts...</p>
                  </td>
                </tr>
              ) : ignoredContacts.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={5} className="p-8 text-center text-foreground/50 block md:table-cell">
                    No ignored contacts found.
                  </td>
                </tr>
              ) : (
                ignoredContacts.map((contact) => (
                  <tr key={contact.id} className="flex flex-col md:table-row bg-background border border-border md:border-0 rounded-lg md:rounded-none md:border-b hover:bg-foreground/5 transition-colors p-4 md:p-0">
                    <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground font-medium border-b border-border/50 md:border-none">
                      <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Email</span>
                      <span className="truncate max-w-[60%] md:max-w-none">{contact.email || '-'}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground/70 border-b border-border/50 md:border-none">
                      <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">First Name</span>
                      <span>{contact.first_name || '-'}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground/70 border-b border-border/50 md:border-none">
                      <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Last Name</span>
                      <span>{contact.last_name || '-'}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground border-b border-border/50 md:border-none">
                      <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Reason</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 max-w-[60%] md:max-w-none truncate text-right md:text-left">
                        {contact.reason}
                      </span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell p-2 md:p-4 text-foreground/70">
                      <span className="md:hidden text-xs font-semibold uppercase text-foreground/50">Imported At</span>
                      <span>{new Date(contact.imported_at).toLocaleString()}</span>
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
