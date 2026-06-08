'use client';

import { useEffect, useState } from 'react';
import type { Coupon } from '@/types/database';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [freeShipping, setFreeShipping] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void loadCoupons(); }, []);

  async function loadCoupons() {
    setLoading(true);
    const res = await fetch('/api/coupons');
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  }

  function resetForm() {
    setCode('');
    setDiscountType('percent');
    setDiscountValue('');
    setMinPurchase('');
    setMaxUses('');
    setFreeShipping(false);
    setExpiresAt('');
    setFormError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!code.trim()) { setFormError('Código é obrigatório'); return; }

    setSaving(true);
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        min_purchase: Number(minPurchase) || 0,
        max_uses: maxUses ? Number(maxUses) : null,
        free_shipping: freeShipping,
        expires_at: expiresAt || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || 'Erro ao criar cupom');
      setSaving(false);
      return;
    }

    resetForm();
    setShowForm(false);
    setSaving(false);
    void loadCoupons();
  }

  async function toggleActive(coupon: Coupon) {
    await fetch('/api/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
    });
    void loadCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Excluir este cupom?')) return;
    await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' });
    void loadCoupons();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
          <p className="mt-1 text-sm text-gray-600">Gerencie cupons de desconto e frete grátis.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
        >
          {showForm ? 'Cancelar' : 'Novo cupom'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX: PRIMEIRA10"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de desconto</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Valor do desconto {discountType === 'percent' ? '(%)' : '(R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Compra mínima (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Máximo de usos</label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ilimitado"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expira em</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={freeShipping}
              onChange={(e) => setFreeShipping(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">Frete grátis</span>
          </label>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar cupom'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="mt-8 text-center text-sm text-gray-500">
          Nenhum cupom cadastrado.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Desconto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Frete grátis</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usos</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((c) => (
                <tr key={c.id} className={!c.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.discount_value > 0
                      ? c.discount_type === 'percent'
                        ? `${c.discount_value}%`
                        : `R$${c.discount_value.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.free_shipping
                      ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Sim</span>
                      : <span className="text-gray-400">Não</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.used_count}{c.max_uses !== null ? `/${c.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className="text-xs text-gray-600 hover:text-gray-900 transition"
                    >
                      {c.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCoupon(c.id)}
                      className="text-xs text-red-600 hover:text-red-800 transition"
                    >
                      Excluir
                    </button>
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
