'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, Trash2, Edit2, Loader2 } from 'lucide-react';

interface HistoryEntry {
  id: string;
  feature_type: 'market_trends' | 'social_campaign' | 'blog_post';
  product_id?: string;
  content: Record<string, unknown>;
  tokens_used?: number;
  generated_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [type, setType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [totalTokens, setTotalTokens] = useState(0);

  async function fetchHistory() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (type) params.append('type', type);

      const response = await fetch(`/api/admin/ai/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setEntries(data.data);
      setPagination(data.pagination);

      const total = data.data.reduce((sum: number, e: HistoryEntry) => sum + (e.tokens_used || 0), 0);
      setTotalTokens(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, type]);

  async function deleteEntry(id: string) {
    if (!confirm('Tem certeza?')) return;
    try {
      const response = await fetch(`/api/admin/ai/history?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
      setEntries(entries.filter(e => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  async function saveEdit(id: string) {
    try {
      const parsed = JSON.parse(editContent);
      const response = await fetch(`/api/admin/ai/history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: parsed }),
      });
      if (!response.ok) throw new Error('Save failed');
      setEditingId(null);
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  const typeLabels: Record<string, string> = {
    market_trends: 'Tendências de Mercado',
    social_campaign: 'Campanha Social',
    blog_post: 'Blog Post',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/ai-dashboard"
            className="text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Gerações</h1>
            <p className="text-sm text-gray-600">
              Visualize, edite e delete suas gerações de IA
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-gradient-to-r from-amber-50 to-pink-50 px-4 py-2">
          <div className="text-xs text-gray-600">Tokens Totais</div>
          <div className="text-xl font-bold text-amber-700">{totalTokens.toLocaleString()}</div>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPagination({ ...pagination, page: 1 });
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tokens</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {typeLabels[entry.feature_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(entry.generated_at).toLocaleDateString('pt-BR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.tokens_used || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditContent(JSON.stringify(entry.content, null, 2));
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-gray-600">
          Nenhuma geração encontrada
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() =>
              setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })
            }
            disabled={pagination.page === 1}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {pagination.page} de {pagination.pages}
          </span>
          <button
            onClick={() =>
              setPagination({
                ...pagination,
                page: Math.min(pagination.pages, pagination.page + 1),
              })
            }
            disabled={pagination.page === pagination.pages}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold">Editar Conteúdo</h3>
              <button
                onClick={() => setEditingId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-80 rounded-lg border border-gray-300 p-3 font-mono text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveEdit(editingId)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
