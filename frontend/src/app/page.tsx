'use client';

import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { Users, Mail, BarChart2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../services/apiClient';
import { Campaign, ContactList } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    contacts: '—',
    campaigns: '—',
    templates: '—',
    openRate: '—',
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [listsMap, setListsMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [contactsRes, campaignsRes, templatesRes, listsRes] = await Promise.all([
          apiClient.get('/api/v1/contacts/?limit=10'), // The dashboard only uses .count for contacts
          apiClient.get('/api/v1/campaigns/?limit=10'), // The dashboard only shows recent 5 campaigns
          apiClient.get('/api/v1/templates/?limit=100'),
          apiClient.get('/api/v1/contact-lists/?limit=10000'),
        ]);

        const listsData: ContactList[] = listsRes.results || [];
        const mapping: Record<number, string> = {};
        listsData.forEach(list => {
          mapping[list.id] = list.name;
        });
        setListsMap(mapping);

        const campaigns: Campaign[] = campaignsRes.results || [];
        setRecentCampaigns(campaigns.slice(0, 5));

        const totalContacts = contactsRes.count ?? 0;
        const totalCampaigns = campaignsRes.count ?? 0;
        const totalTemplates = templatesRes.count ?? 0;

        let avgOpenRate = '0%';
        try {
          const perfRes = await apiClient.get('/api/v1/tracking/');
          const perfs = perfRes.results || [];
          let totalSent = 0;
          let totalOpens = 0;
          perfs.forEach((p: any) => {
            totalSent += p.total_sent || 0;
            totalOpens += p.total_opens || 0;
          });
          if (totalSent > 0) {
            avgOpenRate = `${Math.round((totalOpens / totalSent) * 100)}%`;
          }
        } catch (e) {
          console.error("Failed to load tracking performance", e);
        }

        setStats({
          contacts: totalContacts.toLocaleString(),
          campaigns: totalCampaigns.toLocaleString(),
          templates: totalTemplates.toLocaleString(),
          openRate: avgOpenRate,
        });
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const statsItems = [
    { label: 'Total Contacts', value: stats.contacts, icon: Users, href: '/contacts' },
    { label: 'Total Campaigns', value: stats.campaigns, icon: Mail, href: '/campaigns' },
    { label: 'Templates', value: stats.templates, icon: BarChart2, href: '/templates' },
    { label: 'Avg. Open Rate', value: stats.openRate, icon: TrendingUp, href: null },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-foreground/50 mt-1 text-sm">Overview of your email marketing activity.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statsItems.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-widest text-foreground/50">{stat.label}</span>
              <stat.icon size={16} className="text-foreground/30" />
            </div>
            <div className="text-4xl font-bold">{loading ? '...' : stat.value}</div>
            {stat.href && (
              <Link href={stat.href} className="text-xs text-foreground/40 mt-3 inline-block hover:text-foreground transition-colors">
                View all →
              </Link>
            )}
          </Card>
        ))}
      </div>

      {/* Recent Campaigns */}
      <Card title="Recent Campaigns">
        <div className="border-t border-border pt-4">
          <div className="hidden md:grid grid-cols-4 text-xs font-medium uppercase tracking-widest text-foreground/40 pb-3 border-b border-border">
            <span>Name</span>
            <span>Status</span>
            <span>Target List</span>
            <span>Sent At</span>
          </div>
          {loading ? (
            <div className="text-sm text-foreground/40 py-6 text-center">Loading recent campaigns...</div>
          ) : recentCampaigns.length === 0 ? (
            <div className="text-sm text-foreground/40 py-6 text-center">
              No campaigns yet. <Link href="/campaigns" className="underline hover:text-foreground transition-colors">Create one →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCampaigns.map((campaign) => {
                const dateObj = campaign.sent_at ? new Date(campaign.sent_at) : null;
                const dateStr = dateObj ? `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear().toString().slice(-2)}` : '—';
                
                return (
                  <div key={campaign.id} className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-0 py-3 md:py-3 text-sm md:items-center border-b border-border last:border-0 md:border-0 hover:bg-foreground/5 md:hover:bg-transparent rounded-md px-2 md:px-0 -mx-2 md:mx-0 transition-colors">
                    {/* Mobile: Name & Status Group */}
                    <div className="flex justify-between items-start md:contents">
                      <div className="flex flex-col md:block md:col-span-1">
                        <span className="font-medium text-foreground">{campaign.name}</span>
                      </div>
                      <div className="flex flex-col md:block md:col-span-1 md:mt-0">
                        <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block border bg-background/50 shadow-sm" style={{
                          borderColor: campaign.status === 'sent' ? 'var(--foreground)' : 'var(--border)',
                          color: campaign.status === 'sent' ? 'var(--foreground)' : 'currentColor',
                          opacity: campaign.status === 'sent' ? 1 : 0.7
                        }}>{campaign.status}</span>
                      </div>
                    </div>
                    
                    {/* Mobile: Target List & Date Group */}
                    <div className="flex justify-between items-center md:contents mt-1 md:mt-0">
                      <div className="flex flex-col md:block md:col-span-1 text-foreground/70">
                        <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-0.5">List</span>
                        <span>{listsMap[campaign.target_list] || `List #${campaign.target_list}`}</span>
                      </div>
                      <div className="flex flex-col md:block md:col-span-1 text-foreground/70 text-right md:text-left">
                        <span className="md:hidden text-[10px] uppercase font-bold text-foreground/40 mb-0.5">Sent At</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/contacts" className="border border-border rounded-lg p-5 hover:bg-foreground hover:text-background transition-colors group">
          <Users size={20} className="mb-3 text-foreground/40 group-hover:text-background transition-colors" />
          <h3 className="font-semibold">Manage Contacts</h3>
          <p className="text-xs text-foreground/50 group-hover:text-background/60 mt-1 transition-colors">Add or organize your subscriber lists.</p>
        </Link>
        <Link href="/campaigns" className="border border-border rounded-lg p-5 hover:bg-foreground hover:text-background transition-colors group">
          <Mail size={20} className="mb-3 text-foreground/40 group-hover:text-background transition-colors" />
          <h3 className="font-semibold">New Campaign</h3>
          <p className="text-xs text-foreground/50 group-hover:text-background/60 mt-1 transition-colors">Launch a new email campaign to your audience.</p>
        </Link>
        <Link href="/templates" className="border border-border rounded-lg p-5 hover:bg-foreground hover:text-background transition-colors group">
          <BarChart2 size={20} className="mb-3 text-foreground/40 group-hover:text-background transition-colors" />
          <h3 className="font-semibold">Email Templates</h3>
          <p className="text-xs text-foreground/50 group-hover:text-background/60 mt-1 transition-colors">Design and save reusable email templates.</p>
        </Link>
      </div>
    </div>
  );
}
