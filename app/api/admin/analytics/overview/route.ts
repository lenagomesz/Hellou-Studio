import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { subDays } from 'date-fns';
import { getStoreMonthBounds } from '@/lib/store-time';

export async function GET() {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const now = new Date();
  const { start: thisMonthStart, previousStart: lastMonthStart } = getStoreMonthBounds(now);

  const [ordersRes, usersRes, productsRes] = await Promise.all([
    admin
      .from('orders')
      .select('total, created_at, status')
      .in('status', ['paid', 'processing', 'shipped', 'delivered']),
    admin
      .from('users')
      .select('created_at')
      .eq('role', 'user'),
    admin
      .from('products')
      .select('id')
      .eq('active', true),
  ]);

  if (ordersRes.error) return serverError('Erro ao buscar pedidos');

  const orders = ordersRes.data ?? [];
  const users = usersRes.data ?? [];
  const activeProducts = productsRes.data?.length ?? 0;

  const thisMonthOrders = orders.filter(o => new Date(o.created_at) >= thisMonthStart);
  const lastMonthOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const newUsersThisMonth = users.filter(u => new Date(u.created_at) >= thisMonthStart).length;
  const newUsersLastMonth = users.filter(u => {
    const d = new Date(u.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;

  const recentOrders = orders.filter(o => new Date(o.created_at) >= subDays(now, 30)).length;
  const previousPeriodOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d >= subDays(now, 60) && d < subDays(now, 30);
  }).length;

  function growthPercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  return NextResponse.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
    totalOrders,
    avgTicket: Math.round(avgTicket * 100) / 100,
    activeProducts,
    newUsersThisMonth,
    totalUsers: users.length,
    growth: {
      revenue: growthPercent(thisMonthRevenue, lastMonthRevenue),
      orders: growthPercent(recentOrders, previousPeriodOrders),
      users: growthPercent(newUsersThisMonth, newUsersLastMonth),
    },
  });
}
