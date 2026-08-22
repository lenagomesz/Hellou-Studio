import { NextResponse } from 'next/server';
import { getPublishedPosts } from '@/lib/blog/blog-service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
  const offset = (page - 1) * limit;

  try {
    const { posts, total } = await getPublishedPosts(limit, offset);

    return NextResponse.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro na API de posts do blog:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar posts do blog' },
      { status: 500 }
    );
  }
}
