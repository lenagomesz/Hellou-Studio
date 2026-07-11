import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, rating, comment } = await req.json();

    if (!productId || !rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from('product_reviews').insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment || null,
    });

    if (error) {
      console.error('[POST /api/products/reviews] DB error:', error);
      return Response.json({ error: 'Failed to save review' }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/products/reviews] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
