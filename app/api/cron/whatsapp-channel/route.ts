import { NextResponse } from 'next/server';
import { generateScheduledChannelPosts, notifyDueChannelPosts } from '@/lib/whatsapp-channel';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    let created: string[] = [];
    let generationFailed = false;
    try { created = await generateScheduledChannelPosts(); }
    catch (error) { generationFailed = true; console.error('[whatsapp-channel] Generation failed:', error); }
    const notified = await notifyDueChannelPosts();
    if (generationFailed) return NextResponse.json({ created: created.length, notified, error: 'Geração indisponível; lembretes preservados.' }, { status: 503 });
    return NextResponse.json({ created: created.length, notified });
  } catch (error) {
    console.error('[whatsapp-channel] Cron failed:', error);
    return NextResponse.json({ error: 'Falha na programação do Canal WhatsApp.' }, { status: 503 });
  }
}
