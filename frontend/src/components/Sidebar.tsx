'use client';

import Link from 'next/link';
import { Home, Mail, Users, FileText, ChevronLeft, ChevronRight, MailWarning } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`border-r border-border h-screen sticky top-0 p-6 flex flex-col transition-all duration-300 relative ${isCollapsed ? 'w-20 items-center px-4' : 'w-64'}`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)} 
        className="absolute -right-3 top-8 bg-background border border-border rounded-full p-1 hover:bg-foreground/5 z-10 text-foreground"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`text-xl font-bold mb-10 tracking-tight flex items-center h-8 ${isCollapsed ? 'justify-center text-sm' : ''}`}>
        {isCollapsed ? 'EP.' : 'EmailPlatform.'}
      </div>
      <nav className={`flex-1 space-y-2 ${isCollapsed ? 'w-full' : ''}`}>
        <Link href="/" title="Dashboard" className={`flex items-center p-2 hover:bg-foreground hover:text-background rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Home size={18} />
          {!isCollapsed && <span>Dashboard</span>}
        </Link>
        <Link href="/campaigns" title="Campaigns" className={`flex items-center p-2 hover:bg-foreground hover:text-background rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Mail size={18} />
          {!isCollapsed && <span>Campaigns</span>}
        </Link>
        <Link href="/contacts" title="Contacts" className={`flex items-center p-2 hover:bg-foreground hover:text-background rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Users size={18} />
          {!isCollapsed && <span>Contacts</span>}
        </Link>
        <Link href="/templates" title="Templates" className={`flex items-center p-2 hover:bg-foreground hover:text-background rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <FileText size={18} />
          {!isCollapsed && <span>Templates</span>}
        </Link>
        <Link href="/bounces" title="Bounced Mails" className={`flex items-center p-2 hover:bg-red-600 hover:text-white text-red-500 rounded-md transition-colors font-medium ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <MailWarning size={18} />
          {!isCollapsed && <span>Bounced Mails</span>}
        </Link>
      </nav>
    </div>
  );
}
