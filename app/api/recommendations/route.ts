import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const exclude = req.nextUrl.searchParams.get('exclude') ?? '';
  const admin = getSupabaseAdmin();

  let query = admin
    .from('products')
    .select('id, name, base_price, sale_price, image_url, category')
    .eq('active', true)
    .in('category', ['chaveiros', 'escritorio', 'criaturas'])
    .not('name', 'ilike', 'Encomenda%')
    .limit(20);

  if (exclude) {
    query = query.neq('id', exclude);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 4);
  return NextResponse.json({ products: shuffled });
}
