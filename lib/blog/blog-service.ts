import { getSupabaseAdmin } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface BlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  seo_keywords?: string[];
  featured_product_id?: string | null;
  status?: 'draft' | 'published';
  generated_by?: string | null;
  ai_generated?: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  seo_keywords: string[] | null;
  featured_product_id: string | null;
  status: 'draft' | 'published';
  created_at: string;
  published_at: string | null;
  edited_at: string | null;
  generated_by: string | null;
  ai_generated: boolean;
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Cria um novo post no blog. O status padrão é "draft".
 */
export async function createBlogPost(post: BlogPostInput): Promise<BlogPost> {
  const supabase = getSupabaseAdmin();

  const payload = {
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt ?? null,
    seo_keywords: post.seo_keywords ?? null,
    featured_product_id: post.featured_product_id ?? null,
    status: post.status ?? 'draft',
    generated_by: post.generated_by ?? null,
    ai_generated: post.ai_generated ?? true,
    published_at: post.status === 'published' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Erro ao criar post do blog: ${error?.message ?? 'Dados não retornados'}`,
    );
  }

  return data as BlogPost;
}

/**
 * Atualiza um post existente. Define `edited_at` automaticamente.
 * Se o status mudar para "published", define `published_at`.
 */
export async function updateBlogPost(
  id: string,
  updates: Partial<BlogPostInput>,
): Promise<BlogPost> {
  const supabase = getSupabaseAdmin();

  const payload: Record<string, unknown> = {
    ...updates,
    edited_at: new Date().toISOString(),
  };

  // Definir published_at quando publicado pela primeira vez
  if (updates.status === 'published') {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Erro ao atualizar post do blog (id: ${id}): ${error?.message ?? 'Post não encontrado'}`,
    );
  }

  return data as BlogPost;
}

/**
 * Busca um post pelo ID. Retorna null se não encontrado.
 */
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('blog_posts')
    .select()
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao buscar post do blog (id: ${id}): ${error.message}`,
    );
  }

  return (data as BlogPost) ?? null;
}

/**
 * Lista posts em rascunho. Filtra por usuário quando fornecido.
 */
export async function getDraftPosts(userId?: string): Promise<BlogPost[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('blog_posts')
    .select()
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('generated_by', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao listar rascunhos do blog: ${error.message}`);
  }

  return (data as BlogPost[]) ?? [];
}

/**
 * Lista posts publicados com paginação.
 */
export async function getPublishedPosts(
  limit = 12,
  offset = 0,
): Promise<{ posts: BlogPost[]; total: number }> {
  const supabase = getSupabaseAdmin();

  const { data, error, count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Erro ao listar posts publicados: ${error.message}`);
  }

  return {
    posts: (data as BlogPost[]) ?? [],
    total: count ?? 0,
  };
}

/**
 * Remove um post do blog permanentemente.
 */
export async function deleteBlogPost(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('blog_posts').delete().eq('id', id);

  if (error) {
    throw new Error(
      `Erro ao excluir post do blog (id: ${id}): ${error.message}`,
    );
  }
}
