'use client';

import { useState } from 'react';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    setSent(false);

    const payload: Record<string, string> = { title: title.trim() };
    if (body.trim()) payload.body = body.trim();

    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setSent(true);
      setTitle('');
      setBody('');
      setTargetEmail('');
    }
    setSending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enviar Notificação</h1>

      <form onSubmit={handleSend} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="Ex: Nova coleção disponível!"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensagem (opcional)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="Detalhes da notificação..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destinatário
          </label>
          <input
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="Deixe vazio para enviar a todos"
          />
          <p className="mt-1 text-xs text-gray-500">
            Se vazio, envia para todos os usuários
          </p>
        </div>

        <button
          type="submit"
          disabled={sending || !title.trim()}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {sending ? 'Enviando...' : 'Enviar notificação'}
        </button>

        {sent && (
          <p className="text-sm font-medium text-green-600">
            Notificação enviada com sucesso!
          </p>
        )}
      </form>
    </div>
  );
}
