'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, ChartNoAxesCombined, Mail, Loader2, Calendar } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import type { AdvanceCampaign, Campaign } from '@/types';
import CampaignAnalyticsView from '@/components/CampaignAnalyticsView';

export default function CentralizedAnalyticsPage() {
  const [containers, setContainers] = useState<AdvanceCampaign[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContainerId, setExpandedContainerId] = useState<number | null>(null);
  const [selectedBlastId, setSelectedBlastId] = useState<number | null>(null);

  // Fetch all Advance Campaigns on mount
  useEffect(() => {
    let isCurrent = true;
    setLoadingContainers(true);
    
    apiClient.get('/api/v1/advance-campaigns/?limit=10000')
      .then((data: { results?: AdvanceCampaign[] } | AdvanceCampaign[]) => {
        if (isCurrent) {
          // Handle both paginated {results: [...]} and plain array responses
          const list = Array.isArray(data) ? data : (data as { results?: AdvanceCampaign[] }).results ?? [];
          const sorted = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setContainers(sorted);
        }
      })
      .catch((err) => {
        console.error('Failed to load containers', err);
      })
      .finally(() => {
        if (isCurrent) setLoadingContainers(false);
      });

    return () => { isCurrent = false; };
  }, []);

  // Filter containers based on search query
  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) return containers;
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return containers.filter(c => {
      const name = c.name.toLowerCase();
      return tokens.every(token => name.includes(token));
    });
  }, [containers, searchQuery]);

  const toggleContainer = (id: number) => {
    setExpandedContainerId(prev => prev === id ? null : id);
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'sent': return 'bg-emerald-500';
      case 'sending': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'scheduled': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] -m-8 md:-m-12">
      {/* Left Pane: Selection Menu */}
      <div className="w-full md:w-[350px] lg:w-[400px] border-r border-border bg-surface flex flex-col flex-shrink-0">
        
        {/* Header & Search — NOT sticky, is a flex sibling so it never overlaps the list */}
        <div className="p-4 border-b border-border bg-background/50 flex-shrink-0">
          <h2 className="font-bold text-lg mb-4">Analytics</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
        </div>

        {/* Containers List — scrolls independently below the header */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loadingContainers ? (
            <div className="flex justify-center items-center h-32 text-foreground/40">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="text-center py-8 text-sm text-foreground/40">
              No campaigns found.
            </div>
          ) : (
            filteredContainers.map(container => {
              const isExpanded = expandedContainerId === container.id;
              // AdvanceCampaignSerializer returns campaigns natively if we set it up, otherwise we might need to fetch them.
              // Assuming campaigns are included in the serializer as per types.
              const blasts = container.campaigns || [];
              
              return (
                <div key={container.id} className="border border-transparent hover:border-border/50 rounded-lg transition-colors">
                  <button
                    onClick={() => toggleContainer(container.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-foreground/5 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="text-foreground/40 group-hover:text-foreground/70 transition-colors">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-sm truncate">{container.name}</div>
                        <div className="text-xs text-foreground/50 mt-0.5">{blasts.length} blasts</div>
                      </div>
                    </div>
                  </button>

                  {/* Blasts (Campaigns) Accordion Content */}
                  {isExpanded && (
                    <div className="pl-9 pr-2 pb-2 space-y-1 mt-1">
                      {blasts.length === 0 ? (
                        <div className="text-xs text-foreground/40 py-2">No blasts sent yet.</div>
                      ) : (
                        blasts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(blast => {
                          const isSelected = selectedBlastId === blast.id;
                          return (
                            <button
                              key={blast.id}
                              onClick={() => setSelectedBlastId(blast.id)}
                              className={`w-full flex flex-col p-2.5 rounded-md text-left text-sm transition-all border ${
                                isSelected 
                                  ? 'bg-foreground text-background border-foreground shadow-md' 
                                  : 'bg-background hover:bg-foreground/5 border-border/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium truncate pr-2">{blast.name}</div>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(blast.status)}`} title={blast.status} />
                              </div>
                              <div className={`text-[10px] flex items-center gap-1.5 ${isSelected ? 'text-background/70' : 'text-foreground/50'}`}>
                                <Calendar size={10} />
                                {blast.sent_at ? new Date(blast.sent_at).toLocaleDateString() : 'Not sent'}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Analytics Viewer */}
      <div className="hidden md:flex flex-1 flex-col overflow-y-auto bg-background p-8 lg:p-12">
        {selectedBlastId ? (
          // Add a unique key so the component completely remounts and refetches when blast ID changes
          <CampaignAnalyticsView key={selectedBlastId} campaignId={selectedBlastId.toString()} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/30 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
              <ChartNoAxesCombined size={48} className="opacity-50" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground/40 mb-2">Centralized Analytics</h3>
            <p className="text-sm max-w-sm text-center">
              Select a specific blast from the left menu to view its complete performance and engagement metrics.
            </p>
          </div>
        )}
      </div>

      {/* Mobile Right Pane Overlay (Optional, if we want to support small screens well) */}
      {selectedBlastId && (
        <div className="md:hidden fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-10 flex items-center gap-3">
            <button 
              onClick={() => setSelectedBlastId(null)}
              className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <h2 className="font-bold">Analytics Viewer</h2>
          </div>
          <div className="p-4 pb-20">
            <CampaignAnalyticsView key={selectedBlastId} campaignId={selectedBlastId.toString()} />
          </div>
        </div>
      )}
    </div>
  );
}
