'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Gift, Loader2, MailCheck } from 'lucide-react';

export function EmailMarketingPreference({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [blacklisted, setBlacklisted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/account/email-preferences', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setEnabled(data.enabled === true);
        setBlacklisted(data.blacklisted === true);
      })
      .catch(() => setEnabled(null));
  }, []);

  async function updatePreference(nextEnabled: boolean) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/account/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
      setEnabled(data.enabled === true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (enabled === null || (compact && enabled)) return null;

  if (compact) {
    return (
      <div className="mb-5 rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 to-orange-50 p-4 shadow-sm dark:border-pink-900/40 dark:from-pink-950/30 dark:to-orange-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-600 shadow-sm dark:bg-gray-900"><Gift className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900 dark:text-white">Quer receber cupons e novidades exclusivas?</p><p className="mt-0.5 text-xs leading-5 text-gray-600 dark:text-gray-300">Ative os e-mails da Hellou Studio para não perder descontos e lançamentos. Você pode cancelar quando quiser.</p></div>
          <div className="flex gap-2"><Link href="/account/preferences" className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-bold text-pink-700 dark:border-pink-900 dark:bg-gray-900 dark:text-pink-300">Ver preferências</Link><button type="button" disabled={saving || blacklisted} onClick={() => void updatePreference(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Permitir</button></div>
        </div>
        {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300"><MailCheck className="h-5 w-5" /></span><div><h2 className="font-bold text-gray-900 dark:text-white">Cupons, ofertas e novidades</h2><p className="mt-1 text-sm leading-6 text-gray-500">Escolha se deseja receber e-mails promocionais da Hellou Studio. E-mails essenciais sobre pedidos continuam sendo enviados normalmente.</p></div></div>
      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800/60"><div><p className="text-sm font-bold text-gray-900 dark:text-white">Receber comunicações promocionais</p><p className="mt-0.5 text-xs text-gray-500">{enabled ? 'Ativado: você pode receber cupons e novidades.' : 'Desativado: nenhuma campanha promocional será enviada.'}</p></div><button type="button" disabled={saving || (blacklisted && !enabled)} onClick={() => void updatePreference(!enabled)} className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${enabled ? 'bg-gray-600' : 'bg-gradient-to-r from-pink-500 to-orange-400'}`}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{enabled ? 'Desativar' : 'Permitir e-mails'}</button></div>
      {blacklisted && <p className="mt-3 text-xs font-semibold text-orange-700">Este endereço está bloqueado por falhas de entrega. Entre em contato para desbloquear.</p>}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
    </section>
  );
}
