'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  segment_type: string;
  total_recipients: number;
  ab_test_enabled: boolean;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  canceled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
  canceled: 'Cancelada',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/email-marketing/campaigns?status=${filter}`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setCampaigns([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function deleteCampaign(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    await fetch(`/api/email-marketing/campaigns/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Marketing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crie e gerencie campanhas de email segmentadas.
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          + Nova campanha
        </Link>
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/campaigns/templates" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Templates
        </Link>
        <Link href="/dashboard/campaigns/automations" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Automações
        </Link>
        <Link href="/dashboard/campaigns/drip" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Drip Campaigns
        </Link>
        <Link href="/dashboard/campaigns/recipients" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Destinatarios
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {['all', 'draft', 'scheduled', 'sent'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === s
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {s === 'all' ? 'Todas' : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">Nenhuma campanha encontrada.</p>
            <Link href="/dashboard/campaigns/new" className="mt-2 inline-block text-sm text-pink-500 hover:text-pink-600">
              Criar primeira campanha
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/campaigns/${campaign.id}`} className="truncate text-sm font-semibold text-gray-900 hover:text-pink-500 dark:text-white">
                      {campaign.name}
                    </Link>
                    {campaign.ab_test_enabled && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        A/B
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    Assunto: {campaign.subject}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>Segmento: {campaign.segment_type}</span>
                    {campaign.total_recipients > 0 && (
                      <span>{campaign.total_recipients} destinatarios</span>
                    )}
                    {campaign.sent_at && (
                      <span>Enviada em {new Date(campaign.sent_at).toLocaleDateString('pt-BR')}</span>
                    )}
                    {campaign.scheduled_at && campaign.status === 'scheduled' && (
                      <span>Agendada: {new Date(campaign.scheduled_at).toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[campaign.status] || statusColors.draft}`}>
                    {statusLabels[campaign.status] || campaign.status}
                  </span>
                  {campaign.status === 'sent' && (
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}/analytics`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                    >
                      Analytics
                    </Link>
                  )}
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="rounded-lg px-2 py-1.5 text-xs text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
