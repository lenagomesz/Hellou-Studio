'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, Loader2, Users } from 'lucide-react';
import { ProductCategorySelect } from '@/components/admin/ProductCategorySelect';

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    preview_text: '',
    body_html: '',
    segment_type: 'all',
    segment_criteria: {} as Record<string, unknown>,
    scheduled_at: '',
    cta_text: '',
    cta_url: '',
    cta_color: '#ec4899',
    ab_test_enabled: false,
    ab_variant_b_subject: '',
    ab_variant_b_body_html: '',
    ab_split_percent: 50,
  });
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function updateCriteria(field: string, value: unknown) {
    setForm((current) => ({ ...current, segment_criteria: { ...current.segment_criteria, [field]: value } }));
  }

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      setEstimating(true);
      const response = await fetch('/api/email-marketing/segments/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_type: form.segment_type, segment_criteria: form.segment_criteria }),
      });
      const data = await response.json().catch(() => ({})) as { count?: number };
      setAudienceCount(response.ok ? data.count ?? 0 : null);
      setEstimating(false);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [form.segment_criteria, form.segment_type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Erro ao criar campanha');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-6">
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
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
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
                placeholder="Ex.: {customer_name}, 20% OFF só hoje!"
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Segmentação</h2>
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
                <option value="recency">Por recência de compra</option>
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
          {form.segment_type === 'category' && (
            <div className="mt-4"><label className="mb-1 block text-sm font-medium text-gray-700">Categoria comprada</label><ProductCategorySelect value={String(form.segment_criteria.category ?? '')} onChange={(value) => updateCriteria('category', value)} allowEmpty emptyLabel="Selecione uma categoria" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm" /></div>
          )}
          {form.segment_type === 'recency' && (
            <label className="mt-4 block text-sm font-medium text-gray-700">Comprou nos últimos dias<input type="number" min="1" value={Number(form.segment_criteria.days ?? 30)} onChange={(event) => updateCriteria('days', Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5" /></label>
          )}
          {form.segment_type === 'rfm' && (
            <label className="mt-4 block text-sm font-medium text-gray-700">Segmento RFM<select value={String(form.segment_criteria.segment ?? '')} onChange={(event) => updateCriteria('segment', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5"><option value="">Selecione</option><option value="champion">Campeões</option><option value="loyal">Leais</option><option value="potential">Potenciais</option><option value="at_risk">Em risco</option><option value="lost">Perdidos</option></select></label>
          )}
          {form.segment_type === 'custom' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium text-gray-700">Mínimo de pedidos<input type="number" min="0" value={Number(form.segment_criteria.minOrders ?? 0)} onChange={(event) => updateCriteria('minOrders', Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5" /></label><label className="text-sm font-medium text-gray-700">Gasto mínimo (R$)<input type="number" min="0" step="0.01" value={Number(form.segment_criteria.minSpent ?? 0)} onChange={(event) => updateCriteria('minSpent', Number(event.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5" /></label><label className="flex items-center gap-2 self-end rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700"><input type="checkbox" checked={form.segment_criteria.vipOnly === true} onChange={(event) => updateCriteria('vipOnly', event.target.checked)} />Somente VIP</label></div>
          )}
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-pink-50 px-4 py-3 text-sm text-pink-800"><Users className="h-5 w-5" />{estimating ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando público...</> : <><strong>{audienceCount ?? 0}</strong> destinatários com consentimento</>}</div>
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

          </div>
          <aside className="space-y-4 xl:sticky xl:top-24">
            <div className="overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4"><Eye className="h-4 w-4 text-pink-500" /><div><p className="text-sm font-bold text-gray-900">Preview do e-mail</p><p className="text-[11px] text-gray-500">Atualizado enquanto você escreve</p></div></div>
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3"><p className="truncate text-sm font-semibold text-gray-900">{form.subject.replace('{customer_name}', 'Maria') || 'Assunto da campanha'}</p><p className="truncate text-xs text-gray-500">{form.preview_text || 'Texto de pré-visualização'}</p></div>
              <iframe title="Preview da campanha" sandbox="" srcDoc={`<!doctype html><html><body style="font-family:Arial,sans-serif;margin:0;padding:24px;color:#1f2937">${(form.body_html || '<p>O conteúdo do e-mail aparecerá aqui.</p>').replaceAll('{customer_name}', 'Maria')}${form.cta_text && form.cta_url ? `<p style="margin-top:24px"><a href="#" style="display:inline-block;background:${form.cta_color};color:white;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">${form.cta_text}</a></p>` : ''}</body></html>`} className="h-[560px] w-full bg-white" />
            </div>
            <p className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-orange-800">Antes de enviar, confira o público estimado, os links e o conteúdo nas versões desktop e celular.</p>
          </aside>
        </div>

        {/* Submit */}
        <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur">
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
