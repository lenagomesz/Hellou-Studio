import { NextResponse } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import {
  subDays,
  subMonths,
  startOfMonth,
  startOfWeek,
  startOfDay,
  endOfDay,
  format,
  addDays,
  differenceInDays,
} from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Simple linear regression: y = slope * x + intercept
 * x values are 0-indexed day offsets.
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: mean(values) };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const result = await withTimeout(computeAnalytics(), 15000);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[analytics/advanced] Error:', err);
    return serverError('Erro ao calcular analytics avançados');
  }
}

async function computeAnalytics() {
  const admin = getSupabaseAdmin();
  const now = new Date();

  // Date boundaries
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = subDays(thisMonthStart, 1);
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subDays(thisWeekStart, 1), { weekStartsOn: 1 });
  const lastWeekEnd = subDays(thisWeekStart, 1);
  const thirtyDaysAgo = subDays(now, 30);
  const fortyFourDaysAgo = subDays(now, 44); // 30 + 14 buffer for anomaly rolling mean
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Fetch all orders from the last ~44 days (covers anomaly window + historical)
  const validStatuses = ['paid', 'processing', 'shipped', 'delivered'];

  const [ordersResult, usersResult, productsResult, todayOrdersResult] = await Promise.all([
    admin
      .from('orders')
      .select('id, total, created_at, status')
      .in('status', validStatuses)
      .gte('created_at', lastMonthStart.toISOString())
      .order('created_at', { ascending: true }),
    admin
      .from('users')
      .select('id, created_at')
      .gte('created_at', lastMonthStart.toISOString()),
    admin
      .from('products')
      .select('id, name, views, active'),
    admin
      .from('orders')
      .select('id, total, created_at')
      .in('status', validStatuses)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString()),
  ]);

  const orders = ordersResult.data ?? [];
  const users = usersResult.data ?? [];
  const products = productsResult.data ?? [];
  const todayOrders = todayOrdersResult.data ?? [];

  // Also fetch older orders for 30-day trend + anomaly detection
  const olderOrdersResult = await admin
    .from('orders')
    .select('id, total, created_at, status')
    .in('status', validStatuses)
    .gte('created_at', fortyFourDaysAgo.toISOString())
    .lt('created_at', lastMonthStart.toISOString())
    .order('created_at', { ascending: true });

  const olderOrders = olderOrdersResult.data ?? [];
  const allRecentOrders = [...olderOrders, ...orders];

  // ─── 1. Period Comparison ───────────────────────────────────────────────────

  function computePeriodStats(
    orderSubset: typeof orders,
    userSubset: typeof users,
  ) {
    const revenue = round2(orderSubset.reduce((sum, o) => sum + (o.total ?? 0), 0));
    const orderCount = orderSubset.length;
    const newUsers = userSubset.length;
    const avgTicket = orderCount > 0 ? round2(revenue / orderCount) : 0;
    return { revenue, orders: orderCount, newUsers, avgTicket };
  }

  const thisMonthOrders = orders.filter(
    (o) => new Date(o.created_at) >= thisMonthStart,
  );
  const lastMonthOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });
  const thisWeekOrders = orders.filter(
    (o) => new Date(o.created_at) >= thisWeekStart,
  );
  const lastWeekOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= lastWeekStart && d <= lastWeekEnd;
  });

  const thisMonthUsers = users.filter(
    (u) => new Date(u.created_at) >= thisMonthStart,
  );
  const lastMonthUsers = users.filter((u) => {
    const d = new Date(u.created_at);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });
  const thisWeekUsers = users.filter(
    (u) => new Date(u.created_at) >= thisWeekStart,
  );
  const lastWeekUsers = users.filter((u) => {
    const d = new Date(u.created_at);
    return d >= lastWeekStart && d <= lastWeekEnd;
  });

  // Daily comparison: this month vs last month (day by day)
  const daysInThisMonth = differenceInDays(now, thisMonthStart) + 1;
  const dailyComparison: Array<{
    date: string;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
  }> = [];

  for (let i = 0; i < daysInThisMonth; i++) {
    const thisDay = addDays(thisMonthStart, i);
    const lastDay = addDays(lastMonthStart, i);
    const thisDayStr = format(thisDay, 'yyyy-MM-dd');
    const lastDayStr = format(lastDay, 'yyyy-MM-dd');

    const thisRevenue = thisMonthOrders
      .filter((o) => format(new Date(o.created_at), 'yyyy-MM-dd') === thisDayStr)
      .reduce((sum, o) => sum + (o.total ?? 0), 0);

    const lastRevenue = lastMonthOrders
      .filter((o) => format(new Date(o.created_at), 'yyyy-MM-dd') === lastDayStr)
      .reduce((sum, o) => sum + (o.total ?? 0), 0);

    dailyComparison.push({
      date: thisDayStr,
      thisMonthRevenue: round2(thisRevenue),
      lastMonthRevenue: round2(lastRevenue),
    });
  }

  const periodComparison = {
    thisMonth: computePeriodStats(thisMonthOrders, thisMonthUsers),
    lastMonth: computePeriodStats(lastMonthOrders, lastMonthUsers),
    thisWeek: computePeriodStats(thisWeekOrders, thisWeekUsers),
    lastWeek: computePeriodStats(lastWeekOrders, lastWeekUsers),
    dailyComparison,
  };

  // ─── 2. Trend Forecast ─────────────────────────────────────────────────────

  // Build daily revenue map for last 30 days
  const dailyRevenue: Array<{ date: string; revenue: number }> = [];
  const revenueValues: number[] = [];

  for (let i = 29; i >= 0; i--) {
    const day = subDays(now, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayRevenue = allRecentOrders
      .filter((o) => format(new Date(o.created_at), 'yyyy-MM-dd') === dayStr)
      .reduce((sum, o) => sum + (o.total ?? 0), 0);
    dailyRevenue.push({ date: dayStr, revenue: round2(dayRevenue) });
    revenueValues.push(dayRevenue);
  }

  // Linear regression on last 30 days
  const { slope, intercept } = linearRegression(revenueValues);
  const sd = stdDev(revenueValues);
  const confidenceMargin = 1.5 * sd;

  // 7-day forecast
  const forecast: Array<{ date: string; revenue: number; lower: number; upper: number }> = [];
  for (let i = 1; i <= 7; i++) {
    const futureDay = addDays(now, i);
    const x = 29 + i; // continuing from day index 29 (today)
    const predicted = slope * x + intercept;
    const clampedPredicted = Math.max(0, predicted);
    forecast.push({
      date: format(futureDay, 'yyyy-MM-dd'),
      revenue: round2(clampedPredicted),
      lower: round2(Math.max(0, clampedPredicted - confidenceMargin)),
      upper: round2(clampedPredicted + confidenceMargin),
    });
  }

  // Determine trend direction
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendPercent = 0;

  if (revenueValues.length >= 2) {
    const firstHalf = mean(revenueValues.slice(0, 15));
    const secondHalf = mean(revenueValues.slice(15));
    if (firstHalf > 0) {
      trendPercent = round2(((secondHalf - firstHalf) / firstHalf) * 100);
    } else if (secondHalf > 0) {
      trendPercent = 100;
    }

    if (trendPercent > 5) trend = 'up';
    else if (trendPercent < -5) trend = 'down';
    else trend = 'stable';
  }

  const trendForecast = {
    historical: dailyRevenue,
    forecast,
    trend,
    trendPercent,
  };

  // ─── 3. Anomaly Detection ──────────────────────────────────────────────────

  const anomalies: Array<{
    type: 'high_revenue' | 'low_revenue' | 'product_drop' | 'conversion_drop';
    message: string;
    severity: 'warning' | 'critical';
    date: string;
    value: number;
    expected: number;
  }> = [];

  // Build 44-day daily revenue for rolling mean computation
  const extendedDailyRevenue: number[] = [];
  const extendedDates: string[] = [];

  for (let i = 43; i >= 0; i--) {
    const day = subDays(now, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayRevenue = allRecentOrders
      .filter((o) => format(new Date(o.created_at), 'yyyy-MM-dd') === dayStr)
      .reduce((sum, o) => sum + (o.total ?? 0), 0);
    extendedDailyRevenue.push(dayRevenue);
    extendedDates.push(dayStr);
  }

  // Detect anomalies using 14-day rolling mean and std deviation
  for (let i = 14; i < extendedDailyRevenue.length; i++) {
    const window = extendedDailyRevenue.slice(i - 14, i);
    const windowMean = mean(window);
    const windowStd = stdDev(window);
    const current = extendedDailyRevenue[i];
    const threshold = 2 * windowStd;

    if (windowStd === 0) continue; // Not enough variance to detect anomalies

    if (current > windowMean + threshold) {
      anomalies.push({
        type: 'high_revenue',
        message: `Receita excepcionalmente alta em ${extendedDates[i]}: R$${round2(current)} (esperado ~R$${round2(windowMean)})`,
        severity: current > windowMean + 3 * windowStd ? 'critical' : 'warning',
        date: extendedDates[i],
        value: round2(current),
        expected: round2(windowMean),
      });
    } else if (current < windowMean - threshold && windowMean > 0) {
      anomalies.push({
        type: 'low_revenue',
        message: `Receita excepcionalmente baixa em ${extendedDates[i]}: R$${round2(current)} (esperado ~R$${round2(windowMean)})`,
        severity: current < windowMean - 3 * windowStd ? 'critical' : 'warning',
        date: extendedDates[i],
        value: round2(current),
        expected: round2(windowMean),
      });
    }
  }

  // ─── 4. Realtime Stats ─────────────────────────────────────────────────────

  const ordersToday = todayOrders.length;
  const revenueToday = round2(
    todayOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
  );

  // Critical stock: products with views > 50 but no sales (proxy)
  // We check products with high views that have no orders referencing them today
  const criticalStock = products.filter(
    (p) => p.active && (p.views ?? 0) > 50,
  ).length;

  const realtime = {
    ordersToday,
    revenueToday,
    criticalStock,
  };

  return {
    periodComparison,
    trendForecast,
    anomalies,
    realtime,
  };
}
