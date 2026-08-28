'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FileText, Edit } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { EmailTemplate } from '../../types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

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

      {loading ? (
        <div className="text-center py-12 text-foreground/50">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText size={36} className="text-foreground/20 mb-4" />
            <p className="text-sm text-foreground/40">No templates found.</p>
            <p className="text-xs text-foreground/30 mt-1">Run <code className="bg-foreground/5 px-1 py-0.5 rounded">python manage.py load_templates</code> inside the backend container.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col justify-between min-h-[160px]">
              <div>
                <h3 className="font-semibold text-lg line-clamp-1">{template.name}</h3>
                <p className="text-xs text-foreground/50 mt-1 font-medium">Subject:</p>
                <p className="text-sm text-foreground/60 line-clamp-2 mt-0.5">{template.subject}</p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-foreground/40">
                  Last updated {new Date(template.updated_at).toLocaleDateString()}
                </span>
                <Link href={`/templates/${template.id}/edit`}>
                  <Button variant="outline" className="py-1 px-3 text-xs">
                    <Edit size={12} />
                    <span>Edit Content</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
