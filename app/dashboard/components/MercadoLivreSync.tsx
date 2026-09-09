'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Link2, Loader2, RefreshCw, ShieldCheck, ShoppingCart, Unplug } from 'lucide-react';

type ConnectionStatus = {
  connected: boolean;
  account: { userId: string; nickname: string | null; expiresAt: string } | null;
  error?: string;
};

type SyncResult = { synced?: number; failed?: number; total?: number; message?: string; error?: string };

export function MercadoLivreSync() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/admin/mercado-livre/status', { cache: 'no-store' });
      const data = await response.json() as ConnectionStatus;
      setStatus(response.ok ? data : { connected: false, account: null, error: data.error ?? 'Erro ao consultar conexão.' });
    } catch {
      setStatus({ connected: false, account: null, error: 'Não foi possível consultar a conexão.' });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('ml_connected');
    const error = params.get('ml_error');
    if (connected) setNotice({ type: 'success', message: 'Conta do Mercado Livre conectada com segurança.' });
    if (error) setNotice({ type: 'error', message: error });
    if (connected || error) window.history.replaceState({}, '', window.location.pathname);
    void loadStatus();
  }, [loadStatus]);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/mercado-livre/sync', { method: 'POST' });
      const data = await response.json() as SyncResult;
      setResult(response.ok ? data : { error: data.error ?? 'Erro ao sincronizar.' });
      if (/conecte sua conta/i.test(data.error ?? '')) await loadStatus();
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Erro de comunicação com o servidor.' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Desconectar esta conta do Mercado Livre? Os anúncios já publicados não serão apagados.')) return;
    setDisconnecting(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/mercado-livre/status', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Não foi possível desconectar.');
      }
      setStatus({ connected: false, account: null });
      setNotice({ type: 'success', message: 'Conta desconectada deste painel.' });
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível desconectar.' });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 p-3 text-white shadow-lg shadow-orange-200"><ShoppingCart className="h-6 w-6" /></span>
          <div><h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Mercado Livre</h1><p className="mt-1 text-sm text-slate-500">Conecte sua conta e publique os produtos da loja com segurança.</p></div>
        </div>
        <a href="https://www.mercadolivre.com.br/publicaciones" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600">Abrir Central de Vendedor <ExternalLink className="h-3.5 w-3.5" /></a>
      </header>

      {notice && (
        <div className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <span className="flex items-start gap-2">{notice.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold" aria-label="Fechar aviso">×</button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${status?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {loadingStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : status?.connected ? <ShieldCheck className="h-6 w-6" /> : <Link2 className="h-6 w-6" />}
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Status da conta</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{loadingStatus ? 'Verificando conexão…' : status?.connected ? 'Conta conectada' : 'Nenhuma conta conectada'}</h2>
              {status?.connected && status.account ? <p className="mt-1 text-sm text-slate-500">{status.account.nickname || 'Vendedor Mercado Livre'} · ID {status.account.userId}</p> : <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Autorize a Hellou Studio pelo site oficial. Sua senha nunca passa por este painel.</p>}
              {status?.error && <p className="mt-2 text-xs font-medium text-red-600">{status.error}</p>}
            </div>
          </div>

          {!loadingStatus && (status?.connected ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadStatus()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Atualizar</button>
              <button type="button" disabled={disconnecting} onClick={handleDisconnect} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">{disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />} Desconectar</button>
            </div>
          ) : <a href="/api/admin/mercado-livre/connect" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffe600] px-5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-[#f5db00]"><Link2 className="h-4 w-4" /> Conectar ao Mercado Livre</a>)}
        </div>
        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-600 sm:px-6"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Tokens protegidos por criptografia e renovados automaticamente quando necessário.</div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['1', 'Conecte sua conta', 'Você autoriza o aplicativo diretamente no Mercado Livre.'],
          ['2', 'Confira os produtos', 'O painel usa produtos ativos, preços e imagens da Hellou Studio.'],
          ['3', 'Sincronize', 'Categorias brasileiras são identificadas automaticamente antes da publicação.'],
        ].map(([step, title, description]) => <article key={step} className="rounded-2xl border border-slate-200 bg-white p-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-700">{step}</span><h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></article>)}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-bold text-slate-900">Publicar produtos ativos</h2><p className="mt-1 text-sm text-slate-500">A sincronização usa o site brasileiro, moeda BRL e até 50 produtos por execução.</p></div>
          <button type="button" onClick={handleSync} disabled={syncing || !status?.connected} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40">{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}{syncing ? 'Sincronizando…' : 'Sincronizar agora'}</button>
        </div>
      </section>

      {result && <div className={`rounded-2xl border p-5 ${result.error ? 'border-red-200 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}><div className="flex items-start gap-3">{result.error ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}<div><h3 className="font-bold">{result.error ? 'Erro na sincronização' : 'Sincronização concluída'}</h3><p className="mt-1 text-sm">{result.error ?? `${result.synced ?? 0} de ${result.total ?? 0} produtos sincronizados.${result.failed ? ` ${result.failed} tiveram erro.` : ''}`}</p></div></div></div>}
    </div>
  );
}
