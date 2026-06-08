'use client';

import { useEffect, useState } from 'react';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchUsers(q?: string) {
    setLoading(true);
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    const res = await fetch(`/api/admin/users${params}`);
    if (res.ok) {
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchUsers(search);
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Excluir o usuário ${email}?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  async function handleBan(id: string, email: string) {
    const reason = prompt(`Motivo do banimento de ${email} (opcional):`);
    if (reason === null) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', reason: reason || null }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email ou nome..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
        >
          Buscar
        </button>
      </form>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100" />)}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Criado</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">{user.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'admin' && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleBan(user.id, user.email)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          Banir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id, user.email)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                          Excluir
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
