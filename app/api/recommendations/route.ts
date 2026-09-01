import { NextResponse, type NextRequest } from 'next/server';
import { getKitCatalog } from '@/lib/kit-catalog';
import { getStartingPrice, selectComplementaryProducts } from '@/lib/product-kits';

export async function GET(req: NextRequest) {
  const excludedIds = (req.nextUrl.searchParams.get('exclude') ?? '').split(',').filter(Boolean).slice(0, 100);
  const rawRemaining = Number(req.nextUrl.searchParams.get('remaining'));
  const remaining = Number.isFinite(rawRemaining) ? Math.max(0, Math.min(100000, rawRemaining)) : 0;
  const products = selectComplementaryProducts(await getKitCatalog(), excludedIds, remaining);
  return NextResponse.json({ products: products.map(product => ({
    id: product.id, name: product.name, image_url: product.image_url,
    starting_price: getStartingPrice(product),
  })) });
}
