'use client';

import { useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, PenTool } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
}

export function SEOBlogSection() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateBlog() {
    if (!topic.trim()) {
      setError('Digite um tema para o blog');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/ai/seo-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Falha ao gerar post');
        return;
      }

      setBlogPost(data.blogPost);
      setTopic('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PenTool className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Blog SEO</h2>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Gere posts de blog otimizados para SEO que promovem produtos Hellou Studio. Posts são auto-publicados em /blog.
      </p>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateBlog()}
          placeholder="Tema do blog (ex: 'ideias de decoração para quarto gamer')"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400"
        />
        <button
          onClick={generateBlog}
          disabled={loading || !topic.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <PenTool className="h-4 w-4" />
              Gerar
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {blogPost && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h3 className="font-medium text-blue-900">{blogPost.title}</h3>
              <p className="mt-1 text-xs text-blue-700">Publicado: {new Date(blogPost.publishedAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <a
              href={`/blog/${blogPost.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Ver Post
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-xs text-blue-700">Edite ou delete este post no painel de gerenciamento de blog.</p>
        </div>
      )}
    </div>
  );
}
