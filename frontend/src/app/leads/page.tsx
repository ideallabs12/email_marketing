'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/Card';
import { Target, Edit2, Check, X } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface Lead {
  id: number;
  speaker_name: string;
  email: string;
  campaign_name: string;
  batch_name: string;
  whose_speaker: string;
  call_booked_on: string | null;
  call_status: string | null;
  followup: string | null;
  notes: string;
  created_at: string;
}

const CALL_STATUS_CHOICES = [
  'Scheduled',
  'Completed',
  'Rescheduled',
  'No Show',
  'Cancelled'
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/v1/leads/');
      if (res.results) {
        setLeads(res.results);
      } else if (Array.isArray(res)) {
        setLeads(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditForm({
      speaker_name: lead.speaker_name,
      email: lead.email,
      campaign_name: lead.campaign_name,
      batch_name: lead.batch_name,
      whose_speaker: lead.whose_speaker,
      call_status: lead.call_status,
      call_booked_on: lead.call_booked_on ? lead.call_booked_on.split('T')[0] : '',
      notes: lead.notes,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: number) => {
    try {
      const payload: any = { ...editForm };
      if (!payload.call_booked_on) payload.call_booked_on = null;
      if (!payload.call_status) payload.call_status = null;
      
      const updated = await apiClient.patch(`/api/v1/leads/${id}/`, payload);
      setLeads(leads.map(l => l.id === id ? updated : l));
      setEditingId(null);
    } catch (err: any) {
      alert('Failed to save lead updates: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="text-emerald-500" />
            Leads Tracker
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage booked calls and follow-ups from your campaigns.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-foreground/50 uppercase bg-foreground/5 border-b border-border">
              <tr>
                <th className="px-4 py-3">Speaker / Email</th>
                <th className="px-4 py-3">Campaign / Batch</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Call Status / Date</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">Loading leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-foreground/50">No leads added yet. Go to Analytics to add some!</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {editingId === lead.id ? (
                      <div className="space-y-1">
                        <input 
                          type="text" 
                          value={editForm.speaker_name || ''} 
                          onChange={e => setEditForm({...editForm, speaker_name: e.target.value})} 
                          className="text-sm w-full p-1 border border-border rounded bg-background" 
                          placeholder="Speaker name"
                        />
                        <input 
                          type="email" 
                          value={editForm.email || ''} 
                          onChange={e => setEditForm({...editForm, email: e.target.value})} 
                          className="text-xs w-full p-1 border border-border rounded bg-background" 
                          placeholder="Email address"
                        />
                      </div>
                    ) : (
                      <>
                        <div>{lead.speaker_name}</div>
                        <div className="text-xs text-foreground/50 font-normal">{lead.email}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === lead.id ? (
                      <div className="space-y-1">
                        <input 
                          type="text" 
                          value={editForm.campaign_name || ''} 
                          onChange={e => setEditForm({...editForm, campaign_name: e.target.value})} 
                          className="text-sm w-full p-1 border border-border rounded bg-background" 
                          placeholder="Campaign name"
                        />
                        <input 
                          type="text" 
                          value={editForm.batch_name || ''} 
                          onChange={e => setEditForm({...editForm, batch_name: e.target.value})} 
                          className="text-xs w-full p-1 border border-border rounded bg-background" 
                          placeholder="Batch name"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-foreground/80">{lead.campaign_name}</div>
                        <div className="text-[11px] font-mono bg-foreground/5 px-1 py-0.5 rounded w-max mt-1 text-foreground/60">{lead.batch_name || 'No batch'}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === lead.id ? (
                      <input 
                        type="text" 
                        value={editForm.whose_speaker || ''} 
                        onChange={e => setEditForm({...editForm, whose_speaker: e.target.value})} 
                        className="w-full p-1.5 border border-border rounded bg-background text-sm outline-none focus:border-foreground" 
                        placeholder="Owner name"
                      />
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-md text-xs">{lead.whose_speaker || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === lead.id ? (
                      <div className="space-y-2">
                        <select 
                          value={editForm.call_status || ''} 
                          onChange={e => setEditForm({...editForm, call_status: e.target.value})}
                          className="w-full p-1.5 border border-border rounded bg-background text-sm outline-none"
                        >
                          <option value="">No Status</option>
                          {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input 
                          type="date" 
                          value={editForm.call_booked_on || ''} 
                          onChange={e => setEditForm({...editForm, call_booked_on: e.target.value})}
                          className="w-full p-1.5 border border-border rounded bg-background text-sm outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className={`font-bold text-xs inline-block px-2 py-0.5 rounded-full border ${
                          lead.call_status === 'Scheduled' ? 'text-blue-500 border-blue-500/30 bg-blue-500/10' :
                          lead.call_status === 'Completed' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' :
                          lead.call_status === 'No Show' || lead.call_status === 'Cancelled' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 'text-foreground/50 border-border bg-foreground/5'
                        }`}>
                          {lead.call_status || 'No Status'}
                        </div>
                        <div className="text-[11px] text-foreground/50 mt-1">
                          {lead.call_booked_on ? new Date(lead.call_booked_on).toLocaleDateString() : 'No date'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    {editingId === lead.id ? (
                      <textarea 
                        value={editForm.notes || ''} 
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        className="w-full p-1.5 border border-border rounded bg-background text-sm min-h-[60px] outline-none focus:border-foreground"
                        placeholder="Add notes..."
                      />
                    ) : (
                      <div className="text-xs text-foreground/70" title={lead.notes}>{lead.notes || '—'}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === lead.id ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => saveEdit(lead.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"><Check size={16} /></button>
                        <button onClick={cancelEdit} className="p-1.5 text-foreground/50 hover:bg-foreground/10 rounded transition-colors"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(lead)} className="p-1.5 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded transition-colors">
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
