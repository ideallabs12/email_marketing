'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../services/apiClient';
import { EmailTemplate } from '../../../../types';
import Button from '../../../../components/Button';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// We must import grapesjs css
import 'grapesjs/dist/css/grapes.min.css';

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = React.use(params);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const hasInitialized = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // Load the template
    apiClient.get(`/api/v1/templates/${templateId}/`).then(res => {
      setTemplate(res);
    }).catch(err => {
      console.error('API Error:', err);
      // Only alert if we haven't already loaded the template successfully
      if (!template) {
        alert('Failed to load template: ' + (err.message || 'Network error'));
      }
    });
  }, [templateId]);

  useEffect(() => {
    if (!editorRef.current || !template || editor || hasInitialized.current) return;

    hasInitialized.current = true;
    let e: any = null;

    // Dynamically import to avoid SSR issues with window/document
    Promise.all([
      import('grapesjs'),
      import('grapesjs-preset-newsletter')
    ]).then(([grapesjs, gjsPresetNewsletter]) => {
      const presetPlugin = (gjsPresetNewsletter as any).default?.default || (gjsPresetNewsletter as any).default || gjsPresetNewsletter;

      e = grapesjs.default.init({
        container: editorRef.current as HTMLElement,
        fromElement: false,
        height: '100%',
        width: 'auto',
        storageManager: false, // We'll handle saving manually
        plugins: [presetPlugin],
        pluginsOpts: {
          'gjs-preset-newsletter': {
            // Options for the newsletter plugin
          }
        }
      });

      // Load existing HTML
      if (template.html_content && template.html_content !== '<html><body></body></html>') {
        e.setComponents(template.html_content);
      }

      setEditor(e);
    }).catch(err => {
      console.error('GrapesJS Init Error:', err);
      alert('Failed to initialize editor: ' + (err.message || err));
    });

    return () => {
      if (e) {
        e.destroy();
      }
    };
  }, [template, editor]);

  const handleSave = async () => {
    if (!editor || !template) return;
    setSaving(true);
    
    // grapesjs-preset-newsletter allows getting inline html for emails
    const html = editor.runCommand('gjs-get-inlined-html');
    
    try {
      await apiClient.patch(`/api/v1/templates/${template.id}/`, {
        ...template,
        html_content: html,
      });
      alert('Template saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (!template) {
    return <div className="flex h-screen items-center justify-center -m-8 text-foreground/50">Loading editor...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-8">
      {/* Editor Header */}
      <div className="h-[70px] bg-background border-b border-border flex items-center justify-between px-6 shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/template_builder" className="text-foreground/50 hover:text-foreground transition-colors p-2 rounded-full hover:bg-foreground/5">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight">{template.name}</h1>
            <p className="text-xs text-foreground/50">Subject: {template.subject}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{saving ? 'Saving...' : 'Save Template'}</span>
        </Button>
      </div>

      {/* Editor Container */}
      <div className="flex-grow relative overflow-hidden bg-white h-full min-h-[500px]">
        <div className="absolute inset-0">
          <div ref={editorRef} style={{ height: '100%', width: '100%' }}></div>
        </div>
      </div>
    </div>
  );
}
