'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FileText, Edit, Folder, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { EmailTemplate } from '../../types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'INVITE' | 'FOLLOWUP' | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await apiClient.get('/api/v1/templates/');
        setTemplates(res.results || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  const inviteTemplates = templates.filter(t => t.name.toLowerCase().includes('invite'));
  const followupTemplates = templates.filter(t => t.name.toLowerCase().includes('followup'));

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-12 text-foreground/50">Loading templates...</div>;
    }

    if (templates.length === 0) {
      return (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText size={36} className="text-foreground/20 mb-4" />
            <p className="text-sm text-foreground/40">No templates found.</p>
            <p className="text-xs text-foreground/30 mt-1">Run <code className="bg-foreground/5 px-1 py-0.5 rounded">python manage.py load_templates</code> inside the backend container.</p>
          </div>
        </Card>
      );
    }

    if (!selectedCategory) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card 
            className="flex flex-col items-center justify-center py-16 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedCategory('INVITE')}
          >
            <Folder size={48} className="text-primary mb-4" />
            <h3 className="font-bold text-xl">Invite Templates</h3>
            <p className="text-sm text-foreground/50 mt-2">{inviteTemplates.length} templates</p>
          </Card>
          
          <Card 
            className="flex flex-col items-center justify-center py-16 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setSelectedCategory('FOLLOWUP')}
          >
            <Folder size={48} className="text-primary mb-4" />
            <h3 className="font-bold text-xl">Follow-up Templates</h3>
            <p className="text-sm text-foreground/50 mt-2">{followupTemplates.length} templates</p>
          </Card>
        </div>
      );
    }

    const currentTemplates = selectedCategory === 'INVITE' ? inviteTemplates : followupTemplates;
    const categoryTitle = selectedCategory === 'INVITE' ? 'Invite Templates' : 'Follow-up Templates';

    return (
      <>
        <div className="mb-6 flex items-center space-x-4">
          <Button variant="outline" className="py-1.5 px-3" onClick={() => setSelectedCategory(null)}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Folders
          </Button>
          <h2 className="text-xl font-semibold">{categoryTitle}</h2>
        </div>
        
        {currentTemplates.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-foreground/40">No templates found in this category.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTemplates.map((template) => (
              <Link key={template.id} href={`/templates/${template.id}/edit`} className="block group">
                <Card className="flex flex-col justify-between min-h-[160px] cursor-pointer transition-colors group-hover:border-primary/50 group-hover:shadow-sm">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{template.name}</h3>
                    <p className="text-xs text-foreground/50 mt-1 font-medium">Subject:</p>
                    <p className="text-sm text-foreground/60 line-clamp-2 mt-0.5">{template.subject}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs text-foreground/40">
                      Last updated {new Date(template.updated_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit Template &rarr;
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-foreground/50 mt-1 text-sm">Manage email layouts and templates loaded from code.</p>
        </div>
        <div className="text-xs text-foreground/40 border border-border px-3 py-1.5 rounded-md font-medium w-fit">
          Load new via: <code className="bg-foreground/5 px-1 py-0.5 rounded">load_templates</code>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
