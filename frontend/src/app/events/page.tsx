'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface Event {
  id: number;
  podcast_sender: number;
  podcast_sender_name: string;
  name: string;
  date_string: string;
  venue: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [senders, setSenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, sendersRes] = await Promise.all([
        apiClient.get('/api/v1/events/'),
        apiClient.get('/api/v1/podcast-senders/')
      ]);
      setEvents(eventsRes.results || []);
      setSenders(sendersRes.results || sendersRes || []); // fallback for pagination or plain array
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (currentEvent.id) {
        await apiClient.put(`/api/v1/events/${currentEvent.id}/`, currentEvent);
      } else {
        await apiClient.post('/api/v1/events/', currentEvent);
      }
      setIsModalOpen(false);
      setCurrentEvent({});
      await fetchData();
    } catch (err) {
      console.error('Failed to save event:', err);
      alert('Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await apiClient.delete(`/api/v1/events/${id}/`);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event.');
    }
  };

  const openModal = (event?: Event) => {
    setCurrentEvent(event || { podcast_sender: senders.length > 0 ? senders[0].id : undefined });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage dynamic event details for your email templates.</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center space-x-2">
          <Plus size={16} />
          <span>Add Event</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-foreground/50">Loading events...</div>
      ) : events.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-foreground/50 text-sm">No events found. Click "Add Event" to create one.</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-foreground/5 text-foreground/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Event Name</th>
                  <th className="px-6 py-4 font-medium">Company (Sender)</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Venue</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-foreground/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{event.name}</td>
                    <td className="px-6 py-4">{event.podcast_sender_name}</td>
                    <td className="px-6 py-4">{event.date_string}</td>
                    <td className="px-6 py-4">{event.venue}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => openModal(event)} className="text-blue-500 hover:text-blue-600">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">{currentEvent.id ? 'Edit Event' : 'Add Event'}</h2>
            <form onSubmit={handleSaveEvent} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Company (Sender)</label>
                <select 
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  value={currentEvent.podcast_sender || ''}
                  onChange={e => setCurrentEvent({...currentEvent, podcast_sender: Number(e.target.value)})}
                  required
                >
                  <option value="">-- Select Company --</option>
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Event Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Women Sustainability & Leadership Congress 2027"
                  value={currentEvent.name || ''}
                  onChange={e => setCurrentEvent({...currentEvent, name: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Event Date</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. March 08–10, 2027"
                  value={currentEvent.date_string || ''}
                  onChange={e => setCurrentEvent({...currentEvent, date_string: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Event Venue</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Paris, France"
                  value={currentEvent.venue || ''}
                  onChange={e => setCurrentEvent({...currentEvent, venue: e.target.value})}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
