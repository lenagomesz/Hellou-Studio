import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductRecommendation } from './ProductRecommendation';

interface RecommendedProduct {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
}

interface BlogPostProps {
  title: string;
  content: string;
  excerpt: string | null;
  keywords: string[];
  publishedAt: string | null;
  products: RecommendedProduct[];
}

export function BlogPost({ title, content, excerpt, keywords, publishedAt, products }: BlogPostProps) {
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <article className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Blog
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
          {excerpt && <p className="mt-4 text-lg text-gray-600">{excerpt}</p>}
          {formattedDate && <p className="mt-3 text-sm text-gray-400">{formattedDate}</p>}
        </header>

        <div
          className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {keywords.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        <ProductRecommendation products={products} />
      </div>
    </article>
  );
}
