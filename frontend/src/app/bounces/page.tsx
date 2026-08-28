'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import { MailWarning, Search, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface BouncedEmail {
  id: number;
  contact_id: number;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  failed_at: string;
  error_message: string;
  campaign_name: string;
  campaign_id: number;
}

export default function BouncesPage() {
  const [bounces, setBounces] = useState<BouncedEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/bounces/?limit=10000');
      setBounces(res.results || []);
    } catch (err) {
      console.error('Failed to load bounced emails:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBounces = bounces.filter(b => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = b.email.toLowerCase().includes(term) ||
      (b.first_name || '').toLowerCase().includes(term) ||
      (b.last_name || '').toLowerCase().includes(term) ||
      (b.campaign_name || '').toLowerCase().includes(term);
      
    const matchesCategory = categoryFilter === 'All' || b.error_message === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const counts = {
    'All': bounces.length,
    'Hard Bounce': bounces.filter(b => b.error_message === 'Hard Bounce').length,
    'Soft Bounce': bounces.filter(b => b.error_message === 'Soft Bounce').length,
    'Blocked': bounces.filter(b => b.error_message === 'Blocked').length,
    'Invalid Email': bounces.filter(b => b.error_message === 'Invalid Email').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-500 flex items-center gap-2">
            <MailWarning size={28} />
            Bounced Mails
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">View all failed email deliveries across campaigns.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(counts).map(([category, count]) => (
          <button
            key={category}
            onClick={() => setCategoryFilter(category)}
            className={`p-4 rounded-xl border text-left flex flex-col transition-all ${
              categoryFilter === category 
                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-900' 
                : 'bg-background border-border hover:border-foreground/20 text-foreground'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2 block">{category}</span>
            <span className="text-2xl font-bold block">{count}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center space-x-3 bg-background border border-border rounded-md px-3 py-2 w-full max-w-md">
            <Search size={16} className="text-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or campaign..."
              className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={16} className="text-foreground/40 hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="hidden md:grid grid-cols-12 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-3 border-b border-border mb-3 px-2">
            <span className="col-span-3">Email</span>
            <span className="col-span-2">Name</span>
            <span className="col-span-2">Campaign</span>
            <span className="col-span-3">Error Details</span>
            <span className="col-span-2 text-right">Failed At</span>
          </div>

          {loading ? (
            <div className="text-sm text-foreground/40 py-12 text-center">Loading bounces...</div>
          ) : filteredBounces.length === 0 ? (
            <div className="text-sm text-foreground/40 py-12 text-center">
              {searchQuery ? 'No matching bounces found.' : 'Great news! You have no bounced emails.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredBounces.map(b => (
                <div key={b.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 py-4 md:py-3 text-sm items-start md:items-center hover:bg-red-500/5 rounded-md px-2 -mx-2 transition-colors">
                  <div className="md:col-span-3 flex flex-col min-w-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Email</span>
                    <span className="font-medium truncate">{b.email}</span>
                  </div>
                  <div className="md:col-span-2 flex flex-col md:block truncate">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Name</span>
                    <span>{b.first_name || b.last_name ? `${b.first_name} ${b.last_name}` : '—'}</span>
                  </div>
                  <div className="md:col-span-2 flex flex-col md:block truncate">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Campaign</span>
                    <span>{b.campaign_name || '—'}</span>
                  </div>
                  <div className="md:col-span-3 flex flex-col md:block">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Error Details</span>
                    <span className="text-red-500 text-xs truncate" title={b.error_message}>
                      {b.error_message || 'Failed'}
                    </span>
                  </div>
                  <div className="md:col-span-2 flex flex-col md:text-right mt-2 md:mt-0">
                    <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-1">Failed At</span>
                    <span className="text-foreground/50 text-xs">
                      {b.failed_at ? new Date(b.failed_at).toLocaleDateString() : '—'}
                    </span>
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
