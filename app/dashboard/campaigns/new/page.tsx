'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    preview_text: '',
    body_html: '',
    segment_type: 'all',
    scheduled_at: '',
    cta_text: '',
    cta_url: '',
    cta_color: '#ec4899',
    ab_test_enabled: false,
    ab_variant_b_subject: '',
    ab_variant_b_body_html: '',
    ab_split_percent: 50,
  });

  function update(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at || undefined,
        ab_variant_b_subject: form.ab_test_enabled ? form.ab_variant_b_subject : undefined,
        ab_variant_b_body_html: form.ab_test_enabled ? form.ab_variant_b_body_html : undefined,
      };
      const res = await fetch('/api/email-marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/campaigns/${data.id}`);
      } else {
        alert('Erro ao criar campanha');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/campaigns" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Campanha</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure e envie uma nova campanha de email.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Informações básicas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da campanha</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => update('name', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Ex.: Promoção de Black Friday"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto do email</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => update('subject', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Ex: {customer_name}, 20% OFF so hoje!"
              />
              {form.subject && (
                <p className="mt-1 text-xs text-gray-400">Preview: {form.subject.replace('{customer_name}', 'Maria')}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Preview text (opcional)</label>
              <input
                type="text"
                value={form.preview_text}
                onChange={e => update('preview_text', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Texto que aparece ao lado do assunto na inbox"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Conteúdo do e-mail</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Corpo do email (HTML)
              </label>
              <textarea
                required
                rows={12}
                value={form.body_html}
                onChange={e => update('body_html', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 font-mono text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="<h1>Olá {customer_name}!</h1><p>Conteúdo do e-mail aqui...</p>"
              />
              <p className="mt-1 text-xs text-gray-400">
                Variáveis disponíveis: {'{customer_name}'}, {'{order_total}'}, {'{category_preference}'}, {'{unsubscribe_url}'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">CTA texto</label>
                <input
                  type="text"
                  value={form.cta_text}
                  onChange={e => update('cta_text', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Ver promoção"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">CTA URL</label>
                <input
                  type="url"
                  value={form.cta_url}
                  onChange={e => update('cta_url', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">CTA cor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.cta_color}
                    onChange={e => update('cta_color', e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200"
                  />
                  <span className="text-sm text-gray-500">{form.cta_color}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Segmentation */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Segmentacao</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Segmento alvo</label>
              <select
                value={form.segment_type}
                onChange={e => update('segment_type', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Todos os usuários</option>
                <option value="rfm">Segmento RFM</option>
                <option value="category">Por categoria</option>
                <option value="recency">Por recencia</option>
                <option value="custom">Customizado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Agendamento</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => update('scheduled_at', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">Deixe vazio para enviar como rascunho</p>
            </div>
          </div>
        </div>

        {/* A/B Test */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Teste A/B</h2>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.ab_test_enabled}
                onChange={e => update('ab_test_enabled', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-pink-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
            </label>
          </div>
          {form.ab_test_enabled && (
            <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto variante B</label>
                <input
                  type="text"
                  value={form.ab_variant_b_subject}
                  onChange={e => update('ab_variant_b_subject', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Assunto alternativo para teste"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Corpo variante B (HTML)</label>
                <textarea
                  rows={6}
                  value={form.ab_variant_b_body_html}
                  onChange={e => update('ab_variant_b_body_html', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 font-mono text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="HTML alternativo (deixe vazio para usar o mesmo corpo com assunto diferente)"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Split ({form.ab_split_percent}% A / {100 - form.ab_split_percent}% B)</label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={form.ab_split_percent}
                  onChange={e => update('ab_split_percent', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/campaigns"
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar campanha'}
          </button>
        </div>
      </form>
    </div>
  );
}
