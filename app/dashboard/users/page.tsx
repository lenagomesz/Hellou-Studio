'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Shield, Ban, Trash2, Mail, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UserManagementTabs } from '@/components/admin/UserManagementTabs';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  is_vip?: boolean;
  created_at: string;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months} ${months > 1 ? 'meses' : 'mês'} atrás`;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const canDeleteCustomers = session?.user?.accessLevel !== 'partner';
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });

  const fetchUsers = useCallback(async (q: string, requestedPage: number) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(requestedPage), limit: '25' });
    if (q) params.set('search', q);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users ?? []);
      if (data.pagination) setPagination(data.pagination);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Erro ao carregar clientes');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchUsers('', 1); }, [fetchUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void fetchUsers(search, 1);
  }

  async function banUser(user: UserRow) {
    if (!confirm(`Banir ${user.email}? O usuário será removido e não poderá se cadastrar novamente.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban' }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setToast(`${user.email} banido`);
      setTimeout(() => setToast(''), 3000);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Não foi possível banir o cliente');
    }
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Excluir ${user.email}? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setToast(`${user.email} removido`);
      setTimeout(() => setToast(''), 3000);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Não foi possível excluir o cliente');
    }
  }

  async function toggleVip(user: UserRow) {
    const newVip = !user.is_vip;
    const res = await fetch('/api/admin/users/vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isVip: newVip }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_vip: newVip } : u));
      setToast(newVip ? `${user.email} marcado como VIP` : `VIP removido de ${user.email}`);
      setTimeout(() => setToast(''), 3000);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? 'Não foi possível atualizar o cliente VIP');
    }
  }

  const displayUsers = vipFilter ? users.filter(u => u.is_vip) : users;
  const vipCount = users.filter(u => u.is_vip).length;

  return (
    <div className="space-y-6">
      <UserManagementTabs />
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} usuários · {vipCount} VIPs nesta página
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por email ou nome..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Buscar</button>
        </form>
        <button
          onClick={() => setVipFilter(!vipFilter)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            vipFilter
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300'
          }`}
        >
          <Star className={`h-4 w-4 ${vipFilter ? 'fill-amber-500 text-amber-500' : ''}`} />
          VIPs ({vipCount})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cadastro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Compras</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {displayUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/users/${user.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-xs font-bold text-pink-600">
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          {user.name || '—'}
                          {user.is_vip && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        </p>
                        <p className="truncate text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {user.email}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Usuário</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{timeAgo(user.created_at)}</td>
                  <td className="px-4 py-3.5"><p className="text-sm font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.total_spent)}</p><p className="text-[11px] text-gray-500">{user.total_orders} pedidos{user.last_order_at ? ` · última ${timeAgo(user.last_order_at).toLowerCase()}` : ''}</p></td>
                  <td className="px-4 py-3.5 text-right">
                    {user.role !== 'admin' && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleVip(user)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                            user.is_vip
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-gray-400 hover:bg-gray-50 hover:text-amber-600'
                          }`}
                          title={user.is_vip ? 'Remover VIP' : 'Marcar como VIP'}
                        >
                          <Star className={`h-3.5 w-3.5 ${user.is_vip ? 'fill-amber-500' : ''}`} />
                        </button>
                        {canDeleteCustomers && <button onClick={() => banUser(user)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition" title="Banir">
                          <Ban className="h-3.5 w-3.5" />
                        </button>}
                        {canDeleteCustomers && <button onClick={() => deleteUser(user)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Fechar erro">×</button></div>}
      {!loading && pagination.pages > 1 && <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 text-sm"><span className="text-gray-500">Página {pagination.page} de {pagination.pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => { const next = Math.max(1, page - 1); setPage(next); void fetchUsers(search, next); }} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button><button disabled={page >= pagination.pages} onClick={() => { const next = Math.min(pagination.pages, page + 1); setPage(next); void fetchUsers(search, next); }} className="rounded-lg bg-slate-950 px-3 py-2 text-white disabled:opacity-40">Próxima</button></div></div>}
    </div>
  );
}
