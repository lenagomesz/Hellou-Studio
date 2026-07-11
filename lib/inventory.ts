import { getSupabaseAdmin } from '@/lib/supabase';
import type {
  StockMovementReason,
  StockAlert,
  StockAlertLevel,
  StockOverviewItem,
  StockForecastData,
  DeadStockItem,
  InventoryDashboardSummary,
  StockMovementWithDetails,
} from '@/types/inventory';
import { subDays, subMonths, addMonths, format, startOfMonth, differenceInDays } from 'date-fns';

// ============================================================================
// Stock Movement Recording
// ============================================================================

export async function recordStockMovement(params: {
  product_id: string;
  product_option_id: string;
  quantity_change: number;
  reason: StockMovementReason;
  notes?: string;
  user_id?: string;
  reference_id?: string;
  warehouse_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = getSupabaseAdmin();

  // Get current stock
  const { data: option, error: fetchError } = await admin
    .from('product_options')
    .select('stock')
    .eq('id', params.product_option_id)
    .single();

  if (fetchError || !option) {
    return { success: false, error: 'Product option not found' };
  }

  const stockBefore = option.stock;
  const stockAfter = stockBefore + params.quantity_change;

  if (stockAfter < 0) {
    return { success: false, error: `Insufficient stock. Current: ${stockBefore}, Requested change: ${params.quantity_change}` };
  }

  // Update stock
  const { error: updateError } = await admin
    .from('product_options')
    .update({ stock: stockAfter })
    .eq('id', params.product_option_id);

  if (updateError) {
    return { success: false, error: 'Failed to update stock' };
  }

  // Record movement
  const { error: insertError } = await admin
    .from('stock_movements')
    .insert({
      product_id: params.product_id,
      product_option_id: params.product_option_id,
      warehouse_id: params.warehouse_id || null,
      quantity_change: params.quantity_change,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason: params.reason,
      notes: params.notes || null,
      user_id: params.user_id || null,
      reference_id: params.reference_id || null,
    });

  if (insertError) {
    // Rollback stock update
    await admin
      .from('product_options')
      .update({ stock: stockBefore })
      .eq('id', params.product_option_id);
    return { success: false, error: 'Failed to record movement' };
  }

  // Check if we need to create an alert
  const { data: optionFull } = await admin
    .from('product_options')
    .select('reorder_point, product_id')
    .eq('id', params.product_option_id)
    .single();

  if (optionFull && stockAfter <= optionFull.reorder_point && stockBefore > optionFull.reorder_point) {
    // Stock just dropped below reorder point - create admin notification
    const { data: product } = await admin
      .from('products')
      .select('name')
      .eq('id', params.product_id)
      .single();

    const priority = stockAfter === 0 ? 'urgent' : 'high';
    const title = stockAfter === 0
      ? `Estoque zerado: ${product?.name || 'Produto'}`
      : `Estoque baixo: ${product?.name || 'Produto'}`;

    await admin.from('admin_notifications').insert({
      type: 'low_stock',
      title,
      body: `Estoque atual: ${stockAfter} unidades. Ponto de reposicao: ${optionFull.reorder_point}.`,
      priority,
      read: false,
      archived: false,
      related_product_id: params.product_id,
      related_product_option_id: params.product_option_id,
    });
  }

  return { success: true };
}

// ============================================================================
// Record sale movements (called when an order is paid)
// ============================================================================

export async function recordSaleMovements(params: {
  order_id: string;
  items: { product_id: string; product_option_id: string | null; quantity: number }[];
  user_id?: string;
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of params.items) {
    if (!item.product_option_id) continue;

    const result = await recordStockMovement({
      product_id: item.product_id,
      product_option_id: item.product_option_id,
      quantity_change: -item.quantity,
      reason: 'venda',
      reference_id: params.order_id,
      user_id: params.user_id,
    });

    if (!result.success) {
      errors.push(`${item.product_id}: ${result.error}`);
    }
  }

  return { success: errors.length === 0, errors };
}

// ============================================================================
// Stock Alerts
// ============================================================================

export async function getStockAlerts(): Promise<StockAlert[]> {
  const admin = getSupabaseAdmin();

  const { data: options } = await admin
    .from('product_options')
    .select('id, product_id, name, stock, reorder_point, product:products(name)')
    .order('stock', { ascending: true });

  if (!options) return [];

  return (options as unknown as Array<{
    id: string;
    product_id: string;
    name: string;
    stock: number;
    reorder_point: number;
    product: { name: string } | null;
  }>)
    .filter(o => o.stock <= o.reorder_point)
    .map(o => ({
      product_id: o.product_id,
      product_name: o.product?.name || 'Unknown',
      product_option_id: o.id,
      option_name: o.name,
      current_stock: o.stock,
      reorder_point: o.reorder_point,
      level: getAlertLevel(o.stock, o.reorder_point),
    }));
}

export function getAlertLevel(stock: number, reorderPoint: number): StockAlertLevel {
  if (stock === 0) return 'critical';
  if (stock <= reorderPoint) return 'low';
  return 'ok';
}

// ============================================================================
// Stock Overview
// ============================================================================

export async function getStockOverview(): Promise<StockOverviewItem[]> {
  const admin = getSupabaseAdmin();

  const { data: options } = await admin
    .from('product_options')
    .select('id, product_id, name, stock, reorder_point, standard_order_qty, product:products(name, active)')
    .order('stock', { ascending: true });

  if (!options) return [];

  // Get recent sales data (last 30 days) for average calculation
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  const { data: recentMovements } = await admin
    .from('stock_movements')
    .select('product_option_id, quantity_change, created_at')
    .eq('reason', 'venda')
    .gte('created_at', thirtyDaysAgo);

  // Calculate average daily sales per option
  const salesByOption = new Map<string, { total: number; lastSale: string }>();
  for (const m of recentMovements ?? []) {
    const existing = salesByOption.get(m.product_option_id ?? '') || { total: 0, lastSale: m.created_at };
    existing.total += Math.abs(m.quantity_change);
    if (m.created_at > existing.lastSale) existing.lastSale = m.created_at;
    salesByOption.set(m.product_option_id ?? '', existing);
  }

  return (options as unknown as Array<{
    id: string;
    product_id: string;
    name: string;
    stock: number;
    reorder_point: number;
    standard_order_qty: number;
    product: { name: string; active: boolean } | null;
  }>)
    .filter(o => o.product?.active !== false)
    .map(o => {
      const sales = salesByOption.get(o.id);
      const avgDailySales = sales ? sales.total / 30 : 0;
      const daysOfStock = avgDailySales > 0 ? Math.round(o.stock / avgDailySales) : null;

      return {
        product_id: o.product_id,
        product_name: o.product?.name || 'Unknown',
        product_option_id: o.id,
        option_name: o.name,
        current_stock: o.stock,
        reorder_point: o.reorder_point,
        standard_order_qty: o.standard_order_qty,
        level: getAlertLevel(o.stock, o.reorder_point),
        last_sold_at: sales?.lastSale || null,
        avg_daily_sales: Math.round(avgDailySales * 100) / 100,
        days_of_stock: daysOfStock,
      };
    });
}

// ============================================================================
// Stock Forecast
// ============================================================================

export async function getStockForecast(productOptionId?: string): Promise<StockForecastData[]> {
  const admin = getSupabaseAdmin();

  // Get product options with their products
  let optionsQuery = admin
    .from('product_options')
    .select('id, product_id, name, stock, reorder_point, standard_order_qty, product:products(name, active)');

  if (productOptionId) {
    optionsQuery = optionsQuery.eq('id', productOptionId);
  }

  const { data: options } = await optionsQuery;
  if (!options || options.length === 0) return [];

  // Get sales movements for last 6 months
  const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
  const { data: movements } = await admin
    .from('stock_movements')
    .select('product_option_id, quantity_change, created_at')
    .eq('reason', 'venda')
    .gte('created_at', sixMonthsAgo);

  // Group sales by option and month
  const salesByOptionMonth = new Map<string, Map<string, number>>();
  for (const m of movements ?? []) {
    const optId = m.product_option_id ?? '';
    if (!salesByOptionMonth.has(optId)) {
      salesByOptionMonth.set(optId, new Map());
    }
    const monthKey = format(startOfMonth(new Date(m.created_at)), 'yyyy-MM');
    const monthMap = salesByOptionMonth.get(optId)!;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + Math.abs(m.quantity_change));
  }

  const now = new Date();

  return (options as unknown as Array<{
    id: string;
    product_id: string;
    name: string;
    stock: number;
    reorder_point: number;
    standard_order_qty: number;
    product: { name: string; active: boolean } | null;
  }>)
    .filter(o => o.product?.active !== false)
    .map(o => {
      const monthlySales = salesByOptionMonth.get(o.id) || new Map<string, number>();

      // Build last 6 months data
      const monthlyData: { month: string; quantity: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const month = format(startOfMonth(subMonths(now, i)), 'yyyy-MM');
        monthlyData.push({ month, quantity: monthlySales.get(month) || 0 });
      }

      // Simple linear forecast: use last 3 months average with trend
      const last3 = monthlyData.slice(-3);
      const avg3 = last3.reduce((s, m) => s + m.quantity, 0) / 3;

      // Detect trend (increasing/decreasing)
      const trend = last3.length >= 2
        ? (last3[last3.length - 1].quantity - last3[0].quantity) / last3.length
        : 0;

      // Forecast next 2 months
      const forecast: { month: string; predicted_quantity: number }[] = [];
      for (let i = 1; i <= 2; i++) {
        const month = format(startOfMonth(addMonths(now, i)), 'yyyy-MM');
        const predicted = Math.max(0, Math.round(avg3 + trend * i));
        forecast.push({ month, predicted_quantity: predicted });
      }

      // Estimate stock-out date
      const totalForecast = forecast.reduce((s, f) => s + f.predicted_quantity, 0);
      const dailyRate = avg3 / 30;
      const stockOutDate = dailyRate > 0
        ? format(new Date(Date.now() + (o.stock / dailyRate) * 86400000), 'yyyy-MM-dd')
        : null;

      // Recommended order quantity
      const twoMonthsNeed = totalForecast;
      const recommended = Math.max(o.standard_order_qty, twoMonthsNeed - o.stock + o.reorder_point);

      return {
        product_id: o.product_id,
        product_name: o.product?.name || 'Unknown',
        product_option_id: o.id,
        option_name: o.name,
        current_stock: o.stock,
        monthly_sales: monthlyData,
        forecast,
        recommended_order_qty: Math.max(0, Math.round(recommended)),
        stock_out_date: stockOutDate,
      };
    });
}

// ============================================================================
// Dead Stock Detection
// ============================================================================

export async function getDeadStock(daysSinceLastSale: number = 90): Promise<DeadStockItem[]> {
  const admin = getSupabaseAdmin();

  const { data: options } = await admin
    .from('product_options')
    .select('id, product_id, name, stock, price_modifier, product:products(name, base_price, active)')
    .gt('stock', 0);

  if (!options) return [];

  // Get last sale date per option
  const { data: lastSales } = await admin
    .from('stock_movements')
    .select('product_option_id, created_at')
    .eq('reason', 'venda')
    .order('created_at', { ascending: false });

  const lastSaleByOption = new Map<string, string>();
  for (const s of lastSales ?? []) {
    const optId = s.product_option_id ?? '';
    if (!lastSaleByOption.has(optId)) {
      lastSaleByOption.set(optId, s.created_at);
    }
  }

  const cutoffDate = subDays(new Date(), daysSinceLastSale);

  return (options as unknown as Array<{
    id: string;
    product_id: string;
    name: string;
    stock: number;
    price_modifier: number;
    product: { name: string; base_price: number; active: boolean } | null;
  }>)
    .filter(o => {
      if (o.product?.active === false) return false;
      const lastSale = lastSaleByOption.get(o.id);
      // Include if never sold or last sale is before cutoff
      return !lastSale || new Date(lastSale) < cutoffDate;
    })
    .map(o => {
      const lastSale = lastSaleByOption.get(o.id) || null;
      const daysSince = lastSale
        ? differenceInDays(new Date(), new Date(lastSale))
        : 999;

      const unitPrice = (o.product?.base_price || 0) + o.price_modifier;
      const revenuePotential = o.stock * unitPrice;
      // Simple holding cost: assume 0.5% of product value per day
      const holdingCost = revenuePotential * 0.005 * daysSince;

      let suggestion: 'promote' | 'discount' | 'deactivate' | 'remove';
      if (daysSince > 180) suggestion = 'remove';
      else if (daysSince > 120) suggestion = 'deactivate';
      else if (o.stock > 10) suggestion = 'discount';
      else suggestion = 'promote';

      return {
        product_id: o.product_id,
        product_name: o.product?.name || 'Unknown',
        product_option_id: o.id,
        option_name: o.name,
        current_stock: o.stock,
        last_sold_at: lastSale,
        days_since_last_sale: daysSince,
        holding_cost_estimate: Math.round(holdingCost * 100) / 100,
        revenue_potential: Math.round(revenuePotential * 100) / 100,
        suggestion,
      };
    })
    .sort((a, b) => b.days_since_last_sale - a.days_since_last_sale);
}

// ============================================================================
// Dashboard Summary
// ============================================================================

export async function getInventoryDashboardSummary(): Promise<InventoryDashboardSummary> {
  const admin = getSupabaseAdmin();

  const { data: options } = await admin
    .from('product_options')
    .select('id, stock, reorder_point, price_modifier, product:products(base_price, active)')
    .filter('product.active', 'eq', true);

  const activeOptions = (options as unknown as Array<{
    id: string;
    stock: number;
    reorder_point: number;
    price_modifier: number;
    product: { base_price: number; active: boolean } | null;
  }> ?? []).filter(o => o.product !== null);

  let critical = 0;
  let low = 0;
  let totalStock = 0;
  let totalValue = 0;

  for (const o of activeOptions) {
    totalStock += o.stock;
    totalValue += o.stock * ((o.product?.base_price || 0) + o.price_modifier);
    if (o.stock === 0) critical++;
    else if (o.stock <= o.reorder_point) low++;
  }

  // Get dead stock count (90+ days)
  const deadStock = await getDeadStock(90);

  // Get pending reorders
  const { count: pendingReorders } = await admin
    .from('reorder_tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'ordered', 'in_transit']);

  return {
    total_products: activeOptions.length,
    total_stock_units: totalStock,
    critical_alerts: critical,
    low_alerts: low,
    dead_stock_count: deadStock.length,
    pending_reorders: pendingReorders ?? 0,
    total_stock_value: Math.round(totalValue * 100) / 100,
  };
}

// ============================================================================
// Stock Movements with Details
// ============================================================================

export async function getStockMovements(params: {
  product_option_id?: string;
  product_id?: string;
  reason?: StockMovementReason;
  limit?: number;
  offset?: number;
}): Promise<{ movements: StockMovementWithDetails[]; total: number }> {
  const admin = getSupabaseAdmin();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  let query = admin
    .from('stock_movements')
    .select('*, product:products(name), option:product_options(name), user:users(email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.product_option_id) {
    query = query.eq('product_option_id', params.product_option_id);
  }
  if (params.product_id) {
    query = query.eq('product_id', params.product_id);
  }
  if (params.reason) {
    query = query.eq('reason', params.reason);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error || !data) return { movements: [], total: 0 };

  const movements = (data as unknown as Array<{
    id: string;
    product_id: string;
    product_option_id: string | null;
    warehouse_id: string | null;
    quantity_change: number;
    stock_before: number;
    stock_after: number;
    reason: StockMovementReason;
    notes: string | null;
    user_id: string | null;
    reference_id: string | null;
    created_at: string;
    product: { name: string } | null;
    option: { name: string } | null;
    user: { email: string } | null;
  }>).map(m => ({
    id: m.id,
    product_id: m.product_id,
    product_option_id: m.product_option_id,
    warehouse_id: m.warehouse_id,
    quantity_change: m.quantity_change,
    stock_before: m.stock_before,
    stock_after: m.stock_after,
    reason: m.reason,
    notes: m.notes,
    user_id: m.user_id,
    reference_id: m.reference_id,
    created_at: m.created_at,
    product_name: m.product?.name,
    option_name: m.option?.name,
    user_email: m.user?.email,
  }));

  return { movements, total: count ?? 0 };
}

// ============================================================================
// CSV Export
// ============================================================================

export async function generateStockCSV(): Promise<string> {
  const overview = await getStockOverview();
  const forecasts = await getStockForecast();

  const forecastMap = new Map<string, StockForecastData>();
  for (const f of forecasts) {
    forecastMap.set(f.product_option_id, f);
  }

  const headers = [
    'Produto',
    'Variacao',
    'Estoque Atual',
    'Ponto de Reposicao',
    'Nivel',
    'Vendas/Dia (media)',
    'Dias de Estoque',
    'Ultima Venda',
    'Previsao Proximo Mes',
    'Previsao 2o Mes',
    'Recomendacao de Compra',
  ];

  const rows = overview.map(item => {
    const forecast = forecastMap.get(item.product_option_id);
    return [
      item.product_name,
      item.option_name,
      item.current_stock.toString(),
      item.reorder_point.toString(),
      item.level,
      item.avg_daily_sales.toString(),
      item.days_of_stock?.toString() || 'N/A',
      item.last_sold_at ? item.last_sold_at.split('T')[0] : 'Nunca',
      forecast?.forecast[0]?.predicted_quantity?.toString() || '0',
      forecast?.forecast[1]?.predicted_quantity?.toString() || '0',
      forecast?.recommended_order_qty?.toString() || '0',
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}
