'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';

interface DraftPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  seo_keywords: string[] | null;
  created_at: string;
}

export function BlogManagementSection() {
  const [posts, setPosts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDraftPosts = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/ai/blog-posts');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao carregar rascunhos.');
        return;
      }

      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar rascunhos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraftPosts();
  }, [fetchDraftPosts]);

  async function generateNewPost() {
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/ai/blog-generation', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao gerar novo post.');
        return;
      }

      setSuccessMessage('Novo rascunho gerado com sucesso!');
      await fetchDraftPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar post.');
    } finally {
      setGenerating(false);
    }
  }

  async function approvePost(postId: string) {
    setApproving(postId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/ai/blog-approval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'approve' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao aprovar post.');
        return;
      }

      setSuccessMessage('Post aprovado e publicado com sucesso!');
      await fetchDraftPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar post.');
    } finally {
      setApproving(null);
    }
  }

  async function rejectPost(postId: string) {
    const confirmed = window.confirm(
      'Tem certeza que deseja rejeitar e excluir permanentemente este post?',
    );
    if (!confirmed) return;

    setApproving(postId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/ai/blog-approval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'reject' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Falha ao rejeitar post.');
        return;
      }

      setSuccessMessage('Post rejeitado e excluido.');
      await fetchDraftPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar post.');
    } finally {
      setApproving(null);
    }
  }

  // ---------- Loading State ----------
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando rascunhos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Fila de Rascunhos</h2>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            {posts.length}
          </span>
        </div>
        <button
          onClick={generateNewPost}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Gerar Novo Post
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm">Nenhum rascunho na fila.</p>
          <p className="mt-1 text-xs text-gray-400">
            Clique em &quot;Gerar Novo Post&quot; para criar um rascunho via IA.
          </p>
        </div>
      )}

      {/* Draft Posts Queue */}
      {posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-gray-900">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {post.seo_keywords && post.seo_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.seo_keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600"
                          >
                            {kw}
                          </span>
                        ))}
                        {post.seo_keywords.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{post.seo_keywords.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approvePost(post.id)}
                    disabled={approving === post.id}
                    title="Aprovar e publicar"
                    className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    {approving === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-4 w-4" />
                    )}
                    Aprovar
                  </button>
                  <button
                    onClick={() => rejectPost(post.id)}
                    disabled={approving === post.id}
                    title="Rejeitar e excluir"
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {approving === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Rejeitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
