'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Supplier } from '@/types/inventory';

interface SupplierWithStats extends Supplier {
  product_count: number;
  on_time_delivery_rate: number | null;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    lead_time_days: '7',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers ?? []);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lead_time_days: parseInt(formData.lead_time_days) || 7,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Fornecedor criado com sucesso!' });
        setFormData({ name: '', contact_name: '', email: '', phone: '', website: '', address: '', lead_time_days: '7', notes: '' });
        setShowForm(false);
        fetchSuppliers();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao criar fornecedor.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie fornecedores, prazos de entrega e performance.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            + Novo Fornecedor
          </button>
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      {message && (
        <div className={`rounded-xl p-4 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* New Supplier Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Novo Fornecedor</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contato</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={e => setFormData(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prazo de entrega (dias)</label>
              <input
                type="number"
                value={formData.lead_time_days}
                onChange={e => setFormData(f => ({ ...f, lead_time_days: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={e => setFormData(f => ({ ...f, website: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Criar Fornecedor'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Suppliers Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-x-auto dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase">Contato</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">Produtos</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">Prazo (dias)</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">On-time</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-400 uppercase">Confiabilidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">Carregando...</td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  Nenhum fornecedor cadastrado. Clique em &quot;+ Novo Fornecedor&quot; para comecar.
                </td>
              </tr>
            ) : (
              suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{s.name}</p>
                    {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                    {s.contact_name || '—'}
                    {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">{s.product_count}</td>
                  <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">{s.lead_time_days}d</td>
                  <td className="px-5 py-3 text-center">
                    {s.on_time_delivery_rate !== null ? (
                      <span className={`font-semibold ${s.on_time_delivery_rate >= 90 ? 'text-green-600' : s.on_time_delivery_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {s.on_time_delivery_rate}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`font-semibold ${Number(s.reliability_score) >= 0.9 ? 'text-green-600' : Number(s.reliability_score) >= 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Math.round(Number(s.reliability_score) * 100)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
