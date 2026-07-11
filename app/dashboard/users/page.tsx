'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Search, Shield, Ban, Trash2, Mail, Star } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  is_vip?: boolean;
  created_at: string;
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days}d atras`;
  const months = Math.floor(days / 30);
  return `${months} mes${months > 1 ? 'es' : ''} atras`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState(false);
  const [toast, setToast] = useState('');

  async function fetchUsers(q?: string) {
    setLoading(true);
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    const res = await fetch(`/api/admin/users${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchUsers(search);
  }

  async function banUser(user: UserRow) {
    if (!confirm(`Banir ${user.email}? O usuario sera removido e nao podera se cadastrar novamente.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban' }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setToast(`${user.email} banido`);
      setTimeout(() => setToast(''), 3000);
    }
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Excluir ${user.email}? Esta acao nao pode ser desfeita.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setToast(`${user.email} removido`);
      setTimeout(() => setToast(''), 3000);
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
    }
  }

  const admins = users.filter(u => u.role === 'admin');
  const displayUsers = vipFilter ? users.filter(u => u.is_vip) : users;
  const vipCount = users.filter(u => u.is_vip).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {users.length} usuarios · {admins.length} admins · {vipCount} VIPs
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Cadastro</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Acoes</th>
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
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Usuario</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{timeAgo(user.created_at)}</td>
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
                        <button onClick={() => banUser(user)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition" title="Banir">
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteUser(user)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
