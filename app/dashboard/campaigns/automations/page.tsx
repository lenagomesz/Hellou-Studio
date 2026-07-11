'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  delay_minutes: number;
  enabled: boolean;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

const triggerLabels: Record<string, string> = {
  new_customer: 'Novo cliente cadastrado',
  no_purchase_7d: 'Sem compra ha 7 dias',
  purchased_product: 'Comprou produto X',
  birthday: 'Aniversario do cliente',
  high_ltv: 'LTV alto (VIP)',
  cart_abandoned: 'Carrinho abandonado',
};

const triggerIcons: Record<string, string> = {
  new_customer: '👋',
  no_purchase_7d: '⏰',
  purchased_product: '🛒',
  birthday: '🎂',
  high_ltv: '⭐',
  cart_abandoned: '🛍️',
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'new_customer',
    delay_minutes: 60,
    subject: '',
    body_html: '',
  });

  useEffect(() => {
    fetchAutomations();
  }, []);

  async function fetchAutomations() {
    setLoading(true);
    try {
      const res = await fetch('/api/email-marketing/automations');
      const data = await res.json();
      setAutomations(Array.isArray(data) ? data : []);
    } catch {
      setAutomations([]);
    }
    setLoading(false);
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/email-marketing/automations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta automacao?')) return;
    await fetch(`/api/email-marketing/automations/${id}`, { method: 'DELETE' });
    fetchAutomations();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/email-marketing/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ name: '', trigger_type: 'new_customer', delay_minutes: 60, subject: '', body_html: '' });
      fetchAutomations();
    }
  }

  function formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automacoes</h1>
            <p className="text-sm text-gray-500">Workflows automaticos de email baseados em triggers.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Nova automacao
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        </div>
      ) : automations.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-400">Nenhuma automacao configurada.</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-pink-500 hover:text-pink-600">
            Criar primeira automacao
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map(automation => (
            <div key={automation.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-lg dark:bg-gray-800">
                    {triggerIcons[automation.trigger_type] || '⚡'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{automation.name}</h3>
                    <p className="text-sm text-gray-500">
                      {triggerLabels[automation.trigger_type] || automation.trigger_type} → Delay: {formatDelay(automation.delay_minutes)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-gray-400">
                    <p>{automation.total_sent} enviados</p>
                    <p>{automation.total_opened} abertos</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={automation.enabled}
                      onChange={e => toggleEnabled(automation.id, e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
                  </label>
                  <button onClick={() => handleDelete(automation.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Nova automacao</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Ex: Welcome series"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Trigger</label>
                  <select
                    value={form.trigger_type}
                    onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.entries(triggerLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Delay (minutos)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.delay_minutes}
                    onChange={e => setForm(p => ({ ...p, delay_minutes: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-400">{formatDelay(form.delay_minutes)} apos o trigger</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assunto do email</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Assunto do email automatico"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Corpo HTML</label>
                <textarea
                  rows={6}
                  value={form.body_html}
                  onChange={e => setForm(p => ({ ...p, body_html: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="<h1>Ola {customer_name}!</h1>"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white">
                  Criar automacao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
