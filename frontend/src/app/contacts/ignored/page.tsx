'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { ArrowLeft, Trash2, AlertCircle } from 'lucide-react';
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
        <div>
          <Button 
            variant="danger" 
            onClick={handleClearAll} 
            disabled={ignoredContacts.length === 0 || clearing}
            className="flex items-center gap-2"
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

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background-darker border-b border-background-light">
                <th className="p-4 text-sm font-semibold text-text-muted">Email</th>
                <th className="p-4 text-sm font-semibold text-text-muted">First Name</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Last Name</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Reason</th>
                <th className="p-4 text-sm font-semibold text-text-muted">Imported At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Loading ignored contacts...</p>
                  </td>
                </tr>
              ) : ignoredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    No ignored contacts found.
                  </td>
                </tr>
              ) : (
                ignoredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-background-light hover:bg-background-darker/50 transition-colors">
                    <td className="p-4 text-text-main font-medium">{contact.email || '-'}</td>
                    <td className="p-4 text-text-muted">{contact.first_name || '-'}</td>
                    <td className="p-4 text-text-muted">{contact.last_name || '-'}</td>
                    <td className="p-4 text-text-main">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        {contact.reason}
                      </span>
                    </td>
                    <td className="p-4 text-text-muted">
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
