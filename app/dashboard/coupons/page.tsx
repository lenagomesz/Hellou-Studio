'use client';

import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign, Truck, Pencil } from 'lucide-react';
import type { Coupon } from '@/types/database';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    discount_value: '',
    min_purchase: '',
    max_uses: '',
    free_shipping: false,
    expires_at: '',
  });
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    min_purchase: '0',
    max_uses: '',
    expires_at: '',
    free_shipping: false,
    show_in_bonus_area: false,
    exclusive_user_email: '',
    bonus_title: '',
    bonus_description: '',
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: string; code: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        discount_value: form.discount_value ? Number(form.discount_value) : 0,
        min_purchase: Number(form.min_purchase) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        free_shipping: form.free_shipping,
        show_in_bonus_area: form.show_in_bonus_area,
        exclusive_user_email: form.exclusive_user_email,
        bonus_title: form.bonus_title,
        bonus_description: form.bonus_description,
      }),
    });
    if (res.ok) {
      setToast('Cupom criado!');
      setTimeout(() => setToast(''), 3000);
      setShowForm(false);
      setForm({ code: '', discount_type: 'percent', discount_value: '', min_purchase: '0', max_uses: '', expires_at: '', free_shipping: false, show_in_bonus_area: false, exclusive_user_email: '', bonus_title: '', bonus_description: '' });
      fetchCoupons();
    } else {
      try {
        const errorData = await res.json() as { error?: string };
        setToast(errorData.error || 'Erro ao criar cupom');
      } catch {
        setToast('Erro ao criar cupom');
      }
      setTimeout(() => setToast(''), 5000);
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

  async function deleteCoupon(id: string, _code: string) {
    setDeleting(true);
    await fetch('/api/coupons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCoupons(prev => prev.filter(c => c.id !== id));
    setPendingDelete(null);
    setDeleting(false);
    setToast('Cupom excluído');
    setTimeout(() => setToast(''), 3000);
  }

  function startEditing(coupon: Coupon) {
    setEditingId(coupon.id);
    setEditForm({
      discount_value: String(coupon.discount_value),
      min_purchase: String(coupon.min_purchase),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      free_shipping: coupon.free_shipping,
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
    });
  }

  async function saveEdit(id: string) {
    const res = await fetch('/api/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        discount_value: editForm.discount_value ? Number(editForm.discount_value) : 0,
        min_purchase: Number(editForm.min_purchase) || 0,
        max_uses: editForm.max_uses ? Number(editForm.max_uses) : null,
        free_shipping: editForm.free_shipping,
        expires_at: editForm.expires_at || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
      setEditingId(null);
      setToast('Cupom atualizado!');
      setTimeout(() => setToast(''), 3000);
    }
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
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Novo Cupom</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Código do cupom *</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm({...form, code: e.target.value})}
                placeholder="Ex: PROMO10"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tipo *</label>
                <select
                  value={form.discount_type}
                  onChange={e => setForm({...form, discount_type: e.target.value as 'percent' | 'fixed'})}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor (R$)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Valor *</label>
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm({...form, discount_value: e.target.value})}
                  placeholder="Ex: 10"
                  required={!form.free_shipping}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Compra mínima (opcional)</label>
              <input
                type="number"
                value={form.min_purchase}
                onChange={e => setForm({...form, min_purchase: e.target.value})}
                placeholder="R$ 0"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Usos máximos (opcional)</label>
                <input
                  type="number"
                  value={form.max_uses}
                  onChange={e => setForm({...form, max_uses: e.target.value})}
                  placeholder="Ilimitado"
                  min="1"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Expira em (opcional)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm({...form, expires_at: e.target.value})}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                type="checkbox"
                checked={form.free_shipping}
                onChange={e => setForm({...form, free_shipping: e.target.checked})}
                className="rounded"
              />
              <span>Cupom oferece apenas frete grátis</span>
            </label>

            <div className="rounded-2xl border border-pink-200 bg-pink-50/50 p-4 dark:border-pink-500/20 dark:bg-pink-500/5">
              <label className="flex items-center gap-2 text-sm font-semibold text-pink-800 dark:text-pink-300"><input type="checkbox" checked={form.show_in_bonus_area} onChange={e => setForm({...form, show_in_bonus_area: e.target.checked})} className="rounded" /> Exibir na área “Meus Bônus” do cliente</label>
              {form.show_in_bonus_area && <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Título do bônus<input value={form.bonus_title} onChange={e => setForm({...form, bonus_title: e.target.value})} placeholder="Um presente para você" className="mt-1.5 w-full rounded-lg border border-pink-200 bg-white px-3 py-2.5 text-sm dark:border-pink-500/20 dark:bg-gray-800" /></label><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Cliente exclusivo (e-mail)<input type="email" value={form.exclusive_user_email} onChange={e => setForm({...form, exclusive_user_email: e.target.value})} placeholder="Deixe vazio para todos" className="mt-1.5 w-full rounded-lg border border-pink-200 bg-white px-3 py-2.5 text-sm dark:border-pink-500/20 dark:bg-gray-800" /></label><label className="text-xs font-medium text-gray-600 dark:text-gray-300 sm:col-span-2">Mensagem<textarea value={form.bonus_description} onChange={e => setForm({...form, bonus_description: e.target.value})} placeholder="Explique por que este bônus foi liberado" rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-pink-200 bg-white px-3 py-2.5 text-sm dark:border-pink-500/20 dark:bg-gray-800" /></label></div>}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">Criar cupom</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">Cancelar</button>
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
            <div key={coupon.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${coupon.active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {coupon.discount_value === 0 && coupon.free_shipping
                      ? <Truck className="h-5 w-5" />
                      : coupon.discount_type === 'percent' ? <Percent className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
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
                      {coupon.discount_value === 0 && coupon.free_shipping
                        ? 'Só frete grátis'
                        : coupon.discount_type === 'percent' ? `${coupon.discount_value}% off` : formatPrice(coupon.discount_value)}
                      {coupon.min_purchase > 0 && ` · min ${formatPrice(coupon.min_purchase)}`}
                      {coupon.max_uses && ` · ${coupon.used_count}/${coupon.max_uses} usos`}
                      {coupon.expires_at && ` · expira ${new Date(coupon.expires_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => editingId === coupon.id ? setEditingId(null) : startEditing(coupon)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition dark:hover:bg-gray-800" title="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleCoupon(coupon.id, coupon.active)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition dark:hover:bg-gray-800" title={coupon.active ? 'Desativar' : 'Ativar'}>
                    {coupon.active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => setPendingDelete({ id: coupon.id, code: coupon.code })} aria-label={`Excluir cupom ${coupon.code}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Inline Edit Form */}
              {editingId === coupon.id && (
                <div className="border-t border-gray-100 p-4 space-y-4 dark:border-gray-800">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor do desconto</label>
                      <input type="number" value={editForm.discount_value} onChange={e => setEditForm({...editForm, discount_value: e.target.value})} placeholder={editForm.free_shipping ? "0 (opcional)" : "Valor"} min="0" step="0.01" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Compra mínima (R$)</label>
                      <input type="number" value={editForm.min_purchase} onChange={e => setEditForm({...editForm, min_purchase: e.target.value})} min="0" step="0.01" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usos max</label>
                      <input type="number" value={editForm.max_uses} onChange={e => setEditForm({...editForm, max_uses: e.target.value})} placeholder="Ilimitado" min="1" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expira em</label>
                      <input type="date" value={editForm.expires_at} onChange={e => setEditForm({...editForm, expires_at: e.target.value})} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={editForm.free_shipping} onChange={e => setEditForm({...editForm, free_shipping: e.target.checked})} className="rounded" />
                    Frete grátis
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(coupon.id)} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Excluir cupom?" description={`O cupom “${pendingDelete?.code ?? ''}” será removido permanentemente.`} confirmLabel="Excluir" busy={deleting} onCancel={() => setPendingDelete(null)} onConfirm={() => pendingDelete ? deleteCoupon(pendingDelete.id, pendingDelete.code) : undefined} />
    </div>
  );
}
