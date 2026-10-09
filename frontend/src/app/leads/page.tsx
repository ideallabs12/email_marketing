'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/Card';
import { Target, Check, X, Calendar, Clock, Trash2, List, LayoutGrid } from 'lucide-react';
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
  'Completed',
  'Rescheduled',
  'No Show',
  'Cancelled',
  'Missed',
  'Not Responding'
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
  const [viewMode, setViewMode] = useState<'row' | 'card'>('row');

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

  const handleDeleteLead = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently delete this lead?')) return;
    try {
      setSavingId(id);
      await apiClient.delete(`/api/v1/leads/${id}/`);
      setLeads(leads.filter(l => l.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete lead: ' + err.message);
      setSavingId(null);
    }
  };

  const saveNewLead = async () => {
    try {
      const payload: any = { ...newLeadForm };
      if (!payload.speaker_name) payload.speaker_name = payload.email || 'Unknown';
      if (!payload.campaign_name) payload.campaign_name = 'Manual Entry';
      if (!payload.whose_speaker) payload.whose_speaker = '';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-[100vw] overflow-hidden px-2 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <Target className="text-emerald-500" size={28} />
            Leads Tracker
          </h1>
          <p className="text-foreground/60 mt-1.5 text-sm max-w-2xl">
            Manage booked calls and follow-ups. Click on any field to edit directly. Changes save automatically.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-foreground/5 rounded-lg p-1 border border-border/50">
            <button 
              onClick={() => setViewMode('row')} 
              className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'row' ? 'bg-background shadow-xs text-foreground' : 'text-foreground/50 hover:text-foreground/80'}`}
            >
              <List size={15} /> Row
            </button>
            <button 
              onClick={() => setViewMode('card')} 
              className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'card' ? 'bg-background shadow-xs text-foreground' : 'text-foreground/50 hover:text-foreground/80'}`}
            >
              <LayoutGrid size={15} /> Card
            </button>
          </div>
          <button 
            onClick={() => setIsAddingNew(true)}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm whitespace-nowrap flex items-center gap-2 h-9"
          >
            <span>+</span> Add Lead
          </button>
        </div>
      </div>

      {viewMode === 'row' ? (
        <Card className="overflow-hidden w-full p-0 sm:p-0 border-border shadow-sm rounded-2xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider bg-foreground/[0.02] border-b border-border">
              <tr>
                <th className="px-3 py-4 min-w-[180px] w-[25%]">Speaker / Email</th>
                <th className="px-3 py-4 min-w-[160px] w-[22%]">Campaign / Batch</th>
                <th className="px-3 py-4 min-w-[100px] w-[13%]">Owner</th>
                <th className="px-3 py-4 min-w-[200px] w-[20%]">Aftercall Status & Slot</th>
                <th className="px-3 py-4 min-w-[160px] w-[20%]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-foreground/50">Loading leads...</td></tr>
              ) : leads.length === 0 && !isAddingNew ? (
                <tr><td colSpan={5} className="text-center py-12 text-foreground/50">No leads added yet. Go to Analytics to add some!</td></tr>
              ) : (
                <>
                  {isAddingNew && (
                    <tr className="bg-emerald-50/40 dark:bg-emerald-500/10 transition-colors">
                      <td className="px-5 py-4 font-medium align-top">
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            value={newLeadForm.speaker_name || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, speaker_name: e.target.value})} 
                            className="text-sm w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                            placeholder="Speaker name"
                          />
                          <input 
                            type="email" 
                            value={newLeadForm.email || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})} 
                            className="text-xs w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background text-foreground/70 shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                            placeholder="Email address"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            value={newLeadForm.campaign_name || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, campaign_name: e.target.value})} 
                            className="text-sm w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                            placeholder="Campaign name"
                          />
                          <input 
                            type="text" 
                            value={newLeadForm.batch_name || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, batch_name: e.target.value})} 
                            className="text-xs w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background shadow-sm text-foreground/70 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                            placeholder="Batch name"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <input 
                          type="text" 
                          value={newLeadForm.whose_speaker || ''} 
                          onChange={e => setNewLeadForm({...newLeadForm, whose_speaker: e.target.value})} 
                          className="w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background text-sm font-semibold text-emerald-600 shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
                          placeholder="Owner"
                        />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <select 
                            value={newLeadForm.call_status || ''} 
                            onChange={e => setNewLeadForm({...newLeadForm, call_status: e.target.value})}
                            className="w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background text-sm font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                          >
                            <option value="">No Status</option>
                            {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <input 
                              type="date" 
                              value={newLeadDate} 
                              onChange={e => setNewLeadDate(e.target.value)}
                              className="w-1/2 p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background text-xs shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            />
                            <select 
                              value={newLeadTime} 
                              onChange={e => setNewLeadTime(e.target.value)}
                              className="w-1/2 p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background text-xs shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            >
                              <option value="">Time Slot</option>
                              {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 min-w-[250px] align-top relative">
                        <textarea 
                          value={newLeadForm.notes || ''} 
                          onChange={e => setNewLeadForm({...newLeadForm, notes: e.target.value})}
                          className="w-full p-2 border border-emerald-200 dark:border-emerald-500/30 rounded-lg bg-background text-sm h-full min-h-[90px] resize-y shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                          placeholder="Add notes..."
                        />
                        <div className="absolute right-7 bottom-6 flex gap-2">
                          <button onClick={saveNewLead} className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-1 text-xs font-semibold"><Check size={14} /> Save</button>
                          <button onClick={() => setIsAddingNew(false)} className="p-2 bg-white border border-border text-foreground/60 hover:bg-foreground/5 rounded-lg transition-colors shadow-sm"><X size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {leads.map(lead => {
                    const { date: leadDate, time: leadTime } = extractDateAndTime(lead.call_booked_on);
                    const isSaving = savingId === lead.id;
                    
                    return (
                      <tr key={lead.id} className={`hover:bg-foreground/[0.02] transition-colors group ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                        <td className="px-3 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="text"
                              value={lead.speaker_name || ''}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, speaker_name: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'speaker_name', e.target.value)}
                              className="text-sm w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none font-semibold text-foreground transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                              placeholder="Speaker name"
                              title={lead.speaker_name}
                            />
                            <input
                              type="text"
                              value={lead.email || ''}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, email: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'email', e.target.value)}
                              className="text-xs w-full px-2 py-1 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none text-foreground/60 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                              placeholder="Email address"
                              title={lead.email}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="text"
                              value={lead.campaign_name || ''}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, campaign_name: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'campaign_name', e.target.value)}
                              className="text-sm w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none font-medium text-foreground/80 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                              placeholder="Campaign name"
                              title={lead.campaign_name}
                            />
                            <input
                              type="text"
                              value={lead.batch_name || ''}
                              onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, batch_name: e.target.value } : l))}
                              onBlur={(e) => handleInlineUpdate(lead.id, 'batch_name', e.target.value)}
                              className="text-[11px] font-mono w-full px-2 py-1 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none text-foreground/50 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                              placeholder="No batch specified"
                              title={lead.batch_name}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <input
                            type="text"
                            value={lead.whose_speaker || ''}
                            onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, whose_speaker: e.target.value } : l))}
                            onBlur={(e) => handleInlineUpdate(lead.id, 'whose_speaker', e.target.value)}
                            className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                            placeholder="Owner"
                          />
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <select
                              value={lead.call_status || ''}
                              onChange={(e) => handleInlineUpdate(lead.id, 'call_status', e.target.value)}
                              className={`w-full px-2 py-1.5 border border-transparent hover:border-border hover:opacity-90 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none text-xs font-bold transition-all cursor-pointer ${
                                lead.call_status === 'Completed' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                lead.call_status === 'Rescheduled' ? 'text-blue-700 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' :
                                lead.call_status === 'No Show' || lead.call_status === 'Cancelled' || lead.call_status === 'Missed' || lead.call_status === 'Not Responding' ? 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' : 'text-foreground/60 bg-foreground/5'
                              }`}
                            >
                              <option value="">No Status</option>
                              {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1 group/date">
                                <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none group-hover/date:text-foreground/60 transition-colors" />
                                <input
                                  type="date"
                                  value={leadDate}
                                  onChange={(e) => handleInlineDateOrTimeUpdate(lead.id, lead, e.target.value, leadTime)}
                                  className="w-full pl-7 pr-1 py-1.5 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none text-[11px] font-medium text-foreground/70 transition-all cursor-pointer"
                                />
                              </div>
                              <div className="relative flex-1 group/time">
                                <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none group-hover/time:text-foreground/60 transition-colors" />
                                <select
                                  value={leadTime}
                                  onChange={(e) => handleInlineDateOrTimeUpdate(lead.id, lead, leadDate, e.target.value)}
                                  className="w-full pl-7 pr-1 py-1.5 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-md outline-none text-[11px] font-medium text-foreground/70 transition-all cursor-pointer appearance-none"
                                >
                                  <option value="">Slot</option>
                                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top relative group/notes">
                          <textarea
                            value={lead.notes || ''}
                            onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, notes: e.target.value } : l))}
                            onBlur={(e) => handleInlineUpdate(lead.id, 'notes', e.target.value)}
                            className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-border hover:bg-background focus:border-emerald-500/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/10 rounded-lg outline-none text-xs text-foreground/80 min-h-[70px] resize-y transition-all leading-relaxed pr-8"
                            placeholder="Click to add notes..."
                          />
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="absolute right-7 top-6 p-1.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                            title="Delete Lead"
                          >
                            <Trash2 size={14} />
                          </button>
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-foreground/50">Loading leads...</div>
          ) : leads.length === 0 && !isAddingNew ? (
            <div className="col-span-full text-center py-12 text-foreground/50">No leads added yet. Go to Analytics to add some!</div>
          ) : (
            <>
              {isAddingNew && (
                <div className="bg-emerald-50/40 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl p-6 flex flex-col gap-4 shadow-sm relative">
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={newLeadForm.speaker_name || ''} 
                      onChange={e => setNewLeadForm({...newLeadForm, speaker_name: e.target.value})} 
                      className="text-xl font-bold w-full px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:font-normal" 
                      placeholder="Speaker name"
                    />
                    <input 
                      type="email" 
                      value={newLeadForm.email || ''} 
                      onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})} 
                      className="text-sm w-full px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all text-foreground/70" 
                      placeholder="Email address"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] uppercase font-bold text-emerald-700/60 dark:text-emerald-400/60 px-1">Campaign</label>
                      <input 
                        type="text" 
                        value={newLeadForm.campaign_name || ''} 
                        onChange={e => setNewLeadForm({...newLeadForm, campaign_name: e.target.value})} 
                        className="text-sm w-full px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                        placeholder="Campaign name"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] uppercase font-bold text-emerald-700/60 dark:text-emerald-400/60 px-1">Owner</label>
                      <input 
                        type="text" 
                        value={newLeadForm.whose_speaker || ''} 
                        onChange={e => setNewLeadForm({...newLeadForm, whose_speaker: e.target.value})} 
                        className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 w-full px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                        placeholder="Owner"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[11px] uppercase font-bold text-emerald-700/60 dark:text-emerald-400/60 px-1">Status & Date</label>
                    <select 
                      value={newLeadForm.call_status || ''} 
                      onChange={e => setNewLeadForm({...newLeadForm, call_status: e.target.value})}
                      className="w-full px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="">No Status</option>
                      {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-3 mt-1">
                      <input 
                        type="date" 
                        value={newLeadDate} 
                        onChange={e => setNewLeadDate(e.target.value)}
                        className="w-1/2 px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm text-xs focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <select 
                        value={newLeadTime} 
                        onChange={e => setNewLeadTime(e.target.value)}
                        className="w-1/2 px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm text-xs focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      >
                        <option value="">Time Slot</option>
                        {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-col h-full">
                    <label className="text-[11px] uppercase font-bold text-emerald-700/60 dark:text-emerald-400/60 px-1 mb-1.5">Notes</label>
                    <textarea 
                      value={newLeadForm.notes || ''} 
                      onChange={e => setNewLeadForm({...newLeadForm, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-background/80 border border-emerald-200 dark:border-emerald-500/30 rounded-xl outline-none shadow-sm text-sm h-full min-h-[80px] resize-y focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="Add notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-500/30">
                    <button onClick={() => setIsAddingNew(false)} className="px-4 py-2 bg-white border border-border text-foreground/60 hover:bg-foreground/5 rounded-xl transition-colors shadow-sm text-sm font-semibold">Cancel</button>
                    <button onClick={saveNewLead} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm font-semibold"><Check size={16} /> Save Lead</button>
                  </div>
                </div>
              )}

              {leads.map(lead => {
                const { date: leadDate, time: leadTime } = extractDateAndTime(lead.call_booked_on);
                const isSaving = savingId === lead.id;
                
                return (
                  <div key={lead.id} className={`bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 rounded-3xl p-6 flex flex-col gap-4 transition-all relative group/card ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="absolute right-4 top-4 p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl opacity-0 group-hover/card:opacity-100 transition-all shadow-sm z-10 bg-white dark:bg-slate-800 hover:border-transparent border border-border"
                      title="Delete Lead"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="flex flex-col pr-10">
                      <input
                        type="text"
                        value={lead.speaker_name || ''}
                        onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, speaker_name: e.target.value } : l))}
                        onBlur={(e) => handleInlineUpdate(lead.id, 'speaker_name', e.target.value)}
                        className="text-xl font-bold w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-foreground transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                        placeholder="Speaker name"
                      />
                      <input
                        type="text"
                        value={lead.email || ''}
                        onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, email: e.target.value } : l))}
                        onBlur={(e) => handleInlineUpdate(lead.id, 'email', e.target.value)}
                        className="text-sm w-full px-2 py-1 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-foreground/60 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                        placeholder="Email address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-white/60 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-foreground/40 px-2">Campaign</label>
                        <input
                          type="text"
                          value={lead.campaign_name || ''}
                          onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, campaign_name: e.target.value } : l))}
                          onBlur={(e) => handleInlineUpdate(lead.id, 'campaign_name', e.target.value)}
                          className="text-xs font-semibold w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-foreground/80 transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                          placeholder="Campaign"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-foreground/40 px-2">Owner</label>
                        <input
                          type="text"
                          value={lead.whose_speaker || ''}
                          onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, whose_speaker: e.target.value } : l))}
                          onBlur={(e) => handleInlineUpdate(lead.id, 'whose_speaker', e.target.value)}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                          placeholder="Owner"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <select
                        value={lead.call_status || ''}
                        onChange={(e) => handleInlineUpdate(lead.id, 'call_status', e.target.value)}
                        className={`w-full px-3 py-2.5 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:opacity-90 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold transition-all cursor-pointer ${
                          lead.call_status === 'Completed' ? 'text-emerald-700 bg-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          lead.call_status === 'Rescheduled' ? 'text-blue-700 bg-blue-100/50 dark:bg-blue-500/10 dark:text-blue-400' :
                          lead.call_status === 'No Show' || lead.call_status === 'Cancelled' || lead.call_status === 'Missed' || lead.call_status === 'Not Responding' ? 'text-rose-700 bg-rose-100/50 dark:bg-rose-500/10 dark:text-rose-400' : 'text-foreground/60 bg-white/60 dark:bg-slate-800/60'
                        }`}
                      >
                        <option value="">No Status</option>
                        {CALL_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 group/date">
                          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none group-hover/date:text-foreground/60 transition-colors" />
                          <input
                            type="date"
                            value={leadDate}
                            onChange={(e) => handleInlineDateOrTimeUpdate(lead.id, lead, e.target.value, leadTime)}
                            className="w-full pl-8 pr-2 py-2 bg-white/60 dark:bg-slate-800/60 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-xs font-medium text-foreground/70 transition-all cursor-pointer"
                          />
                        </div>
                        <div className="relative flex-1 group/time">
                          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none group-hover/time:text-foreground/60 transition-colors" />
                          <select
                            value={leadTime}
                            onChange={(e) => handleInlineDateOrTimeUpdate(lead.id, lead, leadDate, e.target.value)}
                            className="w-full pl-8 pr-2 py-2 bg-white/60 dark:bg-slate-800/60 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-xs font-medium text-foreground/70 transition-all cursor-pointer appearance-none"
                          >
                            <option value="">Slot</option>
                            {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 mt-2">
                      <textarea
                        value={lead.notes || ''}
                        onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? { ...l, notes: e.target.value } : l))}
                        onBlur={(e) => handleInlineUpdate(lead.id, 'notes', e.target.value)}
                        className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/10 rounded-xl outline-none text-sm text-foreground/80 h-full min-h-[80px] resize-y transition-all leading-relaxed"
                        placeholder="Click to add notes..."
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
