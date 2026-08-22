'use client';

import { useState } from 'react';
import { Loader2, ShoppingCart, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export function MercadoLivreSync() {
  const [accessToken, setAccessToken] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    synced?: number;
    failed?: number;
    total?: number;
    message?: string;
    error?: string;
  } | null>(null);

  async function handleSync() {
    if (!accessToken.trim() || !userId.trim()) {
      setResult({ error: 'Preencha o token e o ID do usuário' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/mercado-livre/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ error: data.error || 'Erro ao sincronizar' });
      } else {
        setResult(data);
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 p-2">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sincronizar com Mercado Livre</h1>
            <p className="mt-1 text-gray-600">Upload automático de todos seus produtos para vender no Mercado Livre</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-600 text-white w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
            <div>
              <h3 className="font-semibold text-blue-900">Gerar Token</h3>
              <p className="text-sm text-blue-800 mt-1">
                Acesse{' '}
                <a
                  href="https://www.mercadolibre.com.br/integrations/authorization-apps"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium hover:text-blue-600"
                >
                  Mercado Livre → Integraciones
                </a>
                {' '}e copie seu token de acesso
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-purple-600 text-white w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
            <div>
              <h3 className="font-semibold text-purple-900">Seu User ID</h3>
              <p className="text-sm text-purple-800 mt-1">
                Encontre em{' '}
                <a
                  href="https://www.mercadolibre.com.br/usuario/identificacion"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium hover:text-purple-600"
                >
                  Conta → Meus dados
                </a>
                {' '}(número do seu usuário ML)
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-green-600 text-white w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
            <div>
              <h3 className="font-semibold text-green-900">Sincronizar</h3>
              <p className="text-sm text-green-800 mt-1">
                Seus produtos serão listados automaticamente no Mercado Livre em minutos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token de Acesso (Access Token) *
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="APP_USR_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Sua chave de API do Mercado Livre (confidencial)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seu User ID do Mercado Livre *
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="123456789"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Número do seu usuário no Mercado Livre</p>
        </div>

        {/* Alert */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Aviso:</strong> Seus dados de acesso são seguros. Eles não são armazenados, apenas usados uma vez para fazer upload dos produtos.
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading || !accessToken.trim() || !userId.trim()}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Sincronizando seus produtos...
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              Sincronizar com Mercado Livre
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-6 ${
          result.error
            ? 'border-red-200 bg-red-50'
            : 'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-start gap-3">
            {result.error ? (
              <>
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-red-900">Erro na sincronização</h3>
                  <p className="text-sm text-red-800 mt-1">{result.error}</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-green-900">Sincronização concluída! 🎉</h3>
                  <div className="text-sm text-green-800 mt-2 space-y-1">
                    <p>✅ <strong>{result.synced || 0} produtos</strong> sincronizados com sucesso</p>
                    {result.failed ? (
                      <p>⚠️ <strong>{result.failed} produtos</strong> tiveram erro (verifique e tente novamente)</p>
                    ) : null}
                    <p className="mt-3">
                      Seus produtos estão aparecendo no Mercado Livre. Verifique sua{' '}
                      <a
                        href="https://www.mercadolibre.com.br/publicaciones"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium hover:text-green-600 inline-flex items-center gap-1"
                      >
                        Central de Vendedor
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
