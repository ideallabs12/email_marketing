'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import { ArrowLeft, FileDown, Image as ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '../../../../services/apiClient';
import { EmailTemplate } from '../../../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [exporting, setExporting] = useState<'jpeg' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('view');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testFirstName, setTestFirstName] = useState('Sarah');
  const [testLastName, setTestLastName] = useState('Mitchell');
  const [testEmail, setTestEmail] = useState('sarah.mitchell@example.com');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      first_name: testFirstName || 'Sarah',
      last_name: testLastName || 'Mitchell',
      email: testEmail || 'sarah.mitchell@example.com',
      subject: subject,
    };

    for (const [key, val] of Object.entries(context)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      html = html.replace(regex, val);
    }

    html = html.replace(/{{\s*.*?\s*}}/g, '');

    return html;
  };

  const handleDownload = async (format: 'jpeg' | 'pdf') => {
    if (!template || exporting) return;
    setExporting(format);

    try {
      if (viewMode === 'edit') {
        setViewMode('view');
        await new Promise((r) => setTimeout(r, 350));
      }

      const iframe = iframeRef.current;
      if (!iframe) {
        throw new Error('Preview iframe not found');
      }

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !doc.body) {
        throw new Error('Preview document body not accessible');
      }

      // Wait for any web fonts inside the iframe to finish loading
      try {
        if (doc.fonts) {
          await doc.fonts.ready;
        }
      } catch {
        // continue
      }

      await new Promise((r) => setTimeout(r, 100));

      const scale = 2; // High-resolution retina quality
      const emailCanvas = await html2canvas(doc.body, {
        useCORS: true,
        allowTaint: true,
        scale,
        backgroundColor: '#F3F4F6',
        logging: false,
        windowWidth: doc.documentElement.scrollWidth || (previewDevice === 'desktop' ? 640 : 390),
        windowHeight: doc.documentElement.scrollHeight || 1200,
        onclone: (clonedDoc) => {
          // Neutralize -webkit-background-clip: text which canvas renderers draw as solid opaque blocks
          const elements = clonedDoc.querySelectorAll<HTMLElement>('*');
          elements.forEach((el) => {
            const styleAttr = el.getAttribute('style') || '';
            if (
              styleAttr.includes('background-clip') ||
              styleAttr.includes('-webkit-background-clip') ||
              styleAttr.includes('-webkit-text-fill-color')
            ) {
              const fallbackColor = el.style.color || '#FFFFFF';
              el.style.setProperty('-webkit-text-fill-color', fallbackColor, 'important');
              el.style.setProperty('color', fallbackColor, 'important');
              el.style.setProperty('-webkit-background-clip', 'border-box', 'important');
              el.style.setProperty('background-clip', 'border-box', 'important');
              el.style.setProperty('background-image', 'none', 'important');
            }
          });
        },
      });

      // Combine with clean email header (Subject only)
      const headerHeight = 44 * scale;
      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = emailCanvas.width;
      combinedCanvas.height = emailCanvas.height + headerHeight;
      const ctx = combinedCanvas.getContext('2d');

      let finalCanvas = emailCanvas;
      if (ctx) {
        // Draw header background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, combinedCanvas.width, headerHeight);

        // Header bottom border
        ctx.strokeStyle = '#e2e4e7';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(0, headerHeight);
        ctx.lineTo(combinedCanvas.width, headerHeight);
        ctx.stroke();

        // Subject text
        ctx.fillStyle = '#4B5563';
        ctx.font = `bold ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText('Subject: ', 16 * scale, 27 * scale);

        const prefixWidth = ctx.measureText('Subject: ').width;
        ctx.fillStyle = '#111827';
        ctx.font = `600 ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const subjText = subject || '(No Subject)';
        ctx.fillText(subjText, 16 * scale + prefixWidth, 27 * scale);

        // Draw email body canvas below header
        ctx.drawImage(emailCanvas, 0, headerHeight);
        finalCanvas = combinedCanvas;
      }

      const cleanName = (template.name || 'template').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filename = `${cleanName}_${previewDevice}`;

      if (format === 'jpeg') {
        const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `${filename}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const imgData = finalCanvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = finalCanvas.width / scale;
        const pdfHeight = finalCanvas.height / scale;

        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [pdfWidth, pdfHeight],
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
      }
    } catch (err) {
      console.error('Failed to export template:', err);
      alert('Could not generate export. Please make sure the template preview is visible.');
    } finally {
      setExporting(null);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/templates" className="text-foreground/50 hover:text-foreground">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
            <p className="text-foreground/50 mt-1 text-sm">{template.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownload('jpeg')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-background hover:bg-foreground/5 transition-all text-foreground shadow-sm disabled:opacity-50 cursor-pointer"
            title="Download high-resolution JPEG"
          >
            {exporting === 'jpeg' ? (
              <Loader2 size={15} className="animate-spin text-primary" />
            ) : (
              <ImageIcon size={15} className="text-primary" />
            )}
            <span>{exporting === 'jpeg' ? 'Exporting JPEG...' : 'Download JPEG'}</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleDownload('pdf')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md border border-border bg-background hover:bg-foreground/5 transition-all text-foreground shadow-sm disabled:opacity-50 cursor-pointer"
            title="Download PDF document"
          >
            {exporting === 'pdf' ? (
              <Loader2 size={15} className="animate-spin text-primary" />
            ) : (
              <FileDown size={15} className="text-primary" />
            )}
            <span>{exporting === 'pdf' ? 'Exporting PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setViewMode('edit')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            viewMode === 'edit'
              ? 'bg-foreground text-background'
              : 'text-foreground/70 hover:bg-foreground/10'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setViewMode('view')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
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
                      className="text-[11px] px-2.5 py-1.5 bg-foreground/5 hover:bg-foreground/10 border border-border rounded font-medium text-foreground/70 transition-colors flex items-center cursor-pointer"
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload('jpeg')}
                  disabled={exporting !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-foreground/5 transition-all text-foreground shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Download high-resolution JPEG of current view"
                >
                  {exporting === 'jpeg' ? <Loader2 size={14} className="animate-spin text-primary" /> : <ImageIcon size={14} className="text-primary" />}
                  {exporting === 'jpeg' ? 'Generating JPEG...' : 'Download JPEG'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('pdf')}
                  disabled={exporting !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-background hover:bg-foreground/5 transition-all text-foreground shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Download PDF document of current view"
                >
                  {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin text-primary" /> : <FileDown size={14} className="text-primary" />}
                  {exporting === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>

              <div className="flex items-center gap-2 bg-foreground/5 border border-border rounded-lg p-1">
                {(['desktop', 'mobile'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setPreviewDevice(d)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
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
                    padding: '12px 16px',
                    fontSize: previewDevice === 'mobile' ? 12 : 13,
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#4B5563', marginRight: 6 }}>Subject:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {subject || '(No Subject)'}
                  </span>
                </div>

                <iframe
                  ref={iframeRef}
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
