'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import {
  Building2,
  Calendar,
  MapPin,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Conference } from '../../types';

const SECOND_SERIES_TEAMS = [
  'PROSUMMITS',
  'WYNXTALKS',
  'WYN',
  'ICON',
  'IDiAS',
  'NEXT',
  'VOICETALKS',
  'SIGNATURE',
] as const;

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PROSUMMITS: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  WYNXTALKS: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  WYN: { bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30' },
  ICON: { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  IDiAS: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  NEXT: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  VOICETALKS: { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30' },
  SIGNATURE: { bg: 'bg-yellow-500/10 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30' },
};

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Conference Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    company_name: 'PROSUMMITS',
    conference_name: '',
    date: '',
    venue: '',
    theme: '',
    website_link: '',
    calendly_link: '',
    linkedin_link: '',
  });

  // Delete confirmation state
  const [deletingConference, setDeletingConference] = useState<Conference | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/v1/conferences/?limit=1000');
      const list = Array.isArray(res) ? res : res.results || [];
      setConferences(list);
    } catch (err: any) {
      console.error('Failed to load conferences:', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to load conferences from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // Pre-fill company if specific team is currently selected
  const handleOpenAddModal = () => {
    const defaultCompany = selectedTeam !== 'ALL' ? selectedTeam : 'PROSUMMITS';
    setFormData({
      company_name: defaultCompany,
      conference_name: '',
      date: '',
      venue: '',
      theme: '',
      website_link: '',
      calendly_link: '',
      linkedin_link: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreateConference = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.company_name.trim()) {
      setFormError('Team/Company Name is required.');
      return;
    }
    if (!formData.conference_name.trim()) {
      setFormError('Conference Name is required.');
      return;
    }
    if (!formData.date.trim()) {
      setFormError('Conference Date is required.');
      return;
    }
    if (!formData.venue.trim()) {
      setFormError('Conference Venue / Location is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        company_name: formData.company_name.trim().toUpperCase(),
        conference_name: formData.conference_name.trim(),
        date: formData.date.trim(),
        venue: formData.venue.trim(),
        theme: formData.theme.trim(),
        website_link: formData.website_link.trim(),
        calendly_link: formData.calendly_link.trim(),
        linkedin_link: formData.linkedin_link.trim(),
      };

      const created: Conference = await apiClient.post('/api/v1/conferences/', payload);
      setConferences((prev) => [created, ...prev]);
      setIsModalOpen(false);
      showNotification('success', `Conference "${created.conference_name}" added successfully.`);
      if (selectedTeam !== 'ALL' && selectedTeam !== created.company_name) {
        setSelectedTeam(created.company_name);
      }
    } catch (err: any) {
      console.error('Error creating conference:', err);
      setFormError(err?.message || 'Failed to create conference.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConference = async () => {
    if (!deletingConference) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/v1/conferences/${deletingConference.id}/`);
      setConferences((prev) => prev.filter((c) => c.id !== deletingConference.id));
      showNotification('success', `Conference "${deletingConference.conference_name}" deleted.`);
      setDeletingConference(null);
    } catch (err: any) {
      console.error('Error deleting conference:', err);
      showNotification('error', err?.message || 'Failed to delete conference.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered conferences
  const filteredConferences = useMemo(() => {
    return conferences.filter((conf) => {
      const matchTeam =
        selectedTeam === 'ALL'
          ? true
          : conf.company_name?.toUpperCase() === selectedTeam.toUpperCase();

      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        conf.conference_name?.toLowerCase().includes(query) ||
        conf.company_name?.toLowerCase().includes(query) ||
        conf.venue?.toLowerCase().includes(query) ||
        conf.theme?.toLowerCase().includes(query) ||
        conf.date?.toLowerCase().includes(query);

      return matchTeam && matchQuery;
    });
  }, [conferences, selectedTeam, searchQuery]);

  // Counts by team
  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: conferences.length };
    SECOND_SERIES_TEAMS.forEach((team) => {
      counts[team] = conferences.filter(
        (c) => c.company_name?.toUpperCase() === team.toUpperCase()
      ).length;
    });
    return counts;
  }, [conferences]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg text-sm border transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-foreground/50 hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Conferences</h1>
              <p className="text-sm text-foreground/60">
                Manage upcoming conference events for Second Series invite templates and campaigns
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchConferences}
            title="Refresh list"
            className="p-2 border border-border rounded-lg hover:bg-hover-bg text-foreground/70 hover:text-foreground transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button onClick={handleOpenAddModal} className="flex items-center space-x-2">
            <Plus size={18} />
            <span>Add Conference</span>
          </Button>
        </div>
      </div>

      {/* Team Filter Pills & Search */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conferences by name, venue, theme..."
                className="w-full pl-9 pr-3 py-2 bg-foreground/5 border border-border/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-foreground/30"
              />
            </div>

            <div className="text-xs text-foreground/50 font-medium">
              Showing {filteredConferences.length} of {conferences.length} conference{conferences.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Teams Selector */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
              Second Series Teams:
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTeam('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                  selectedTeam === 'ALL'
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : 'bg-surface border-border text-foreground/70 hover:bg-hover-bg hover:text-foreground'
                }`}
              >
                <span>All Teams</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    selectedTeam === 'ALL'
                      ? 'bg-background/20 text-background'
                      : 'bg-foreground/10 text-foreground/70'
                  }`}
                >
                  {teamCounts['ALL'] || 0}
                </span>
              </button>

              {SECOND_SERIES_TEAMS.map((team) => {
                const count = teamCounts[team] || 0;
                const isSelected = selectedTeam === team;
                const colors = TEAM_COLORS[team] || {
                  bg: 'bg-foreground/5',
                  text: 'text-foreground',
                  border: 'border-border',
                };

                return (
                  <button
                    key={team}
                    onClick={() => setSelectedTeam(team)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                    }`}
                  >
                    <span>{team}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-foreground/10 text-foreground/80'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Conference Cards List */}
      {loading ? (
        <div className="py-20 text-center text-foreground/50">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm">Loading conferences...</p>
        </div>
      ) : filteredConferences.length === 0 ? (
        <Card className="py-16 text-center">
          <Building2 size={40} className="mx-auto text-foreground/20 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No conferences found</h3>
          <p className="text-sm text-foreground/50 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery
              ? `No conference matched your search "${searchQuery}".`
              : selectedTeam !== 'ALL'
              ? `No conferences found for team ${selectedTeam}. Click below to add one.`
              : 'There are no conferences registered in the system yet.'}
          </p>
          <Button onClick={handleOpenAddModal} className="inline-flex items-center space-x-2">
            <Plus size={16} />
            <span>Add Conference for {selectedTeam !== 'ALL' ? selectedTeam : 'Second Series'}</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredConferences.map((conf) => {
            const teamUpper = conf.company_name?.toUpperCase() || '';
            const color = TEAM_COLORS[teamUpper] || {
              bg: 'bg-foreground/5',
              text: 'text-foreground',
              border: 'border-border',
            };

            return (
              <div
                key={conf.id}
                className="bg-surface border border-card-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Company Badge + Delete */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide uppercase ${color.bg} ${color.text} ${color.border}`}
                    >
                      {conf.company_name}
                    </span>

                    <button
                      onClick={() => setDeletingConference(conf)}
                      title="Delete conference"
                      className="text-foreground/40 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Conference Title */}
                  <h3 className="font-bold text-lg text-foreground leading-snug mb-3">
                    {conf.conference_name}
                  </h3>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-foreground/80 mb-4">
                    <div className="flex items-center space-x-2.5">
                      <Calendar size={15} className="text-amber-500 shrink-0" />
                      <span className="font-medium text-foreground">{conf.date}</span>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <MapPin size={15} className="text-rose-500 shrink-0" />
                      <span>{conf.venue}</span>
                    </div>

                    {conf.theme && (
                      <div className="flex items-start space-x-2.5 pt-1">
                        <Sparkles size={15} className="text-purple-500 shrink-0 mt-0.5" />
                        <span className="text-xs italic text-foreground/70">
                          &ldquo;{conf.theme}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Links */}
                <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                  {conf.website_link && (
                    <a
                      href={conf.website_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
                    >
                      <span>Website</span>
                      <ExternalLink size={12} />
                    </a>
                  )}

                  {conf.calendly_link && (
                    <a
                      href={conf.calendly_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      <Clock size={12} />
                      <span>Calendly</span>
                    </a>
                  )}

                  {conf.linkedin_link && (
                    <a
                      href={conf.linkedin_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                    >
                      <Share2 size={12} />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Conference Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-card-border rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Add New Conference</h3>
                  <p className="text-xs text-foreground/50">
                    Register a conference for second series templates & sends
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-foreground/50 hover:text-foreground p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center space-x-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateConference} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                  Team / Company Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  {SECOND_SERIES_TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                  Conference Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.conference_name}
                  onChange={(e) => setFormData({ ...formData, conference_name: e.target.value })}
                  placeholder="e.g. Elite Women Leadership Summit 2027"
                  className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="e.g. March 8–11, 2027"
                    className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                    Venue / Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="e.g. Paris, France"
                    className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                  Conference Theme (Optional)
                </label>
                <input
                  type="text"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  placeholder="e.g. Leading with Vision. Inspiring Global Influence"
                  className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                  Official Website Link
                </label>
                <input
                  type="url"
                  value={formData.website_link}
                  onChange={(e) => setFormData({ ...formData, website_link: e.target.value })}
                  placeholder="https://prosummits.org/events/ewl-summit-2027"
                  className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                  Calendly / Meeting Link
                </label>
                <input
                  type="url"
                  value={formData.calendly_link}
                  onChange={(e) => setFormData({ ...formData, calendly_link: e.target.value })}
                  placeholder="https://calendly.com/prosummitsvirtual"
                  className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/70 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedin_link}
                  onChange={(e) => setFormData({ ...formData, linkedin_link: e.target.value })}
                  placeholder="https://www.linkedin.com/company/prosummits/"
                  className="w-full px-3 py-2 bg-foreground/5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Add Conference'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingConference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-card-border rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 text-red-500 mb-3">
              <div className="p-2.5 rounded-full bg-red-500/10">
                <Trash2 size={22} />
              </div>
              <h3 className="font-bold text-lg text-foreground">Delete Conference</h3>
            </div>

            <p className="text-sm text-foreground/70 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">
                &ldquo;{deletingConference.conference_name}&rdquo;
              </strong>{' '}
              for team <span className="font-bold">{deletingConference.company_name}</span>?
            </p>
            <p className="text-xs text-foreground/50 mt-2">
              This action cannot be undone. Any campaigns or templates currently referencing this
              conference will still retain their sent logs.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeletingConference(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteConference}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Conference'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

