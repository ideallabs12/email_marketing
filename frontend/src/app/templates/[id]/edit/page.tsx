'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../services/apiClient';
import { EmailTemplate } from '../../../../types';

interface EditTemplateProps {
  params: Promise<{ id: string }>;
}

export default function EditTemplatePage({ params }: EditTemplateProps) {
  const { id } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('view');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testFirstName, setTestFirstName] = useState('Nithin');
  const [testLastName, setTestLastName] = useState('Varma');
  const [testEmail, setTestEmail] = useState('nithin.varma@example.com');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await apiClient.get(`/api/v1/templates/${id}/`);
        setTemplate(res);
        setSubject(res.subject);
        setBody(res.body);
        if (res.variables) {
          setTemplateVariables(res.variables);
        }
      } catch (err) {
        console.error('Failed to load template:', err);
        setError('Failed to load template.');
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [id]);

  useEffect(() => {
    if (!template) return;
    
    const allText = template.html_content + ' ' + body + ' ' + subject;
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    const matches = Array.from(allText.matchAll(regex));
    
    const standardVars = ['first_name', 'last_name', 'email', 'body', 'subject'];
    const foundVars = new Set<string>();
    
    matches.forEach(match => {
      const varName = match[1];
      if (!standardVars.includes(varName)) {
        foundVars.add(varName);
      }
    });
    
    setDetectedVariables(Array.from(foundVars));
  }, [template, body, subject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/templates');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await apiClient.patch(`/api/v1/templates/${id}/`, {
        subject,
        body,
        variables: templateVariables,
      });
      setSuccess('Template saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save template:', err);
      setError('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const getPreviewHtml = () => {
    if (!template) return '';
    let html = template.html_content;
    
    if (html.includes('{{ body }}')) {
      html = html.replace('{{ body }}', body);
    } else {
      html = html + body;
    }

    const context: Record<string, string> = {
      ...templateVariables,
      first_name: testFirstName || 'Nithin',
      last_name: testLastName || 'Varma',
      email: testEmail || 'nithin.varma@example.com',
      subject: subject,
    };

    for (const [key, val] of Object.entries(context)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      html = html.replace(regex, val);
    }

    html = html.replace(/{{\s*.*?\s*}}/g, '');

    return html;
  };

  if (loading) {
    return <div className="text-center py-12 text-foreground/50">Loading template editor...</div>;
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground/50">Template not found.</p>
        <Link href="/templates" className="mt-4 inline-block underline">Back to templates</Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/templates" className="text-foreground/50 hover:text-foreground">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
          <p className="text-foreground/50 mt-1 text-sm">{template.name}</p>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setViewMode('edit')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'edit'
              ? 'bg-foreground text-background'
              : 'text-foreground/70 hover:bg-foreground/10'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setViewMode('view')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'view'
              ? 'bg-foreground text-background'
              : 'text-foreground/70 hover:bg-foreground/10'
          }`}
        >
          View
        </button>
      </div>

      <div className="flex-1">
        {viewMode === 'edit' ? (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Card>
              <form onSubmit={handleSave} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-950/20 text-red-500 text-sm rounded-md font-medium border border-red-900/30">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-950/20 text-green-500 text-sm rounded-md font-medium border border-green-900/30">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
                    placeholder="Subject Line"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                      Email Body Content (HTML allowed)
                    </label>
                    <span className="text-[10px] text-foreground/40 font-medium">
                      Placeholders: {'{{ first_name }}'}, {'{{ last_name }}'}, {'{{ email }}'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `\n<br><br>\n<div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; margin-top: 30px;">\n  <h3 style="margin-top: 0; color: #0f172a; font-size: 18px;">Contact Us</h3>\n  <p style="color: #475569; font-size: 14px; margin-bottom: 8px;">Have questions? We're here to help.</p>\n  <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:global@signaturetalks.org" style="color: #2563eb; text-decoration: none;">global@signaturetalks.org</a></p>\n  <p style="margin: 4px 0; font-size: 14px;"><strong>Website:</strong> <a href="https://signaturetalks.org" style="color: #2563eb; text-decoration: none;">signaturetalks.org</a></p>\n</div>\n`;
                        setBody(prev => prev + snippet);
                      }}
                      className="text-[11px] px-2.5 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-border rounded font-medium text-foreground/70 transition-colors flex items-center"
                    >
                      + Add Contact Us Section
                    </button>
                  </div>

                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={14}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono bg-background text-foreground focus:outline-none focus:border-foreground transition-colors resize-y"
                    placeholder="Dear {{ first_name }}, ..."
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Saving changes...' : 'Save Template'}
                  </Button>
                </div>
              </form>
            </Card>
            
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-4 pb-2 border-b border-border">
                Test Data (Preview Variables)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                    {`{{ first_name }}`}
                  </label>
                  <input
                    type="text"
                    value={testFirstName}
                    onChange={(e) => setTestFirstName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                    {`{{ last_name }}`}
                  </label>
                  <input
                    type="text"
                    value={testLastName}
                    onChange={(e) => setTestLastName(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                    {`{{ email }}`}
                  </label>
                  <input
                    type="text"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
              </div>
            </Card>

            {detectedVariables.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-4 pb-2 border-b border-border">
                  Template Variables
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detectedVariables.map(varName => (
                    <div key={varName} className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
                        {`{{ ${varName} }}`}
                      </label>
                      <input
                        type="text"
                        value={templateVariables[varName] || ''}
                        onChange={(e) => setTemplateVariables({...templateVariables, [varName]: e.target.value})}
                        className="w-full border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
                        placeholder={`Value for ${varName}`}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            <div className="p-4 border border-border rounded-md text-xs text-foreground/50 bg-foreground/5">
              <span className="font-semibold block mb-1">Theme & Design Locked</span>
              The header, fonts, backgrounds, colors and email layout footer are set in code. Exposing only the subject and message body guarantees perfect email rendering.
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-[600px] pb-12">
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2 bg-foreground/5 border border-border rounded-lg p-1">
                {(['desktop', 'mobile'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setPreviewDevice(d)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      previewDevice === d
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-foreground hover:bg-foreground/10 opacity-70'
                    }`}
                  >
                    {d === 'desktop' ? '🖥  Desktop' : '📱 Mobile'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#e8eaed] flex justify-center items-start rounded-xl border border-border p-8">
              <div
                style={{
                  width: previewDevice === 'desktop' ? 640 : 390,
                  minWidth: previewDevice === 'desktop' ? 640 : 390,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
                  borderRadius: previewDevice === 'desktop' ? 8 : 36,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#fff',
                  border: previewDevice === 'mobile' ? '8px solid #1a1a2e' : '1px solid #ccc',
                  transition: 'all 0.3s ease',
                }}
              >
                {previewDevice === 'mobile' && (
                  <div
                    style={{
                      height: 24, background: '#1a1a2e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 60, height: 8, background: '#333', borderRadius: 4 }} />
                  </div>
                )}

                <div
                  style={{
                    background: '#f8f9fa',
                    borderBottom: '1px solid #e2e4e7',
                    padding: '10px 16px',
                    fontSize: previewDevice === 'mobile' ? 11 : 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#111', marginBottom: 2 }}>
                    {subject || '(No Subject)'}
                  </div>
                  <div style={{ color: '#666' }}>
                    To: {testFirstName} {testLastName} &lt;{testEmail}&gt;
                  </div>
                </div>

                <iframe
                  title="Template Preview"
                  srcDoc={getPreviewHtml()}
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentWindow) {
                      const doc = iframe.contentWindow.document;
                      const updateHeight = () => {
                        iframe.style.height = doc.documentElement.scrollHeight + 'px';
                      };
                      updateHeight();
                      if (typeof ResizeObserver !== 'undefined') {
                        const observer = new ResizeObserver(updateHeight);
                        if (doc.body) {
                          observer.observe(doc.body);
                        }
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: previewDevice === 'desktop' ? 680 : 600,
                    border: 'none',
                    display: 'block',
                    background: '#fff',
                  }}
                />

                {previewDevice === 'mobile' && (
                  <div
                    style={{
                      height: 24, background: '#1a1a2e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 80, height: 4, background: '#555', borderRadius: 2 }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
