import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase';

async function getPage(slug: string) {
  const { data } = await getSupabaseAdmin()
    .from('content_pages')
    .select('title,excerpt,content,seo_title,seo_description')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await getPage((await params).slug);
  return page ? { title: page.seo_title || page.title, description: page.seo_description || page.excerpt } : {};
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPage((await params).slug);
  if (!page) notFound();
  return (
    <main className="mx-auto min-h-[60vh] max-w-3xl px-5 py-14 sm:py-20">
      <h1 className="text-3xl font-black text-gray-950 dark:text-white sm:text-5xl">{page.title}</h1>
      {page.excerpt && <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">{page.excerpt}</p>}
      <article className="mt-10 whitespace-pre-wrap text-base leading-8 text-gray-700 dark:text-gray-300">{page.content}</article>
    </main>
  );
}
