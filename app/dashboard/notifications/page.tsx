'use client';

import { useState } from 'react';
import { Bell, Send, Users, User } from 'lucide-react';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState<{ title: string; target: string; time: string }[]>([]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim() || undefined,
        email: email.trim() || undefined,
      }),
    });
    if (res.ok) {
      setHistory(prev => [{ title: title.trim(), target: email.trim() || 'Todos', time: new Date().toLocaleTimeString('pt-BR') }, ...prev]);
      setToast('Notificação enviada!');
      setTimeout(() => setToast(''), 3000);
      setTitle('');
      setBody('');
      setEmail('');
    } else {
      setToast('Erro ao enviar');
      setTimeout(() => setToast(''), 3000);
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notificações</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Envie avisos para usuários da plataforma</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Send Form */}
        <form onSubmit={handleSend} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 dark:bg-pink-900/30">
              <Send className="h-4 w-4 text-pink-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nova notificação</h2>
              <p className="text-[11px] text-gray-500">Aparece no sino do usuário</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da notificação *"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Mensagem (opcional)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email do destinatário (vazio = todos)"
                className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              {email ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
              {email ? `Para: ${email}` : 'Para: todos os usuários'}
            </p>
            <button
              type="submit"
              disabled={sending || !title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>

        {/* History */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-400" /> Enviados nesta sessão
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Nenhuma notificação enviada ainda</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <div key={i} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.target} · {item.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
