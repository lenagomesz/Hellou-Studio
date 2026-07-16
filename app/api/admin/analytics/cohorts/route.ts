import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, serverError } from '@/lib/api';
import { buildCohortData } from '@/lib/customer-analytics';

export async function GET() {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();

  // Fetch users with their registration dates
  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: true });

  if (usersError) return serverError('Erro ao buscar usuários');

  // Fetch all orders
  const { data: orders, error: ordersError } = await admin
    .from('orders')
    .select('user_id, created_at, status')
    .order('created_at', { ascending: true });

  if (ordersError) return serverError('Erro ao buscar pedidos');

  const cohorts = buildCohortData(users ?? [], orders ?? []);

  // Return only last 12 cohorts for readability
  const recentCohorts = cohorts.slice(-12);

  return NextResponse.json({ cohorts: recentCohorts });
}
