import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission, serverError } from '@/lib/api';
import {
  calculateRFMScore,
  calculateLTV,
  calculateChurnRisk,
  type CustomerMetrics,
} from '@/lib/customer-analytics';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('analytics.view');
  if (auth.response) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const segment = searchParams.get('segment'); // filter by segment
  const churnThreshold = parseInt(searchParams.get('churn_threshold') || '90', 10);
  const vipOnly = searchParams.get('vip') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);

  const admin = getSupabaseAdmin();

  // Fetch all users
  let usersQuery = admin
    .from('users')
    .select('id, email, name, is_vip, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (vipOnly) {
    usersQuery = usersQuery.eq('is_vip', true);
  }

  const { data: users, error: usersError } = await usersQuery;
  if (usersError) return serverError('Erro ao buscar usuarios');
  if (!users || users.length === 0) {
    return NextResponse.json({ customers: [], stats: getEmptyStats() });
  }

  const userIds = users.map(u => u.id);

  // Fetch all orders for these users (excluding canceled/refunded for calculations)
  const { data: allOrders, error: ordersError } = await admin
    .from('orders')
    .select('id, user_id, status, total, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  if (ordersError) return serverError('Erro ao buscar pedidos');

  // Fetch order items for category preferences
  const orderIds = (allOrders ?? []).map(o => o.id);
  let orderItems: Array<{ order_id: string; product_id: string; quantity: number }> = [];
  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from('order_items')
      .select('order_id, product_id, quantity')
      .in('order_id', orderIds.slice(0, 1000)); // limit for performance
    orderItems = items ?? [];
  }

  // Fetch product categories
  const productIds = [...new Set(orderItems.map(i => i.product_id))];
  let productCategories: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: products } = await admin
      .from('products')
      .select('id, category')
      .in('id', productIds.slice(0, 500));
    if (products) {
      productCategories = Object.fromEntries(products.map(p => [p.id, p.category]));
    }
  }

  // Group orders by user
  const ordersByUser = new Map<string, typeof allOrders>();
  for (const order of (allOrders ?? [])) {
    if (!ordersByUser.has(order.user_id)) ordersByUser.set(order.user_id, []);
    ordersByUser.get(order.user_id)!.push(order);
  }

  // Calculate max values for RFM normalization
  let maxRecency = 365;
  let maxFrequency = 1;
  let maxMonetary = 1;

  for (const [, orders] of ordersByUser) {
    const valid = orders!.filter(o => o.status !== 'canceled' && o.status !== 'refunded');
    if (valid.length > maxFrequency) maxFrequency = valid.length;
    const total = valid.reduce((sum, o) => sum + o.total, 0);
    if (total > maxMonetary) maxMonetary = total;
  }

  // Build customer metrics
  const customers: CustomerMetrics[] = [];

  for (const user of users) {
    const userOrders = ordersByUser.get(user.id) ?? [];
    const validOrders = userOrders.filter(o => o.status !== 'canceled' && o.status !== 'refunded');

    const totalOrders = validOrders.length;
    const totalSpent = validOrders.reduce((sum, o) => sum + o.total, 0);
    const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const sortedOrders = [...validOrders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstPurchaseDate = sortedOrders.length > 0 ? sortedOrders[0].created_at : null;
    const lastPurchaseDate = sortedOrders.length > 0 ? sortedOrders[sortedOrders.length - 1].created_at : null;

    const daysSinceLastPurchase = lastPurchaseDate
      ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // RFM
    const rfm = calculateRFMScore(
      validOrders.map(o => ({ total: o.total, created_at: o.created_at, status: o.status })),
      { maxRecency, maxFrequency, maxMonetary },
    );

    // LTV
    const { ltv, projected12m, level } = calculateLTV(
      totalSpent,
      averageTicket,
      totalOrders,
      firstPurchaseDate,
      lastPurchaseDate,
    );

    // Churn
    const { risk: churnRisk, factors: churnFactors } = calculateChurnRisk(
      daysSinceLastPurchase,
      totalOrders,
      firstPurchaseDate,
      lastPurchaseDate,
      churnThreshold,
    );

    // Top category
    const userOrderIds = new Set(validOrders.map(o => o.id));
    const userItems = orderItems.filter(i => userOrderIds.has(i.order_id));
    const categoryCounts = new Map<string, number>();
    for (const item of userItems) {
      const cat = productCategories[item.product_id];
      if (cat) {
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + item.quantity);
      }
    }
    let topCategory: string | null = null;
    let topCategoryCount = 0;
    for (const [cat, count] of categoryCounts) {
      if (count > topCategoryCount) {
        topCategory = cat;
        topCategoryCount = count;
      }
    }

    const metrics: CustomerMetrics = {
      userId: user.id,
      email: user.email,
      name: user.name,
      isVip: user.is_vip ?? false,
      totalOrders,
      totalSpent,
      averageTicket: Math.round(averageTicket * 100) / 100,
      firstPurchaseDate,
      lastPurchaseDate,
      daysSinceLastPurchase,
      rfm,
      ltv,
      ltvProjected12m: projected12m,
      ltvLevel: level,
      churnRisk,
      churnFactors,
      topCategory,
      topCategoryCount,
    };

    customers.push(metrics);
  }

  // Filter by segment if requested
  let filteredCustomers = customers;
  if (segment) {
    filteredCustomers = customers.filter(c => c.rfm.segment === segment);
  }

  // Calculate segment stats
  const segmentCounts = new Map<string, { count: number; totalLtv: number; totalFreq: number; totalRevenue: number }>();
  for (const c of customers) {
    const seg = c.rfm.segment;
    const existing = segmentCounts.get(seg) ?? { count: 0, totalLtv: 0, totalFreq: 0, totalRevenue: 0 };
    existing.count++;
    existing.totalLtv += c.ltv;
    existing.totalFreq += c.totalOrders;
    existing.totalRevenue += c.totalSpent;
    segmentCounts.set(seg, existing);
  }

  const totalCustomers = customers.length;
  const stats = Array.from(segmentCounts.entries()).map(([seg, data]) => ({
    segment: seg,
    count: data.count,
    percentage: totalCustomers > 0 ? Math.round((data.count / totalCustomers) * 100) : 0,
    avgLtv: data.count > 0 ? Math.round(data.totalLtv / data.count) : 0,
    avgFrequency: data.count > 0 ? Math.round((data.totalFreq / data.count) * 10) / 10 : 0,
    totalRevenue: Math.round(data.totalRevenue * 100) / 100,
  }));

  // Churn alerts
  const atRiskCustomers = customers.filter(c => c.churnRisk >= 70).length;

  return NextResponse.json({
    customers: filteredCustomers,
    stats,
    summary: {
      totalCustomers,
      atRiskCount: atRiskCustomers,
      avgLtv: totalCustomers > 0 ? Math.round(customers.reduce((s, c) => s + c.ltv, 0) / totalCustomers) : 0,
      totalRevenue: Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) * 100) / 100,
      vipCount: customers.filter(c => c.isVip).length,
    },
  });
}

function getEmptyStats() {
  return [];
}
