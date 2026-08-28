'use client';

import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Plus, Search, X, Trash2, LayoutTemplate, Edit } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { EmailTemplate } from '../../types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');
  const [createError, setCreateError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/templates/?limit=10000');
      setTemplates(res.results || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newTemplateName.trim() || !newTemplateSubject.trim()) {
      setCreateError('Please fill in both fields.');
      return;
    }

    try {
      const res = await apiClient.post('/api/v1/templates/', {
        name: newTemplateName,
        subject: newTemplateSubject,
        html_content: '<html><body></body></html>',
        body: '',
      });
      router.push(`/templates/${res.id}/edit`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create template.');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiClient.delete(`/api/v1/templates/${id}/`);
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template.');
    }
  };

  const filteredTemplates = templates.filter(t => {
    const term = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.subject.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutTemplate size={28} />
            Email Templates
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">Design and manage your drag-and-drop email templates.</p>
        </div>
        <div className="flex w-full sm:w-auto">
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2">
            <Plus size={16} />
            <span>Create Template</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center space-x-3 bg-background border border-border rounded-md px-3 py-2 w-full max-w-md">
          <Search size={16} className="text-foreground/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} className="text-foreground/40 hover:text-foreground" />
            </button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="text-sm text-foreground/40 py-12 text-center">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="p-4 relative group flex flex-col justify-between hover:border-foreground/20 transition-colors">
              <button
                onClick={() => handleDeleteTemplate(template.id)}
                className="absolute top-2 right-2 text-foreground/30 hover:text-red-500 transition-all p-2 opacity-50 hover:opacity-100 rounded-md hover:bg-red-500/10"
                title="Delete Template"
              >
                <Trash2 size={16} />
              </button>
              <div>
                <h3 className="font-semibold text-lg pr-8 text-foreground">{template.name}</h3>
                <p className="text-xs text-foreground/50 mt-1 line-clamp-2">Subject: {template.subject}</p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-foreground/40">
                  Last updated: {new Date(template.updated_at).toLocaleDateString()}
                </span>
                <Link href={`/templates/${template.id}/edit`}>
                  <Button variant="outline" className="flex items-center gap-2 py-1 px-3 text-xs">
                    <Edit size={14} />
                    <span>Edit Design</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
          
          {filteredTemplates.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <LayoutTemplate size={48} className="mx-auto text-foreground/20 mb-4" />
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="text-foreground/50 text-sm mt-1">Create your first drag-and-drop template to get started.</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 border border-border bg-background shadow-lg relative">
            <button className="absolute top-4 right-4 text-foreground/50 hover:text-foreground" onClick={() => setShowCreateModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Create New Template</h2>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              {createError && <div className="text-xs text-red-500">{createError}</div>}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. Monthly Newsletter"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Default Subject Line</label>
                <input
                  type="text"
                  value={newTemplateSubject}
                  onChange={e => setNewTemplateSubject(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="e.g. You won't want to miss this..."
                  required
                />
              </div>
              <Button type="submit" className="w-full py-2">Create & Design</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
