import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: url ? url.slice(0, 40) + '...' : '❌ MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? `✅ set (${anonKey.length} chars)` : '❌ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `✅ set (${serviceKey.length} chars)` : '❌ MISSING',
    NEXTAUTH_SECRET: nextAuthSecret ? `✅ set (${nextAuthSecret.length} chars)` : '❌ MISSING',
    NEXTAUTH_URL: nextAuthUrl ?? '❌ MISSING',
    NEXT_PUBLIC_BASE_URL: baseUrl ?? '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ?? 'not set',
    VERCEL_URL: process.env.VERCEL_URL ?? 'not set',
  };

  // Test Supabase admin connection
  let supabaseTest: Record<string, unknown> = {};
  if (url && serviceKey) {
    try {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Count all products
      const { count: totalCount, error: e1 } = await admin
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Count active products
      const { count: activeCount, error: e2 } = await admin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      // Count by category filter
      const { count: filteredCount, error: e3 } = await admin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .in('category', ['chaveiros', 'escritorio', 'criaturas']);

      // Get first 3 raw rows
      const { data: sample, error: e4 } = await admin
        .from('products')
        .select('id, name, category, active')
        .limit(3);

      supabaseTest = {
        connected: !e1,
        totalProducts: e1 ? `ERROR: ${e1.message}` : totalCount,
        activeProducts: e2 ? `ERROR: ${e2.message}` : activeCount,
        filteredProducts: e3 ? `ERROR: ${e3.message}` : filteredCount,
        sampleRows: e4 ? `ERROR: ${e4.message}` : sample,
      };
    } catch (err) {
      supabaseTest = { connected: false, error: String(err) };
    }
  } else {
    supabaseTest = { connected: false, error: 'Missing URL or service key' };
  }

  return NextResponse.json({ envCheck, supabaseTest }, { status: 200 });
}
