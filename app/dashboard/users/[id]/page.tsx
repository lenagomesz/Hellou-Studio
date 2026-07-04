'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Calendar, Shield, User } from 'lucide-react';
import type { OrderStatus } from '@/types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  pending: 'Aprovado',
  paid: 'Pago',
  processing: 'Em preparo',
  completed: 'Concluído',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  pending: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  paid: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  processing: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  shipped: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  delivered: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  canceled: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  refunded: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
};

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  cpf: string | null;
  phone: string | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrders(data.orders);
        setAddresses(data.addresses);
      }
      setLoading(false);
    }
    load();
  }, [id]);

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
            </div>

            <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {user.email}</p>
              {user.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {user.phone}</p>}
              {user.cpf && <p className="flex items-center gap-2 font-mono text-xs">CPF: {user.cpf}</p>}
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> Cadastro: {formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

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
          <p className="text-xs text-gray-500 mt-0.5">Endereços</p>
        </div>
      </div>

      {/* Addresses */}
      {addresses.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4" /> Endereços
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
