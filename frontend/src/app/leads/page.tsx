'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/Card';
import { Target, Check, X, Calendar, Clock } from 'lucide-react';
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
  'Cancelled',
  'Missed'
];

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const isPM = h >= 12;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const min = m === 0 ? '00' : m;
      const ampm = isPM ? 'PM' : 'AM';
      slots.push(`${hour12}:${min} ${ampm}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState<Partial<Lead>>({
    speaker_name: '', email: '', campaign_name: 'Manual Entry', batch_name: '', whose_speaker: '', call_status: '', notes: ''
  });
  const [newLeadDate, setNewLeadDate] = useState('');
  const [newLeadTime, setNewLeadTime] = useState('');

  // Keep track of which lead is currently being edited to show saving status
  const [savingId, setSavingId] = useState<number | null>(null);

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

  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    const [month, day, year] = new Date(dateStr).toLocaleDateString().split('/');
    // Parse time like "1:15 PM"
    const [time, ampm] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const extractDateAndTime = (isoString: string | null) => {
    if (!isoString) return { date: '', time: '' };
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    
    const date = d.toISOString().split('T')[0];
    
    let hours = d.getHours();
    let minutes: any = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const time = `${hours}:${minutes} ${ampm}`;
    
    return { date, time };
  };

  const handleInlineUpdate = async (id: number, field: string, value: any) => {
    try {
      setSavingId(id);
      
      // Update local state immediately for snappy UI
      setLeads(leads.map(l => l.id === id ? { ...l, [field]: value } : l));
      
      const payload: any = { [field]: value };
      if (value === '') payload[field] = null;
      
      await apiClient.patch(`/api/v1/leads/${id}/`, payload);
    } catch (err: any) {
      console.error(err);
      fetchLeads(); // Revert on failure
      alert('Failed to save update: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleInlineDateOrTimeUpdate = async (id: number, lead: Lead, newDate: string, newTime: string) => {
    const combined = combineDateAndTime(newDate, newTime);
    
    try {
      setSavingId(id);
      setLeads(leads.map(l => l.id === id ? { ...l, call_booked_on: combined } : l));
      await apiClient.patch(`/api/v1/leads/${id}/`, { call_booked_on: combined });
    } catch (err: any) {
      console.error(err);
      fetchLeads();
      alert('Failed to save update: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const saveNewLead = async () => {
    try {
      const payload: any = { ...newLeadForm };
      if (!payload.speaker_name) payload.speaker_name = payload.email || 'Unknown';
      if (!payload.campaign_name) payload.campaign_name = 'Manual Entry';
      if (!payload.whose_speaker) payload.whose_speaker = 'Manual';
      if (!payload.email) payload.email = 'no-email@example.com';
      if (!payload.call_status) payload.call_status = null;
      
      payload.call_booked_on = combineDateAndTime(newLeadDate, newLeadTime);
      
      const created = await apiClient.post(`/api/v1/leads/`, payload);
      setLeads([created, ...leads]);
      setIsAddingNew(false);
      setNewLeadForm({
        speaker_name: '', email: '', campaign_name: 'Manual Entry', batch_name: '', whose_speaker: '', call_status: '', notes: ''
      });
      setNewLeadDate('');
      setNewLeadTime('');
    } catch (err: any) {
      alert('Failed to add lead: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[100vw] overflow-hidden px-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="text-emerald-500" />
            Leads Tracker
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage booked calls and follow-ups from your campaigns. Click any field to edit directly.</p>
        </div>
        <button 
          onClick={() => setIsAddingNew(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm whitespace-nowrap"
        >
          + Add Lead Manually
        </button>
      </div>

      <Card className="overflow-hidden w-full p-0 sm:p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-foreground/50 uppercase bg-foreground/5 border-b border-border">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Speaker / Email</th>
                <th className="px-4 py-3 min-w-[150px]">Campaign / Batch</th>
                <th className="px-4 py-3 w-32">Owner</th>
                <th className="px-4 py-3 min-w-[250px]">Call Status & Slot</th>
                <th className="px-4 py-3 w-full">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading leads...</td></tr>
              ) : leads.length === 0 && !isAddingNew ? (
                <tr><td colSpan={5} className="text-center py-8 text-foreground/50">No leads added yet. Go to Analytics to add some!</td></tr>
              ) : (
                <>
                  {isAddingNew && (
                    <tr className="bg-emerald-50/50 dark:bg-emerald-500/10 transition-colors">
                      <td className="px-4 py-3 font-medium align-top">
                        <div className="space-y-1">
                          <input 
                            type="text" 
                            value={newLeadForm.speaker_name || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, speaker_name: e.target.value})} 
                            className="text-sm w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background shadow-sm" 
                            placeholder="Speaker name"
                          />
                          <input 
                            type="email" 
                            value={newLeadForm.email || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})} 
                            className="text-xs w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background text-foreground/70 shadow-sm" 
                            placeholder="Email address"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <input 
                            type="text" 
                            value={newLeadForm.campaign_name || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, campaign_name: e.target.value})} 
                            className="text-sm w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background shadow-sm" 
                            placeholder="Campaign name"
                          />
                          <input 
                            type="text" 
                            value={newLeadForm.batch_name || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, batch_name: e.target.value})} 
                            className="text-xs w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background shadow-sm text-foreground/70" 
                            placeholder="Batch name"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input 
                          type="text" 
                          value={newLeadForm.whose_speaker || ''} 
                          onChange={e => setNewLeadForm({...newLeadForm, whose_speaker: e.target.value})} 
                          className="w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background text-sm font-semibold text-emerald-600 shadow-sm" 
                          placeholder="Owner"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-2">
                          <select 
                            value={newLeadForm.call_status || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, call_status: e.target.value})}
                            className="w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background text-sm font-semibold shadow-sm"
                          >
                            <option value="">No Status</option>
                            {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <div className="flex gap-1">
                            <input 
                              type="date" 
                              value={newLeadDate} 
                              onChange={e => setNewLeadDate(e.target.value)}
                              className="w-1/2 p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background text-xs shadow-sm"
                            />
                            <select 
                              value={newLeadTime} 
                              onChange={e => setNewLeadTime(e.target.value)}
                              className="w-1/2 p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background text-xs shadow-sm"
                            >
                              <option value="">Time Slot</option>
                              {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[250px] align-top relative">
                        <textarea 
                          value={newLeadForm.notes || ''} 
                          onChange={e => setNewLeadForm({...newLeadForm, notes: e.target.value})}
                          className="w-full p-1.5 border border-emerald-200 dark:border-emerald-500/30 rounded bg-background text-sm h-full min-h-[70px] resize-y shadow-sm"
                          placeholder="Add notes..."
                        />
                        <div className="absolute right-6 bottom-4 flex gap-1">
                          <button onClick={saveNewLead} className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded transition-colors shadow-sm"><Check size={14} /></button>
                          <button onClick={() => setIsAddingNew(false)} className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 rounded transition-colors shadow-sm"><X size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {leads.map(lead => {
                    const { date: leadDate, time: leadTime } = extractDateAndTime(lead.call_booked_on);
                    const isSaving = savingId === lead.id;
                    
                    return (
                      <tr key={lead.id} className={`hover:bg-foreground/[0.02] transition-colors group ${isSaving ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={lead.speaker_name}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, speaker_name: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'speaker_name', e.target.value)}
                              className="text-sm w-full p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none font-medium transition-all"
                              placeholder="Speaker name"
                            />
                            <input
                              type="text"
                              value={lead.email}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, email: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'email', e.target.value)}
                              className="text-xs w-full p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none text-foreground/60 transition-all"
                              placeholder="Email"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={lead.campaign_name}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, campaign_name: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'campaign_name', e.target.value)}
                              className="text-sm w-full p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none font-medium text-foreground/80 transition-all"
                              placeholder="Campaign name"
                            />
                            <input
                              type="text"
                              value={lead.batch_name}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, batch_name: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'batch_name', e.target.value)}
                              className="text-[11px] font-mono w-full p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none text-foreground/60 transition-all"
                              placeholder="No batch"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="text"
                            value={lead.whose_speaker}
                            onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, whose_speaker: e.target.value } : l))}
                            onBlur={(e) => handleInlineUpdate(lead.id, 'whose_speaker', e.target.value)}
                            className="w-full p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all"
                            placeholder="Owner"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <select
                              value={lead.call_status || ''}
                              onChange={(e) => handleInlineUpdate(lead.id, 'call_status', e.target.value)}
                              className={`w-full p-1 border-transparent focus:border-emerald-500/50 rounded outline-none text-xs font-bold transition-all cursor-pointer ${
                                lead.call_status === 'Scheduled' ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' :
                                lead.call_status === 'Completed' ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' :
                                lead.call_status === 'No Show' || lead.call_status === 'Cancelled' || lead.call_status === 'Missed' ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-foreground/60 bg-foreground/5 hover:bg-foreground/10'
                              }`}
                            >
                              <option value="">No Status</option>
                              {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            
                            <div className="flex items-center gap-1">
                              <div className="relative flex-1 group/date">
                                <Calendar size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                                <input
                                  type="date"
                                  value={leadDate}
                                  onChange={(e) => handleInlineDateOrTimeUpdate(lead.id, lead, e.target.value, leadTime)}
                                  className="w-full pl-5 p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none text-[11px] text-foreground/70 transition-all cursor-pointer"
                                />
                              </div>
                              <div className="relative flex-1 group/time">
                                <Clock size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                                <select
                                  value={leadTime}
                                  onChange={(e) => handleInlineDateOrTimeUpdate(lead.id, lead, leadDate, e.target.value)}
                                  className="w-full pl-5 p-1 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none text-[11px] text-foreground/70 transition-all cursor-pointer appearance-none"
                                >
                                  <option value="">Slot</option>
                                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top min-w-[250px]">
                          <textarea
                            value={lead.notes}
                            onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, notes: e.target.value } : l))}
                            onBlur={(e) => handleInlineUpdate(lead.id, 'notes', e.target.value)}
                            className="w-full p-1.5 bg-transparent border border-transparent hover:border-border focus:border-emerald-500/50 focus:bg-background rounded outline-none text-xs text-foreground/70 min-h-[60px] resize-y transition-all"
                            placeholder="Add notes..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
