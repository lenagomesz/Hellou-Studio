'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, Loader2 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  body_html: string;
  status: string;
  segment_type: string;
  total_recipients: number;
  ab_test_enabled: boolean;
  ab_variant_b_subject: string | null;
  ab_winner: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_color: string;
  created_at: string;
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [minimumSchedule] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60_000).toISOString()));

  useEffect(() => {
    const controller = new AbortController();
    async function loadCampaign() {
      try {
        const response = await fetch(`/api/email-marketing/campaigns/${id}`, { signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a campanha.');
        setCampaign(data);
        setScheduleValue(toLocalDateTimeInput(data.scheduled_at));
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setPageError(cause instanceof Error ? cause.message : 'Não foi possível carregar a campanha.');
      } finally {
        setLoading(false);
      }
    }
    void loadCampaign();
    return () => controller.abort();
  }, [id]);

  async function saveSchedule(scheduledAt: string | null) {
    setScheduleSaving(true);
    setPageError('');
    try {
      const response = await fetch(`/api/email-marketing/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar o agendamento.');
      setCampaign(data);
      setScheduleValue(toLocalDateTimeInput(data.scheduled_at));
      setScheduleEditing(false);
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o agendamento.');
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleSend() {
    if (!confirm('Enviar campanha agora para todos os destinatários do segmento?')) return;
    setSending(true);
    try {
      const res = await fetch(`/api/email-marketing/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Campanha enviada! ${data.sent}/${data.total} e-mails enviados.`);
        router.push(`/dashboard/campaigns/${id}/analytics`);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDecideAB() {
    const res = await fetch(`/api/email-marketing/campaigns/${id}/ab-test`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(`Vencedor: Variante ${data.winner}. Melhoria de ${data.improvement}% em aberturas.`);
      window.location.reload();
    } else {
      alert(`Erro: ${data.error}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (!campaign) {
    return <p className="text-center text-gray-400">Campanha não encontrada.</p>;
  }

  return (
    <div className="w-full space-y-6">
      {pageError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{pageError}</div>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
            <p className="text-sm text-gray-500">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'sent' && (
            <Link href={`/dashboard/campaigns/${id}/analytics`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              Ver analytics
            </Link>
          )}
          {campaign.status === 'draft' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar agora'}
            </button>
          )}
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <button type="button" onClick={() => setScheduleEditing(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-pink-200 hover:text-pink-600 dark:border-gray-700 dark:text-gray-200">
              <CalendarClock className="h-4 w-4" /> Editar agendamento
            </button>
          )}
        </div>
      </div>

      {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:to-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><CalendarClock className="h-5 w-5" /><h2 className="font-bold">Agendamento da campanha</h2></div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{campaign.scheduled_at ? `Programada para ${new Date(campaign.scheduled_at).toLocaleString('pt-BR')}` : 'Esta campanha está salva como rascunho.'}</p>
            </div>
            {scheduleEditing ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-96">
                <label htmlFor="campaign-schedule" className="text-xs font-bold uppercase tracking-wide text-gray-500">Nova data e hora</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="campaign-schedule" type="datetime-local" min={minimumSchedule} value={scheduleValue} onChange={(event) => setScheduleValue(event.target.value)} className="rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                  <button type="button" disabled={scheduleSaving || !scheduleValue} onClick={() => void saveSchedule(scheduleValue)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{scheduleSaving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</button>
                  <button type="button" disabled={scheduleSaving} onClick={() => { setScheduleEditing(false); setScheduleValue(toLocalDateTimeInput(campaign.scheduled_at)); }} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-white">Cancelar</button>
                </div>
                {campaign.scheduled_at && <button type="button" disabled={scheduleSaving} onClick={() => void saveSchedule(null)} className="self-start text-xs font-bold text-red-600 hover:text-red-700">Remover agendamento e voltar para rascunho</button>}
                <p className="text-xs text-gray-500">Horário local: Brasília ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
              </div>
            ) : (
              <button type="button" onClick={() => setScheduleEditing(true)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 hover:ring-blue-200 dark:bg-gray-800 dark:text-blue-300 dark:ring-gray-700">{campaign.scheduled_at ? 'Reagendar' : 'Agendar envio'}</button>
            )}
          </div>
        </section>
      )}

      {/* Status card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Status</p>
          <p className="mt-1 text-lg font-bold capitalize text-gray-900 dark:text-white">{campaign.status}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Destinatários</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{campaign.total_recipients}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase text-gray-400">Segmento</p>
          <p className="mt-1 text-lg font-bold capitalize text-gray-900 dark:text-white">{campaign.segment_type}</p>
        </div>
      </div>

      {/* A/B Test Results */}
      {campaign.ab_test_enabled && (
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 dark:border-purple-900/30 dark:bg-purple-900/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-200">Teste A/B</h2>
            {campaign.status === 'sent' && !campaign.ab_winner && (
              <button
                onClick={handleDecideAB}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Decidir vencedor
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className={`rounded-lg border p-4 ${campaign.ab_winner === 'A' ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Variante A {campaign.ab_winner === 'A' && '(Vencedor)'}</p>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{campaign.subject}</p>
            </div>
            <div className={`rounded-lg border p-4 ${campaign.ab_winner === 'B' ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Variante B {campaign.ab_winner === 'B' && '(Vencedor)'}</p>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{campaign.ab_variant_b_subject || '(mesmo corpo, assunto diferente)'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Preview do email</h2>
        </div>
        <div className="p-6">
          <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-700">
              <p className="text-xs text-gray-400">De: helloustudio</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{campaign.subject}</p>
              {campaign.preview_text && <p className="text-xs text-gray-400">{campaign.preview_text}</p>}
            </div>
            <iframe
              title="Prévia segura do e-mail"
              sandbox=""
              srcDoc={campaign.body_html}
              className="h-[520px] w-full rounded-lg border-0 bg-white"
            />
            {campaign.cta_text && campaign.cta_url && (
              <div className="mt-4">
                <span
                  className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: campaign.cta_color || '#ec4899' }}
                >
                  {campaign.cta_text}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export */}
      {campaign.status === 'sent' && (
        <div className="flex justify-end">
          <a
            href={`/api/email-marketing/export?campaign=${id}`}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            download
          >
            Exportar destinatários (CSV)
          </a>
        </div>
      )}
    </div>
  );
}
