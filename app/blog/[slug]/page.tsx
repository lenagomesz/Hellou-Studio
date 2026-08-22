import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';
import { BlogPost } from '../components/BlogPost';

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_product_id: string | null;
  status: string;
  seo_keywords: string[] | null;
  created_at: string;
  published_at: string | null;
}

interface RecommendedProduct {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
}

async function getPost(slug: string): Promise<BlogPostRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('[blog-post] Error fetching post:', error);
    return null;
  }
  return data as BlogPostRow | null;
}

async function getRelatedProducts(featuredProductId: string | null): Promise<RecommendedProduct[]> {
  if (!featuredProductId) return [];

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('products')
    .select('id, name, base_price, image_url')
    .eq('active', true)
    .limit(2);

  if (error) {
    console.error('[blog-post] Error fetching products:', error);
    return [];
  }
  return (data ?? []) as RecommendedProduct[];
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: 'Post no encontrado', robots: { index: false, follow: false } };
  }

  const keywords = post.seo_keywords ?? [];

  return {
    title: `${post.title} | Blog Hellou Studio`,
    description: post.excerpt || post.title,
    keywords: keywords.join(', '),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url: `https://helloustudio.com.br/blog/${post.slug}`,
      siteName: 'Hellou Studio',
      type: 'article',
      publishedTime: post.published_at || post.created_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.title,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const products = await getRelatedProducts(post.featured_product_id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.excerpt || post.title,
            datePublished: post.published_at || post.created_at,
            author: {
              '@type': 'Organization',
              name: 'Hellou Studio',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Hellou Studio',
              url: 'https://helloustudio.com.br',
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://helloustudio.com.br/blog/${post.slug}`,
            },
            keywords: (post.seo_keywords ?? []).join(', '),
          }),
        }}
      />
      <BlogPost
        title={post.title}
        content={post.content}
        excerpt={post.excerpt}
        keywords={post.seo_keywords ?? []}
        publishedAt={post.published_at}
        products={products}
      />
    </>
  );
}
