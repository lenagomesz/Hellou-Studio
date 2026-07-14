'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DripCampaign {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  enabled: boolean;
  break_on_purchase: boolean;
  total_enrolled: number;
  total_active: number;
  total_completed: number;
  created_at: string;
}

interface DripStep {
  delay_days: number;
  subject: string;
  body_html: string;
}

export default function DripCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'signup',
    break_on_purchase: true,
    steps: [
      { delay_days: 0, subject: 'Bem-vindo(a)!', body_html: '<h1>Ola {customer_name}!</h1><p>Bem-vindo(a) a helloustudio!</p>' },
      { delay_days: 3, subject: 'Produto em destaque', body_html: '<h1>Ola {customer_name}!</h1><p>Veja nosso produto mais popular...</p>' },
      { delay_days: 7, subject: 'O que dizem nossos clientes', body_html: '<h1>Social proof</h1><p>Veja o que nossos clientes acharam...</p>' },
      { delay_days: 14, subject: 'Sentimos sua falta!', body_html: '<h1>Volte!</h1><p>Temos um desconto especial para voce...</p>' },
    ] as DripStep[],
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const res = await fetch('/api/email-marketing/drip');
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setCampaigns([]);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/email-marketing/drip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      fetchCampaigns();
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/email-marketing/drip/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, enabled } : c));
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta drip campaign?')) return;
    await fetch(`/api/email-marketing/drip/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  }

  function addStep() {
    const lastDay = form.steps.length > 0 ? form.steps[form.steps.length - 1].delay_days + 3 : 0;
    setForm(p => ({
      ...p,
      steps: [...p.steps, { delay_days: lastDay, subject: '', body_html: '' }],
    }));
  }

  function removeStep(index: number) {
    setForm(p => ({ ...p, steps: p.steps.filter((_, i) => i !== index) }));
  }

  function updateStep(index: number, field: keyof DripStep, value: string | number) {
    setForm(p => ({
      ...p,
      steps: p.steps.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Drip Campaigns</h1>
            <p className="text-sm text-gray-500">Series de emails automaticos com delay entre cada etapa.</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Nova drip campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-400">Nenhuma drip campaign configurada.</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-pink-500">
            Criar primeira sequencia
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  {campaign.description && <p className="text-sm text-gray-500">{campaign.description}</p>}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>Trigger: {campaign.trigger_type}</span>
                    <span>{campaign.total_enrolled} inscritos</span>
                    <span>{campaign.total_active} ativos</span>
                    <span>{campaign.total_completed} completaram</span>
                    {campaign.break_on_purchase && (
                      <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-600 dark:bg-yellow-900/20">
                        Remove se comprar
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={campaign.enabled}
                      onChange={e => toggleEnabled(campaign.id, e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
                  </label>
                  <button onClick={() => handleDelete(campaign.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Nova Drip Campaign</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Trigger</label>
                  <select
                    value={form.trigger_type}
                    onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="signup">Novo cadastro</option>
                    <option value="first_purchase">Primeira compra</option>
                    <option value="inactivity">Inatividade</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.break_on_purchase}
                  onChange={e => setForm(p => ({ ...p, break_on_purchase: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Remover usuário da sequencia se fizer uma compra
              </label>

              {/* Steps */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">Etapas ({form.steps.length})</h4>
                  <button type="button" onClick={addStep} className="text-sm text-pink-500 hover:text-pink-600">
                    + Adicionar etapa
                  </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {form.steps.map((step, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">Email {i + 1} (Dia {step.delay_days})</span>
                        {form.steps.length > 1 && (
                          <button type="button" onClick={() => removeStep(i)} className="text-xs text-red-400">Remover</button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <input
                            type="number"
                            min="0"
                            value={step.delay_days}
                            onChange={e => updateStep(i, 'delay_days', parseInt(e.target.value) || 0)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            placeholder="Dia"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={step.subject}
                            onChange={e => updateStep(i, 'subject', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            placeholder="Assunto"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white">
                  Criar drip campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
