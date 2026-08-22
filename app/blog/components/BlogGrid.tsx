'use client';

import { useState, useEffect } from 'react';
import { BlogCard } from './BlogCard';
import { Loader2 } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image_url?: string;
  created_at: string;
}

export function BlogGrid() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const postsPerPage = 12;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`/api/blog/posts?page=${page}&limit=${postsPerPage}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        setPosts(data.posts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">Nenhum post publicado ainda</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} {...post} />
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-2 text-sm">Página {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={posts.length < postsPerPage}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
