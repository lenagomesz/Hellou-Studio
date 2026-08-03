'use client';

import { useState } from 'react';
import { Search, UserCheck, X } from 'lucide-react';

export type AccountOption = {
  id: string;
  name: string | null;
  email: string;
  role: 'user' | 'admin';
};

type UserAccountPickerProps = {
  selected: AccountOption | null;
  onSelect: (user: AccountOption | null) => void;
};

export function UserAccountPicker({ selected, onSelect }: UserAccountPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AccountOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (search.trim().length < 2) return setError('Digite ao menos 2 caracteres.');
    setSearching(true);
    setError('');
    setHasSearched(false);
    setResults([]);
    const params = new URLSearchParams({ search: search.trim(), page: '1', limit: '10' });
    const response = await fetch(`/api/admin/users?${params}`, { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    setSearching(false);
    setHasSearched(true);
    if (!response.ok) return setError(result.error ?? 'Erro ao buscar cliente');
    const users = (result.users ?? result) as AccountOption[];
    setResults(users);
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <UserCheck className="h-5 w-5 shrink-0 text-emerald-700" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-emerald-900">{selected.name || 'Cliente cadastrado'}</p><p className="truncate text-xs text-emerald-700">{selected.email}</p></div>
        <button type="button" onClick={() => { onSelect(null); setResults([]); }} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100" aria-label="Desvincular conta"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou e-mail de quem já tem conta" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100" /></div>
        <button type="submit" disabled={searching} className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:border-pink-300 disabled:opacity-50">{searching ? 'Buscando...' : 'Buscar'}</button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {results.length > 0 && <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">{results.map((user) => <button type="button" key={user.id} onClick={() => { onSelect(user); setSearch(''); setResults([]); }} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-pink-50"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{user.name || 'Sem nome'}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></span><span className="text-xs font-bold text-pink-600">Vincular</span></button>)}</div>}
      {hasSearched && !searching && results.length === 0 && !error && <p className="mt-2 text-xs text-slate-500">Nenhuma conta encontrada. Confira o e-mail ou preencha os dados abaixo como cliente sem conta.</p>}
    </div>
  );
}
