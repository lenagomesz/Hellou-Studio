'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EmailPreference {
  id: string;
  email: string;
  subscribed: boolean;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  gdpr_consent: boolean;
  gdpr_consent_at: string | null;
  bounce_count: number;
  last_bounce_at: string | null;
  blacklisted: boolean;
  blacklist_reason: string | null;
  created_at: string;
}

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<EmailPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'unsubscribed' | 'blacklisted'>('all');
  const [actionEmail, setActionEmail] = useState('');
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    fetchRecipients();
  }, [filter]);

  async function fetchRecipients() {
    setLoading(true);
    let url = '/api/email-marketing/recipients';
    if (filter === 'subscribed') url += '?subscribed=true';
    else if (filter === 'unsubscribed') url += '?subscribed=false';
    else if (filter === 'blacklisted') url += '?blacklisted=true';

    try {
      const res = await fetch(url);
      const data = await res.json();
      setRecipients(Array.isArray(data) ? data : []);
    } catch {
      setRecipients([]);
    }
    setLoading(false);
  }

  async function handleBlacklist(email: string) {
    const reason = prompt('Motivo (opcional):');
    await fetch('/api/email-marketing/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'blacklist', email, reason }),
    });
    fetchRecipients();
  }

  async function handleWhitelist(email: string) {
    await fetch('/api/email-marketing/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'whitelist', email }),
    });
    fetchRecipients();
  }

  async function handleManualBlacklist(e: React.FormEvent) {
    e.preventDefault();
    if (!actionEmail) return;
    await fetch('/api/email-marketing/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'blacklist', email: actionEmail, reason: actionReason }),
    });
    setActionEmail('');
    setActionReason('');
    fetchRecipients();
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciamento de destinatarios</h1>
            <p className="text-sm text-gray-500">Unsubscribes, bounces, blacklist e GDPR compliance.</p>
          </div>
        </div>
        <a
          href="/api/email-marketing/export"
          download
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
        >
          Exportar CSV
        </a>
      </div>

      {/* Manual blacklist form */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Blacklist manual</h3>
        <form onSubmit={handleManualBlacklist} className="flex flex-wrap gap-2">
          <input
            type="email"
            value={actionEmail}
            onChange={e => setActionEmail(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="email@exemplo.com"
            required
          />
          <input
            type="text"
            value={actionReason}
            onChange={e => setActionReason(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Motivo (opcional)"
          />
          <button type="submit" className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
            Bloquear
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {(['all', 'subscribed', 'unsubscribed', 'blacklisted'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'subscribed' ? 'Inscritos' : f === 'unsubscribed' ? 'Desincritos' : 'Blacklist'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Nenhum destinatario encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Bounces</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">GDPR</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {recipients.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{r.email}</td>
                    <td className="px-4 py-3 text-center">
                      {r.blacklisted ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">Bloqueado</span>
                      ) : r.subscribed ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Inscrito</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">Desinscrito</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono text-xs ${r.bounce_count > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {r.bounce_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.gdpr_consent ? (
                        <span className="text-xs text-green-600">Sim</span>
                      ) : (
                        <span className="text-xs text-gray-400">Nao</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.blacklisted ? (
                        <button
                          onClick={() => handleWhitelist(r.email)}
                          className="text-xs text-green-500 hover:text-green-600"
                        >
                          Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlacklist(r.email)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Bloquear
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GDPR Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">GDPR Compliance</h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-400">
          <li>- Todos os emails incluem link obrigatorio de cancelamento de inscricao</li>
          <li>- Bounces automaticos: 3+ bounces = email bloqueado automaticamente</li>
          <li>- Consentimento GDPR rastreado por destinatario</li>
          <li>- Exportacao de dados disponivel em CSV para auditoria</li>
        </ul>
      </div>
    </div>
  );
}
