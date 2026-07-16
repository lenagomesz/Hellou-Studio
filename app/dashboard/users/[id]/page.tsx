'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Calendar,
  Shield,
  User,
  Star,
  TrendingUp,
  AlertTriangle,
  Target,
  DollarSign,
} from 'lucide-react';
import type { OrderStatus } from '@/types/database';
import type { CustomerMetrics } from '@/lib/customer-analytics';
import {
  SEGMENT_LABELS,
  SEGMENT_BG_CLASSES,
  getRfmScoreColor,
  getChurnRiskColor,
  getLtvLevelColor,
} from '@/lib/customer-analytics';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  pending: 'Aprovado',
  approved: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  completed: 'Concluido',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
  rejected: 'Pagamento Recusado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  pending: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  approved: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  paid: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  processing: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  shipped: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  delivered: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  canceled: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  refunded: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
};

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  cpf: string | null;
  phone: string | null;
  is_vip?: boolean;
  created_at: string;
}

interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  shipping_address: Record<string, unknown> | null;
}

interface Address {
  id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [analytics, setAnalytics] = useState<CustomerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [vipLoading, setVipLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      const [userRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/users/${id}`),
        fetch(`/api/admin/analytics/customers?limit=500`),
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setUser(data.user);
        setOrders(data.orders);
        setAddresses(data.addresses);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        const customerData = (data.customers ?? []).find((c: CustomerMetrics) => c.userId === id);
        if (customerData) setAnalytics(customerData);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function toggleVip() {
    if (!user) return;
    setVipLoading(true);
    const newVip = !user.is_vip;
    const res = await fetch('/api/admin/users/vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isVip: newVip }),
    });
    if (res.ok) {
      setUser({ ...user, is_vip: newVip });
      setToast(newVip ? 'Cliente marcado como VIP!' : 'VIP removido');
      setTimeout(() => setToast(''), 3000);
    }
    setVipLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Usuário não encontrado.</p>
        <Link href="/dashboard/users" className="mt-4 inline-block text-sm text-pink-600 hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, o) => o.status !== 'canceled' && o.status !== 'refunded' ? sum + o.total : sum, 0);
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <Link href="/dashboard/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* User Info Card */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-xl font-bold text-white">
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name || 'Sem nome'}</h1>
              {user.role === 'admin' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  <User className="h-3 w-3" /> Usuário
                </span>
              )}
              {user.is_vip && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Star className="h-3 w-3 fill-amber-500" /> VIP
                </span>
              )}
            </div>

            <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {user.email}</p>
              {user.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {user.phone}</p>}
              {user.cpf && <p className="flex items-center gap-2 font-mono text-xs">CPF: {user.cpf}</p>}
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> Cadastro: {formatDate(user.created_at)}</p>
            </div>

            {/* VIP Toggle */}
            {user.role !== 'admin' && (
              <button
                onClick={toggleVip}
                disabled={vipLoading}
                className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  user.is_vip
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                <Star className={`h-3.5 w-3.5 ${user.is_vip ? 'fill-amber-500 text-amber-500' : ''}`} />
                {user.is_vip ? 'Remover VIP' : 'Marcar como VIP'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Profile Card */}
      {analytics && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-pink-500" /> Perfil Analitico
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {/* LTV */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1"><DollarSign className="h-3 w-3" /> LTV</p>
              <p className={`text-lg font-bold ${getLtvLevelColor(analytics.ltvLevel)}`}>
                {formatPrice(analytics.ltv)}
              </p>
              <p className="text-[10px] text-gray-400">Projecao 12m: {formatPrice(analytics.ltvProjected12m)}</p>
            </div>

            {/* RFM Score */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> RFM Score</p>
              <p className={`text-lg font-bold ${getRfmScoreColor(analytics.rfm.score)}`}>
                {analytics.rfm.score.toFixed(1)}/5
              </p>
              <p className="text-[10px] text-gray-400">R:{analytics.rfm.recency} F:{analytics.rfm.frequency} M:{analytics.rfm.monetary}</p>
            </div>

            {/* Segment */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-500">Segmento</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${SEGMENT_BG_CLASSES[analytics.rfm.segment]}`}>
                {SEGMENT_LABELS[analytics.rfm.segment]}
              </span>
            </div>

            {/* Churn Risk */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risco de Churn</p>
              <p className={`text-lg font-bold ${getChurnRiskColor(analytics.churnRisk)}`}>
                {analytics.churnRisk}%
              </p>
              {analytics.churnRisk >= 70 && (
                <p className="text-[10px] text-red-500 font-medium">ALERTA: Risco alto!</p>
              )}
            </div>
          </div>

          {/* Detailed Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Histórico</p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>{analytics.totalOrders} compras realizadas</p>
                <p>{formatPrice(analytics.totalSpent)} total gasto</p>
                <p>Última compra: {analytics.daysSinceLastPurchase !== null ? `${analytics.daysSinceLastPurchase} dias atrás` : 'Nunca'}</p>
                <p>Ticket medio: {formatPrice(analytics.averageTicket)}</p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Preferências e recomendação</p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {analytics.topCategory && (
                  <p>Categoria favorita: <span className="font-medium capitalize">{analytics.topCategory}</span> ({analytics.topCategoryCount} itens)</p>
                )}
                {analytics.churnRisk >= 70 ? (
                  <p className="text-red-600 dark:text-red-400 font-medium mt-2">
                    Sugestão: Oferecer desconto em {analytics.topCategory ?? 'produtos'} para reativação
                  </p>
                ) : analytics.rfm.segment === 'champion' ? (
                  <p className="text-green-600 dark:text-green-400 font-medium mt-2">
                    Este e um cliente VIP! Priorize atendimento especial.
                  </p>
                ) : analytics.rfm.segment === 'potential' ? (
                  <p className="text-purple-600 dark:text-purple-400 font-medium mt-2">
                    Sugestão: Enviar novidades e ofertas para fidelizar
                  </p>
                ) : (
                  <p className="text-blue-600 dark:text-blue-400 font-medium mt-2">
                    Manter engajamento com newsletter e ofertas personalizadas
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Churn Factors */}
          {analytics.churnRisk > 0 && analytics.churnFactors.length > 0 && (
            <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Fatores de risco de churn:</p>
              <ul className="space-y-0.5">
                {analytics.churnFactors.map((f, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">- {f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pedidos</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedOrders}</p>
          <p className="text-xs text-gray-500 mt-0.5">Entregues</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-2xl font-bold text-green-600">{formatPrice(totalSpent)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total gasto</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{addresses.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Enderecos</p>
        </div>
      </div>

      {/* Addresses */}
      {addresses.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4" /> Enderecos
          </h2>
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                {addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''} · {addr.neighborhood} · {addr.city}/{addr.state} · {addr.zip_code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <ShoppingBag className="h-4 w-4" /> Pedidos ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nenhum pedido realizado.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice(order.total)}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
