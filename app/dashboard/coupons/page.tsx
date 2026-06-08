'use client';

import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign, Truck } from 'lucide-react';
import type { Coupon } from '@/types/database';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    min_purchase: '0',
    max_uses: '',
    expires_at: '',
    free_shipping: false,
  });

  async function fetchCoupons() {
    setLoading(true);
    const res = await fetch('/api/coupons');
    if (res.ok) setCoupons(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchCoupons(); }, []);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_purchase: Number(form.min_purchase) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        free_shipping: form.free_shipping,
      }),
    });
    if (res.ok) {
      setToast('Cupom criado!');
      setTimeout(() => setToast(''), 3000);
      setShowForm(false);
      setForm({ code: '', discount_type: 'percent', discount_value: '', min_purchase: '0', max_uses: '', expires_at: '', free_shipping: false });
      fetchCoupons();
    }
  }

  async function toggleCoupon(id: string, active: boolean) {
    await fetch('/api/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c));
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Excluir cupom "${code}"?`)) return;
    await fetch('/api/coupons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCoupons(prev => prev.filter(c => c.id !== id));
    setToast('Cupom excluído');
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cupons</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{coupons.length} cupons cadastrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition">
          <Plus className="h-4 w-4" /> Novo cupom
        </button>
      </header>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={createCoupon} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Criar cupom</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Código (ex: PROMO10)" required className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm uppercase dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value as 'percent' | 'fixed'})} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="percent">Porcentagem (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
            <input type="number" value={form.discount_value} onChange={e => setForm({...form, discount_value: e.target.value})} placeholder="Valor do desconto" required min="0" step="0.01" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input type="number" value={form.min_purchase} onChange={e => setForm({...form, min_purchase: e.target.value})} placeholder="Compra mínima (R$)" min="0" step="0.01" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} placeholder="Usos max (vazio = ilimitado)" min="1" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.free_shipping} onChange={e => setForm({...form, free_shipping: e.target.checked})} className="rounded" />
            Frete grátis
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800">Criar</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">Cancelar</button>
          </div>
        </form>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
          <Tag className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nenhum cupom cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => (
            <div key={coupon.id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${coupon.active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                  {coupon.discount_type === 'percent' ? <Percent className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{coupon.code}</span>
                    {coupon.free_shipping && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        <Truck className="h-2.5 w-2.5" /> Frete grátis
                      </span>
                    )}
                    {!coupon.active && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Inativo</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {coupon.discount_type === 'percent' ? `${coupon.discount_value}% off` : formatPrice(coupon.discount_value)}
                    {coupon.min_purchase > 0 && ` · min ${formatPrice(coupon.min_purchase)}`}
                    {coupon.max_uses && ` · ${coupon.used_count}/${coupon.max_uses} usos`}
                    {coupon.expires_at && ` · expira ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleCoupon(coupon.id, coupon.active)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition dark:hover:bg-gray-800" title={coupon.active ? 'Desativar' : 'Ativar'}>
                  {coupon.active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => deleteCoupon(coupon.id, coupon.code)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
