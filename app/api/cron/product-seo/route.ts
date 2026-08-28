import { NextResponse } from 'next/server';
import { processProductSEO } from '@/lib/ai/product-seo-worker';

export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try { return NextResponse.json(await processProductSEO()); }
  catch { return NextResponse.json({ error: 'Processamento de SEO indisponível' }, { status: 503 }); }
}
