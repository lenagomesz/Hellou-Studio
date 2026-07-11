import { type NextRequest } from 'next/server';
import { requireAdmin, serverError } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import { startOfMonth, subMonths, subDays, format, startOfDay } from 'date-fns';

export async function GET(_req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const admin = getSupabaseAdmin();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const thirtyDaysAgo = subDays(now, 30);

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
      .select('id, name, category, price')
      .eq('active', true),
  ]);

  if (ordersRes.error) return serverError('Erro ao buscar dados');

  const orders = ordersRes.data ?? [];
  const users = usersRes.data ?? [];
  const products = productsRes.data ?? [];

  const thisMonthOrders = orders.filter(o => new Date(o.created_at) >= thisMonthStart);
  const lastMonthOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

  const newUsersThisMonth = users.filter(u => new Date(u.created_at) >= thisMonthStart).length;

  // Daily revenue for chart representation
  const dailyRevenue = new Map<string, number>();
  for (const order of orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo)) {
    const key = format(startOfDay(new Date(order.created_at)), 'dd/MM');
    dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + (order.total ?? 0));
  }

  const fc = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const revenueGrowth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  const dailyRows = Array.from(dailyRevenue.entries())
    .map(([date, revenue]) => `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${date}</td><td style="padding:8px;border:1px solid #e5e7eb;">${fc(revenue)}</td></tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatorio Dashboard - Studio Hellou</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #ec4899; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #ec4899; }
    .date { color: #6b7280; font-size: 14px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .kpi-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    .kpi-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 24px; font-weight: bold; margin-top: 8px; }
    .kpi-change { font-size: 12px; margin-top: 4px; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f9fafb; padding: 10px 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; text-align: center; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Studio Hellou</div>
    <div class="date">Relatorio gerado em ${format(now, 'dd/MM/yyyy HH:mm')}</div>
  </div>

  <div class="no-print" style="margin-bottom:20px;">
    <button onclick="window.print()" style="background:#ec4899;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">
      Imprimir / Salvar PDF
    </button>
  </div>

  <h2>Indicadores Principais</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Receita do Mes</div>
      <div class="kpi-value">${fc(thisMonthRevenue)}</div>
      <div class="kpi-change ${revenueGrowth >= 0 ? 'positive' : 'negative'}">${revenueGrowth >= 0 ? '↑' : '↓'} ${Math.abs(revenueGrowth)}% vs mes anterior</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pedidos Este Mes</div>
      <div class="kpi-value">${thisMonthOrders.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ticket Medio</div>
      <div class="kpi-value">${fc(avgTicket)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Novos Usuarios</div>
      <div class="kpi-value">${newUsersThisMonth}</div>
    </div>
  </div>

  <h2>Resumo</h2>
  <table>
    <tr><th>Metrica</th><th>Valor</th></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Receita Total (historico)</td><td style="padding:8px;border:1px solid #e5e7eb;">${fc(totalRevenue)}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total de Pedidos</td><td style="padding:8px;border:1px solid #e5e7eb;">${orders.length}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Produtos Ativos</td><td style="padding:8px;border:1px solid #e5e7eb;">${products.length}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total de Usuarios</td><td style="padding:8px;border:1px solid #e5e7eb;">${users.length}</td></tr>
    <tr><td style="padding:8px;border:1px solid #e5e7eb;">Receita Mes Anterior</td><td style="padding:8px;border:1px solid #e5e7eb;">${fc(lastMonthRevenue)}</td></tr>
  </table>

  <h2>Receita Diaria (ultimos 30 dias)</h2>
  <table>
    <tr><th>Data</th><th>Receita</th></tr>
    ${dailyRows}
  </table>

  <div class="footer">
    Studio Hellou - Relatorio gerado automaticamente pelo sistema de analytics
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
