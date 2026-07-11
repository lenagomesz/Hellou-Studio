'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Template {
  id?: string;
  name: string;
  slug: string;
  subject: string;
  category: string;
  variables: string[];
  preview_text: string;
  body_html: string;
  is_system?: boolean;
}

const categoryLabels: Record<string, string> = {
  welcome: 'Boas-vindas',
  abandoned_cart: 'Carrinho abandonado',
  order_confirmation: 'Confirmacao de pedido',
  shipping: 'Envio',
  reactivation: 'Reativacao',
  promotion: 'Promocao',
  newsletter: 'Newsletter',
  birthday: 'Aniversario',
  custom: 'Customizado',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<{ custom: Template[]; prebuilt: Template[] }>({ custom: [], prebuilt: [] });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    slug: '',
    subject: '',
    body_html: '',
    category: 'custom',
    preview_text: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/email-marketing/templates?prebuilt=true');
      const data = await res.json();
      setTemplates(data);
    } catch {
      setTemplates({ custom: [], prebuilt: [] });
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/email-marketing/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTemplate,
        variables: newTemplate.body_html.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) || [],
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewTemplate({ name: '', slug: '', subject: '', body_html: '', category: 'custom', preview_text: '' });
      fetchTemplates();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este template?')) return;
    await fetch(`/api/email-marketing/templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
            <p className="text-sm text-gray-500">Templates pre-construidos e customizados.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Pre-built */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Templates pre-construidos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.prebuilt.map(t => (
                <div key={t.slug} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                      {categoryLabels[t.category] || t.category}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{t.subject}</p>
                  <p className="mt-2 text-xs text-gray-400">Variaveis: {t.variables.join(', ')}</p>
                  <button
                    onClick={() => setPreviewHtml(t.body_html)}
                    className="mt-3 text-xs font-medium text-pink-500 hover:text-pink-600"
                  >
                    Preview
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom */}
          {templates.custom.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Meus templates</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.custom.map(t => (
                  <div key={t.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {categoryLabels[t.category] || t.category}
                      </span>
                      <button onClick={() => handleDelete(t.id!)} className="text-xs text-red-400 hover:text-red-600">Excluir</button>
                    </div>
                    <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{t.subject}</p>
                    <button
                      onClick={() => setPreviewHtml(t.body_html)}
                      className="mt-3 text-xs font-medium text-pink-500 hover:text-pink-600"
                    >
                      Preview
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`rounded-lg px-3 py-1 text-xs ${previewDevice === 'desktop' ? 'bg-pink-100 text-pink-700' : 'text-gray-500'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`rounded-lg px-3 py-1 text-xs ${previewDevice === 'mobile' ? 'bg-pink-100 text-pink-700' : 'text-gray-500'}`}
                >
                  Mobile
                </button>
                <button onClick={() => setPreviewHtml(null)} className="ml-4 text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className={`mx-auto overflow-auto rounded-lg border border-gray-200 bg-white ${previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`} style={{ maxHeight: '70vh' }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Novo template</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                  <input
                    type="text"
                    required
                    value={newTemplate.name}
                    onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
                  <input
                    type="text"
                    required
                    value={newTemplate.slug}
                    onChange={e => setNewTemplate(p => ({ ...p, slug: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="meu-template"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto</label>
                <input
                  type="text"
                  required
                  value={newTemplate.subject}
                  onChange={e => setNewTemplate(p => ({ ...p, subject: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                <select
                  value={newTemplate.category}
                  onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Corpo HTML</label>
                <textarea
                  required
                  rows={8}
                  value={newTemplate.body_html}
                  onChange={e => setNewTemplate(p => ({ ...p, body_html: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white">
                  Salvar template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
