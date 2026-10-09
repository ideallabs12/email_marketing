'use client';

import Link from 'next/link';
import { Home, Mail, Users, FileText, ChevronLeft, ChevronRight, MailWarning, LogOut, X, Library, LayoutTemplate, BarChart3, Target, Search } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: { mobileMenuOpen?: boolean, setMobileMenuOpen?: (v: boolean) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    
    setIsSearching(true);
    try {
      const res = await apiClient.get(`/api/v1/lookup/?tracking_id=${encodeURIComponent(query)}`);
      if (res.url) {
        setSearchQuery('');
        router.push(res.url);
        if (setMobileMenuOpen) setMobileMenuOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'ID not found');
    } finally {
      setIsSearching(false);
    }
  };

  // Close mobile menu on route change
  useEffect(() => {
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setMobileMenuOpen?.(false)}
        />
      )}

      <div className={`
        fixed md:sticky top-0 h-screen bg-surface border-r border-border p-6 flex flex-col transition-all duration-300 z-40
        ${mobileMenuOpen ? 'left-0 translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-20 items-center px-4' : 'w-64'}
      `}>
        {/* Desktop Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="hidden md:block absolute -right-3 top-8 bg-background border border-border rounded-full p-1 hover:bg-foreground/5 z-10 text-foreground"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Mobile Close Button */}
        <button 
          onClick={() => setMobileMenuOpen?.(false)} 
          className="md:hidden absolute right-4 top-6 text-foreground/70 hover:text-foreground"
        >
          <X size={20} />
        </button>

      <div className={`text-xl font-bold mb-6 tracking-tight flex items-center h-8 ${isCollapsed ? 'justify-center text-sm' : ''}`}>
        {isCollapsed ? (
          <img src="/mass-mailing-logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
        ) : (
          <img src="/mass-mailing-logo.svg" alt="Logo" className="h-8 w-auto object-contain" />
        )}
      </div>

      <form onSubmit={handleSearch} className={`mb-6 relative ${isCollapsed ? 'hidden' : 'block'}`}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Jump to ID (e.g. X9K2)"
          className="w-full pl-9 pr-3 py-2 bg-foreground/5 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all placeholder:text-foreground/30 font-medium"
          disabled={isSearching}
        />
      </form>

      <nav className={`flex-1 space-y-2 ${isCollapsed ? 'w-full' : ''}`}>
        <Link href="/" title="Dashboard" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Home size={18} />
          {!isCollapsed && <span>Dashboard</span>}
        </Link>
        <Link href="/campaigns" title="Campaigns" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Mail size={18} />
          {!isCollapsed && <span>Campaigns</span>}
        </Link>
        <Link href="/advance-campaigns" title="Advanced Campaigns" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <LayoutTemplate size={18} />
          {!isCollapsed && <span>Adv. Campaigns</span>}
        </Link>
        <Link href="/analytics" title="Centralized Analytics" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <BarChart3 size={18} />
          {!isCollapsed && <span>Analytics</span>}
        </Link>
        <Link href="/templates" title="Templates" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <FileText size={18} />
          {!isCollapsed && <span>Templates</span>}
        </Link>

        <Link href="/directory" title="User Directory" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Users size={18} />
          {!isCollapsed && <span>User Directory</span>}
        </Link>
        <Link href="/contacts" title="Contacts" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Users size={18} />
          {!isCollapsed && <span>Contacts</span>}
        </Link>
        <Link href="/leads" title="Leads Tracker" className={`flex items-center p-2 hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Target size={18} />
          {!isCollapsed && <span>Leads Tracker</span>}
        </Link>

        <Link href="/bounces" title="Bounced Mails" className={`flex items-center p-2 hover:bg-red-600 hover:text-white text-red-500 rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <MailWarning size={18} />
          {!isCollapsed && <span>Bounced Mails</span>}
        </Link>
        <button 
          onClick={apiClient.logout}
          title="Logout" 
          className={`flex items-center p-2 w-full mt-auto hover:bg-hover-bg hover:text-foreground rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </nav>
      </div>
    </>
  );
}
