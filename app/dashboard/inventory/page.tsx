import Link from 'next/link';
import { getSupabaseAdmin, withTimeout } from '@/lib/supabase';
import { getAlertLevel } from '@/lib/inventory';
import type { StockAlertLevel } from '@/types/inventory';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function AlertBadge({ level }: { level: StockAlertLevel }) {
  const config = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Critico' },
    low: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'Baixo' },
    ok: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'OK' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

async function getInventoryData() {
  const admin = getSupabaseAdmin();

  const [optionsRes, movementsRes, reorderRes] = await Promise.all([
    admin
      .from('product_options')
      .select('id, product_id, name, stock, reorder_point, standard_order_qty, price_modifier, product:products(name, base_price, active)')
      .order('stock', { ascending: true }),
    admin
      .from('stock_movements')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('reorder_tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'ordered', 'in_transit']),
  ]);

  const options = (optionsRes.data ?? []) as unknown as Array<{
    id: string;
    product_id: string;
    name: string;
    stock: number;
    reorder_point: number;
    standard_order_qty: number;
    price_modifier: number;
    product: { name: string; base_price: number; active: boolean } | null;
  }>;

  const activeOptions = options.filter(o => o.product?.active !== false);

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

  return {
    options: activeOptions,
    summary: {
      total_products: activeOptions.length,
      total_stock_units: totalStock,
      critical_alerts: critical,
      low_alerts: low,
      total_stock_value: Math.round(totalValue * 100) / 100,
      total_movements: movementsRes.count ?? 0,
      pending_reorders: reorderRes.count ?? 0,
    },
  };
}

export default async function InventoryDashboard() {
  const data = await withTimeout(getInventoryData()).catch(() => ({
    options: [] as Awaited<ReturnType<typeof getInventoryData>>['options'],
    summary: {
      total_products: 0,
      total_stock_units: 0,
      critical_alerts: 0,
      low_alerts: 0,
      total_stock_value: 0,
      total_movements: 0,
      pending_reorders: 0,
    },
  }));

  const { options, summary } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Produção sob demanda</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">Estoque e capacidade produtiva</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Separe filamentos e insumos da pequena quantidade de peças disponíveis para pronta-entrega.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/inventory/adjustments"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            + Ajuste manual
          </Link>
          <Link
            href="/api/admin/inventory/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Exportar CSV
          </Link>
        </div>
      </header>

      <Link href="/dashboard/inventory/materials" className="group relative flex flex-col gap-5 overflow-hidden rounded-[26px] bg-[#101218] p-6 text-white shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-pink-500/25 blur-3xl" />
        <span className="relative"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">Novo controle produtivo</span><span className="mt-2 block text-xl font-bold">Filamentos, cores e reservas por pedido</span><span className="mt-1 block max-w-2xl text-sm leading-6 text-slate-400">Veja o peso realmente disponível, o que já está comprometido com pedidos pagos e quais cores comprar primeiro.</span></span>
        <span className="relative shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition group-hover:bg-pink-100">Gerenciar materiais →</span>
      </Link>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pronta-entrega</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary.total_stock_units}</p>
          <p className="mt-1 text-xs text-gray-400">{summary.total_products} variações cadastradas</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Valor em peças prontas</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(summary.total_stock_value)}</p>
          <p className="mt-1 text-xs text-gray-400">Não inclui produção sob demanda</p>
        </div>

        <Link href="/dashboard/inventory?filter=alerts" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Alertas</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-red-600">{summary.critical_alerts}</span>
            <span className="text-sm text-yellow-600">{summary.low_alerts} baixos</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Produtos precisando reposicao</p>
        </Link>

        <Link href="/dashboard/inventory/reorder-tasks" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Reposicoes Pendentes</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary.pending_reorders}</p>
          <p className="mt-1 text-xs text-gray-400">Tarefas em andamento</p>
        </Link>
      </div>

      {/* Quick Navigation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/inventory/movements" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Movimentacoes</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Historico completo de entradas e saidas</p>
          <p className="mt-2 text-xs text-pink-500">{summary.total_movements} registros →</p>
        </Link>

        <Link href="/dashboard/inventory/forecast" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Previsao de Demanda</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Forecast baseado em historico de vendas</p>
          <p className="mt-2 text-xs text-pink-500">Ver previsoes →</p>
        </Link>

        <Link href="/dashboard/inventory/dead-stock" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Estoque Parado</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Produtos sem venda ha 90+ dias</p>
          <p className="mt-2 text-xs text-pink-500">Verificar →</p>
        </Link>

        <Link href="/dashboard/inventory/suppliers" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Fornecedores</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerenciar fornecedores e custos</p>
          <p className="mt-2 text-xs text-pink-500">Gerenciar →</p>
        </Link>

        <Link href="/dashboard/inventory/reorder-tasks" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tarefas de Reposicao</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Acompanhar pedidos a fornecedores</p>
          <p className="mt-2 text-xs text-pink-500">Ver tarefas →</p>
        </Link>

        <Link href="/dashboard/inventory/adjustments" className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Ajuste Manual</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registrar entrada/saida de estoque</p>
          <p className="mt-2 text-xs text-pink-500">Fazer ajuste →</p>
        </Link>
      </div>

      {/* Stock Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Estoque por Variacao</h2>
          <span className="text-xs text-gray-400">{options.length} itens</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variacao</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Estoque</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase">Reposicao em</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {options.slice(0, 30).map((option) => {
                const level = getAlertLevel(option.stock, option.reorder_point);
                return (
                  <tr key={option.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-200 font-medium">
                      {option.product?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                      {option.name}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                      {option.stock}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 dark:text-gray-400">
                      {option.reorder_point}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <AlertBadge level={level} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {options.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Nenhuma variacao de produto encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
