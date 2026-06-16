'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useCart } from '@/components/shop/CartContext';
import {
  computeItemTotal,
  computeUnitPrice,
  type CartItemView,
} from '@/lib/cart';
import type { ShippingOption } from '@/lib/shipping';
import { ProductRecommendations } from '@/components/shop/ProductRecommendations';
import { PaymentForm } from '@/components/shop/PaymentForm';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const STEPS = [
  { id: 1, label: 'Carrinho' },
  { id: 2, label: 'Entrega' },
  { id: 3, label: 'Pagamento' },
] as const;

export default function CartPage() {
  const { items, total, status, updateQuantity, removeItem, clearCart } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);

  const [shippingCep, setShippingCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [shippingAddress, setShippingAddress] = useState<{ city: string; state: string; street: string; neighborhood: string } | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ code: string; discount_amount: number; description: string; free_shipping?: boolean } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [userCpf, setUserCpf] = useState<string | undefined>(undefined);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const isLoading = status === 'loading';
  const isSyncing = status === 'syncing';

  useEffect(() => {
    if (session?.user) {
      fetch('/api/orders').then(r => r.json()).then((orders) => {
        if (Array.isArray(orders) && orders.length === 0) setIsFirstPurchase(true);
      }).catch(() => {});
      fetch('/api/profile').then(r => r.json()).then((data) => {
        if (data?.cpf) setUserCpf(data.cpf);
      }).catch(() => {});
    }
  }, [session]);

  async function handleCalculateShipping() {
    const digits = shippingCep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setShippingError('Informe um CEP válido com 8 dígitos.');
      return;
    }
    setShippingLoading(true);
    setShippingError('');
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingAddress(null);
    setAddressStreet('');
    setAddressNeighborhood('');

    try {
      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShippingError(data.error || 'Erro ao calcular frete.');
        return;
      }
      setShippingOptions(data.options);
      setShippingAddress(data.address);
      if (data.address.street) setAddressStreet(data.address.street);
      if (data.address.neighborhood) setAddressNeighborhood(data.address.neighborhood);
      if (data.options.length > 0) setSelectedShipping(data.options[0]);
    } catch {
      setShippingError('Erro de conexão. Tente novamente.');
    } finally {
      setShippingLoading(false);
    }
  }

  async function handleApplyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      setCouponError('Informe o código do cupom.');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    setCouponDiscount(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: total }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Cupom inválido.');
        return;
      }
      setCouponDiscount({
        code: data.code,
        discount_amount: data.discount_amount,
        description: data.description,
        free_shipping: data.free_shipping ?? false,
      });
    } catch {
      setCouponError('Erro de conexão. Tente novamente.');
    } finally {
      setCouponLoading(false);
    }
  }


  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0 && !paymentCompleted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-pink-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.5l.41 2.05M6 6h14.25l-1.5 9H7.5L6 6Zm0 0L5.16 1.95M9 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Seu carrinho está vazio</h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Explore nosso catálogo e encontre peças impressas em 3D feitas para você.</p>
        <Link href="/products" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/30 transition hover:opacity-90 hover:shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
          </svg>
          Explorar catálogo
        </Link>
      </div>
    );
  }

  const shippingCost = couponDiscount?.free_shipping ? 0 : (selectedShipping?.price ?? 0);
  const discountAmount = couponDiscount?.discount_amount ?? 0;
  const grandTotal = total - discountAmount + shippingCost;

  return (
    <div>
      {/* Full-width Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-8 text-center sm:px-10 sm:py-10">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          {step === 1 ? 'Meu Carrinho' : step === 2 ? 'Entrega' : 'Finalizar Pedido'}
        </h2>
        <p className="mt-1 text-sm text-white/80">
          {step === 1
            ? `${items.length} ${items.length === 1 ? 'item selecionado' : 'itens selecionados'}`
            : step === 2
              ? 'Informe o endereço de entrega'
              : 'Revise e confirme seu pedido'}
        </p>
      </div>

      <div className={`mx-auto px-4 py-8 sm:px-6 ${step === 3 ? 'max-w-5xl' : 'max-w-3xl'}`}>
      {/* Stepper */}
      <nav className="mb-8">
        <ol className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <li key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => { if (isDone) setStep(s.id); }}
                  disabled={!isDone}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-md shadow-pink-200/40'
                      : isDone
                        ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/50 cursor-pointer'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : isDone ? 'bg-pink-200 text-pink-700' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {isDone ? '✓' : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1 sm:mx-2 h-0.5 w-4 sm:w-8 rounded ${isDone ? 'bg-pink-300' : 'bg-gray-200'}`} />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Cart Items */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} {items.length === 1 ? 'produto' : 'produtos'} no carrinho
            </p>
            <Link href="/products" className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:text-pink-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Adicionar mais
            </Link>
          </div>

          <ul className="space-y-4">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                disabled={isSyncing}
                onIncrease={() => void updateQuantity(item.id, item.quantity + 1)}
                onDecrease={() => void updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                onRemove={() => void removeItem(item.id)}
              />
            ))}
          </ul>

          {/* Coupon */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-pink-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
              </svg>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cupom de desconto</h2>
            </div>
            {couponDiscount ? (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-green-200 bg-green-50/50 p-3">
                <div>
                  <span className="text-sm font-bold text-green-800">{couponDiscount.code}</span>
                  <p className="text-xs text-green-700">{couponDiscount.description}</p>
                </div>
                <button type="button" onClick={() => { setCouponDiscount(null); setCouponCode(''); }} className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Código do cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700"
                />
                <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">
                  {couponLoading ? '...' : 'Aplicar'}
                </button>
              </div>
            )}
            {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
          </div>

          {/* Info banners */}
          {isFirstPurchase && (
            <div className="rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-orange-50 px-4 py-3">
              <p className="text-sm text-pink-700 font-medium">🎉 Primeira compra! Você tem <span className="font-bold">10% de desconto</span> automático no pagamento.</p>
            </div>
          )}
          {total < 0.01 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700 font-medium">O valor mínimo para compra é R$15,00. Adicione mais itens para continuar.</p>
            </div>
          )}
          {total >= 0.01 && total < 99 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <p className="text-sm text-orange-700">Falta <span className="font-semibold">{formatPrice(99 - total)}</span> para frete grátis! 🚚</p>
            </div>
          )}
          {total >= 99 && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm text-green-700 font-medium">🚚 Você ganhou frete grátis!</p>
            </div>
          )}

          {/* Subtotal bar + Next */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Subtotal</p>
                <p className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(total)}</p>
                {couponDiscount && (
                  <p className="mt-0.5 text-xs text-green-700">- {formatPrice(couponDiscount.discount_amount)} desconto</p>
                )}
              </div>
              <button
                type="button"
                disabled={total < 0.01}
                onClick={() => { if (!session) { router.push('/login?callbackUrl=/cart'); return; } setStep(2); }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/30 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                Continuar
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                💬 Atendimento humanizado
              </span>
              <span className="inline-flex items-center gap-1">
                ✨ Bom acabamento
              </span>
              <span className="inline-flex items-center gap-1">
                🔒 Pagamento seguro
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Shipping */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">

          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-5">
            {/* CEP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CEP</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={shippingCep}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
                    setShippingCep(v);
                  }}
                  className="w-40 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleCalculateShipping}
                  disabled={shippingLoading}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {shippingLoading ? (
                    <svg className="h-4 w-4 animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : 'Buscar'}
                </button>
              </div>
              {shippingError && <p className="mt-1 text-xs text-red-600">{shippingError}</p>}
            </div>

            {/* Address fields — shown after CEP lookup */}
            {shippingAddress && (
              <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-5">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-pink-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {shippingAddress.city} - {shippingAddress.state}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rua / Avenida</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto, bloco... (opcional)"
                      value={addressComplement}
                      onChange={(e) => setAddressComplement(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={addressNeighborhood}
                    onChange={(e) => setAddressNeighborhood(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      disabled
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      disabled
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Shipping options */}
            {shippingOptions.length > 0 && !couponDiscount?.free_shipping && (
              <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-5">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Modalidade de envio:</p>
                {shippingOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                      selectedShipping?.id === opt.id
                        ? 'border-pink-400 bg-pink-50/60 dark:bg-pink-950/30 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShipping?.id === opt.id}
                        onChange={() => setSelectedShipping(opt)}
                        className="h-4 w-4 text-pink-500 focus:ring-pink-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{opt.name}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{opt.days_min}-{opt.days_max} dias úteis</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(opt.price)}</span>
                  </label>
                ))}
              </div>
            )}

            {couponDiscount?.free_shipping && shippingAddress && (
              <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 p-4">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Frete grátis aplicado pelo cupom {couponDiscount.code}</p>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Resumo do pedido</h3>
            <ul className="space-y-2 mb-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/30">
                      {item.product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-pink-200">◇</div>
                      )}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                      {item.product.name} <span className="text-gray-400">×{item.quantity}</span>
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{formatPrice(computeItemTotal(item))}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Subtotal</dt>
                <dd className="font-medium">{formatPrice(total)}</dd>
              </div>
              {couponDiscount && (
                <div className="flex justify-between text-green-700 dark:text-green-400">
                  <dt>Desconto ({couponDiscount.code})</dt>
                  <dd className="font-medium">-{formatPrice(discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Frete</dt>
                <dd className="font-medium">
                  {couponDiscount?.free_shipping
                    ? <span className="text-green-700 dark:text-green-400">Grátis</span>
                    : selectedShipping
                      ? formatPrice(selectedShipping.price)
                      : '—'}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                <dt className="text-base font-bold text-gray-900 dark:text-white">Total</dt>
                <dd className="text-base font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">{formatPrice(grandTotal)}</dd>
              </div>
            </dl>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!shippingAddress || !addressStreet.trim() || !addressNumber.trim() || !addressNeighborhood.trim() || (!selectedShipping && !couponDiscount?.free_shipping)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/40 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Revisar pedido
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

          {!shippingAddress && (
            <p className="text-center text-xs text-gray-500">Informe seu CEP para preencher o endereço.</p>
          )}
        </div>
      )}

      {/* Step 3: Payment + Summary (2-col desktop) */}
      {step === 3 && (
        <div className="animate-fade-in">
          {/* Back button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Voltar
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Summary — shows FIRST on mobile (order-1), RIGHT column on desktop (lg:order-2) */}
            <div className="space-y-4 order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
              {/* Items */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Itens ({items.length})</h2>
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-pink-600 hover:text-pink-700 transition">
                    Editar
                  </button>
                </div>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/30">
                          {item.product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-pink-200">◇</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate text-xs">{item.product.name}</p>
                          <p className="text-xs text-gray-400">×{item.quantity}{item.option ? ` · ${item.option.name}` : ''}</p>
                        </div>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-xs">{formatPrice(computeItemTotal(item))}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shipping */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Entrega</h2>
                  <button type="button" onClick={() => setStep(2)} className="text-xs text-pink-600 hover:text-pink-700 transition">
                    Alterar
                  </button>
                </div>
                {shippingAddress && (
                  <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                    <p>{addressStreet}, {addressNumber}{addressComplement ? ` - ${addressComplement}` : ''}</p>
                    <p>{addressNeighborhood} — {shippingAddress.city}/{shippingAddress.state}</p>
                  </div>
                )}
                {selectedShipping && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {selectedShipping.name} · {selectedShipping.days_min}-{selectedShipping.days_max} dias úteis
                  </p>
                )}
                {couponDiscount?.free_shipping && (
                  <p className="mt-1.5 text-xs font-medium text-green-700 dark:text-green-400">Frete grátis (cupom)</p>
                )}
              </div>

              {/* Coupon */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-pink-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cupom</h2>
                </div>
                {couponDiscount ? (
                  <div className="flex items-center justify-between rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 p-3">
                    <div>
                      <span className="text-xs font-bold text-green-800 dark:text-green-300">{couponDiscount.code}</span>
                      <p className="text-xs text-green-700 dark:text-green-400">{couponDiscount.description}</p>
                    </div>
                    <button type="button" onClick={() => { setCouponDiscount(null); setCouponCode(''); }} className="rounded-full p-1 text-gray-400 transition hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700"
                    />
                    <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} className="rounded-xl bg-gray-900 dark:bg-gray-100 px-3 py-2 text-xs font-medium text-white dark:text-gray-900 transition hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
                      {couponLoading ? '...' : 'Aplicar'}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{couponError}</p>}
              </div>

              {/* Totals */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <dt>Subtotal</dt>
                    <dd className="font-medium">{formatPrice(total)}</dd>
                  </div>
                  {couponDiscount && (
                    <div className="flex justify-between text-green-700 dark:text-green-400">
                      <dt>Desconto ({couponDiscount.code})</dt>
                      <dd className="font-medium">-{formatPrice(discountAmount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <dt>Frete</dt>
                    <dd className="font-medium">
                      {couponDiscount?.free_shipping
                        ? <span className="text-green-700 dark:text-green-400">Grátis</span>
                        : selectedShipping
                          ? formatPrice(selectedShipping.price)
                          : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2.5">
                    <dt className="text-base font-bold text-gray-900 dark:text-white">Total</dt>
                    <dd className="text-lg font-bold bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">{formatPrice(grandTotal)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Payment — shows SECOND on mobile (order-2), LEFT column on desktop (lg:order-1) */}
            <div className="order-2 lg:order-1">
              {session ? (
                <PaymentForm
                  grandTotal={grandTotal}
                  shippingCost={shippingCost}
                  couponCode={couponDiscount?.code}
                  shippingAddress={shippingAddress ? {
                    street: addressStreet,
                    number: addressNumber,
                    complement: addressComplement || undefined,
                    neighborhood: addressNeighborhood,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    cep: shippingCep.replace(/\D/g, ''),
                  } : undefined}
                  userCpf={userCpf}
                  onPaymentCompleted={() => setPaymentCompleted(true)}
                />
              ) : (
                <div className="text-center space-y-3 py-12">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Você precisará fazer login para finalizar a compra.</p>
                  <button
                    onClick={() => router.push('/login?callbackUrl=/cart')}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/40 transition hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Fazer login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Sugestões - só mostra no step 1 e abaixo de tudo */}
      {step === 1 && (
        <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
          <ProductRecommendations title="Aproveite e veja também" />
        </div>
      )}
    </div>
  );
}

function CartLine({
  item,
  disabled,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItemView;
  disabled: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  const unit = computeUnitPrice(item);
  const lineTotal = computeItemTotal(item);
  const max = item.option?.stock ?? 99;
  const atMax = item.quantity >= max;

  return (
    <li className="group rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-all hover:shadow-md hover:border-pink-100/60">
      <div className="flex gap-3 sm:gap-4">
        <Link href={`/products/${item.product.id}` as Route} className="flex-shrink-0">
          <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-orange-50 ring-1 ring-gray-100 transition group-hover:ring-pink-100">
            {item.product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl sm:text-3xl text-pink-200">◇</div>
            )}
          </div>
        </Link>

        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/products/${item.product.id}` as Route} className="block truncate text-sm font-semibold text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition">
                {item.product.name}
              </Link>
              {item.option && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  {item.option.color && (
                    <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-gray-200" style={{ backgroundColor: item.option.color }} />
                  )}
                  {item.option.name}
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-400">{formatPrice(unit)} un.</p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="flex-shrink-0 rounded-full p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Remover ${item.product.name}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>

          <div className="mt-auto flex items-end justify-between pt-2">
            <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
              <button
                type="button"
                onClick={onDecrease}
                disabled={disabled || item.quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-l-lg text-gray-600 hover:bg-white hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-40 transition"
                aria-label="Diminuir quantidade"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>
              <span className="flex h-8 min-w-[2rem] items-center justify-center border-x border-gray-200 dark:border-gray-700 px-2 text-sm font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
              <button
                type="button"
                onClick={onIncrease}
                disabled={disabled || atMax}
                className="flex h-8 w-8 items-center justify-center rounded-r-lg text-gray-600 hover:bg-white hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-40 transition"
                aria-label="Aumentar quantidade"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(lineTotal)}</p>
          </div>
        </div>
      </div>
    </li>
  );
}
