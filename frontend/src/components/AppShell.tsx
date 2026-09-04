'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isPublicPage = pathname.startsWith('/public/');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoginPage || isPublicPage) {
    return <div className="min-h-screen w-full bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground selection:bg-foreground selection:text-background w-full">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-20">
        <div className="text-xl font-bold tracking-tight">EmailPlatform.</div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -mr-2 text-foreground/80 hover:text-foreground"
        >
          <Menu size={24} />
        </button>
      </div>

      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
