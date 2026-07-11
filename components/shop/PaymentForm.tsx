'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, CreditCard, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { formatCpf, isValidCpf, cleanCpf } from '@/lib/cpf';
import { useCart } from '@/components/shop/CartContext';

declare global {
  interface Window {
    MercadoPago: new (publicKey: string) => MercadoPagoInstance;
  }
}

interface MercadoPagoInstance {
  createCardToken(data: CardTokenData): Promise<{ id: string }>;
}

interface CardTokenData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

interface PaymentFormProps {
  grandTotal: number;
  shippingCost: number;
  couponCode?: string;
  shippingAddress?: Record<string, unknown>;
  userCpf?: string;
  onPaymentCompleted?: () => void;
}

export function PaymentForm({
  grandTotal,
  shippingCost,
  couponCode,
  shippingAddress,
  userCpf,
  onPaymentCompleted,
}: PaymentFormProps) {
  const router = useRouter();
  const { clearCart } = useCart();
  const mpRef = useRef<MercadoPagoInstance | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const [cpf, setCpf] = useState(userCpf ? formatCpf(userCpf) : '');
  const [cpfError, setCpfError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit'>('pix');

  // PIX state
  const [pixLoading, setPixLoading] = useState(false);
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [pixOrderId, setPixOrderId] = useState('');

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentOptions, setInstallmentOptions] = useState<Array<{
    installments: number;
    installment_amount: number;
    total_amount: number;
    recommended_message: string;
  }>>([]);
  const [issuerId, setIssuerId] = useState('');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);

  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  function scrollToTop() {
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setErrorAndScroll(msg: string) {
    setError(msg);
    setTimeout(scrollToTop, 100);
  }

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    if (!publicKey) return;

    if (window.MercadoPago) {
      mpRef.current = new window.MercadoPago(publicKey);
      setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => {
      mpRef.current = new window.MercadoPago(publicKey);
      setSdkReady(true);
    };
    document.head.appendChild(script);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchInstallments = useCallback(async (bin: string) => {
    if (bin.length < 6) return;
    setInstallmentsLoading(true);
    try {
      const res = await fetch(
        `/api/payments/mercadopago/installments?bin=${bin}&amount=${grandTotal}`,
      );
      const data = await res.json();
      if (res.ok && data.installments) {
        setInstallmentOptions(data.installments);
        if (data.issuer) setIssuerId(String(data.issuer.id));
      }
    } catch {
      // silent
    } finally {
      setInstallmentsLoading(false);
    }
  }, [grandTotal]);

  useEffect(() => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length >= 6) {
      fetchInstallments(digits.slice(0, 6));
    } else {
      setInstallmentOptions([]);
      setInstallments(1);
    }
  }, [cardNumber, fetchInstallments]);

  function validateCpf(): boolean {
    const digits = cleanCpf(cpf);
    if (!digits || !isValidCpf(digits)) {
      setCpfError('Informe um CPF válido');
      return false;
    }
    setCpfError('');
    return true;
  }

  async function handlePixPayment() {
    if (!validateCpf()) return;
    setPixLoading(true);
    setError('');

    try {
      const res = await fetch('/api/payments/mercadopago/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: 'pix',
          cpf: cleanCpf(cpf),
          shipping_cost: shippingCost,
          coupon_code: couponCode,
          shipping_address: shippingAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorAndScroll(data.error || 'Erro ao gerar PIX');
        setPixLoading(false);
        return;
      }

      setPixQrCode(data.pix_qr_code || '');
      setPixQrBase64(data.pix_qr_code_base64 || '');
      setPixOrderId(data.order_id);
      onPaymentCompleted?.();
      void clearCart();

      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/payments/mercadopago/status/${data.payment_id}`);
          const statusData = await statusRes.json();
          if (statusData.status === 'approved') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPixQrCode('');
            setPixQrBase64('');
            setCardSuccess(data.order_id);
            setTimeout(() => {
              router.push(`/checkout/success?order_id=${data.order_id}`);
            }, 3000);
          }
        } catch {}
      }, 5000);
    } catch {
      setErrorAndScroll('Erro de conexão. Tente novamente.');
    } finally {
      setPixLoading(false);
    }
  }

  async function handleCardPayment() {
    if (!validateCpf()) return;
    if (!mpRef.current) {
      setErrorAndScroll('SDK de pagamento não carregado. Recarregue a página.');
      return;
    }

    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) {
      setErrorAndScroll('Número do cartão inválido');
      return;
    }
    if (!cardName.trim()) {
      setErrorAndScroll('Informe o nome no cartão');
      return;
    }
    const [expMonth, expYear] = cardExpiry.split('/');
    if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length < 2) {
      setErrorAndScroll('Data de validade inválida');
      return;
    }
    if (cardCvv.length < 3) {
      setErrorAndScroll('CVV inválido');
      return;
    }

    setCardLoading(true);
    setError('');

    try {
      const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;
      const tokenResult = await mpRef.current.createCardToken({
        cardNumber: digits,
        cardholderName: cardName.trim(),
        cardExpirationMonth: expMonth,
        cardExpirationYear: fullYear,
        securityCode: cardCvv,
        identificationType: 'CPF',
        identificationNumber: cleanCpf(cpf),
      });

      const res = await fetch('/api/payments/mercadopago/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: 'credit_card',
          token: tokenResult.id,
          installments,
          issuer_id: issuerId || undefined,
          cpf: cleanCpf(cpf),
          shipping_cost: shippingCost,
          coupon_code: couponCode,
          shipping_address: shippingAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorAndScroll(data.error || 'Erro ao processar pagamento');
        setCardLoading(false);
        return;
      }

      if (data.status === 'approved') {
        onPaymentCompleted?.();
        void clearCart();
        setCardLoading(false);
        setCardSuccess(data.order_id);
        setTimeout(() => {
          router.push(`/checkout/success?order_id=${data.order_id}`);
        }, 3000);
      } else if (data.status === 'rejected') {
        setErrorAndScroll(getRejectMessage(data.status_detail));
        setCardLoading(false);
      } else {
        onPaymentCompleted?.();
        void clearCart();
        router.push(`/checkout/success?order_id=${data.order_id}&pending=1`);
      }
    } catch {
      setErrorAndScroll('Erro ao processar pagamento. Verifique os dados e tente novamente.');
      setCardLoading(false);
    }
  }

  async function handleDebitPayment() {
    if (!validateCpf()) return;
    if (!mpRef.current) {
      setErrorAndScroll('SDK de pagamento não carregado. Recarregue a página.');
      return;
    }

    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) {
      setErrorAndScroll('Número do cartão inválido');
      return;
    }
    if (!cardName.trim()) {
      setErrorAndScroll('Informe o nome no cartão');
      return;
    }
    const [expMonth, expYear] = cardExpiry.split('/');
    if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length < 2) {
      setErrorAndScroll('Data de validade inválida');
      return;
    }
    if (cardCvv.length < 3) {
      setErrorAndScroll('CVV inválido');
      return;
    }

    setCardLoading(true);
    setError('');

    try {
      const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;
      const tokenResult = await mpRef.current.createCardToken({
        cardNumber: digits,
        cardholderName: cardName.trim(),
        cardExpirationMonth: expMonth,
        cardExpirationYear: fullYear,
        securityCode: cardCvv,
        identificationType: 'CPF',
        identificationNumber: cleanCpf(cpf),
      });

      const res = await fetch('/api/payments/mercadopago/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: 'debit_card',
          token: tokenResult.id,
          installments: 1,
          cpf: cleanCpf(cpf),
          shipping_cost: shippingCost,
          coupon_code: couponCode,
          shipping_address: shippingAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorAndScroll(data.error || 'Erro ao processar pagamento');
        setCardLoading(false);
        return;
      }

      if (data.status === 'approved') {
        onPaymentCompleted?.();
        void clearCart();
        setCardLoading(false);
        setCardSuccess(data.order_id);
        setTimeout(() => {
          router.push(`/checkout/success?order_id=${data.order_id}`);
        }, 3000);
      } else if (data.status === 'rejected') {
        setErrorAndScroll(getRejectMessage(data.status_detail));
        setCardLoading(false);
      } else {
        onPaymentCompleted?.();
        void clearCart();
        router.push(`/checkout/success?order_id=${data.order_id}&pending=1`);
      }
    } catch {
      setErrorAndScroll('Erro ao processar pagamento. Verifique os dados e tente novamente.');
      setCardLoading(false);
    }
  }

  function copyPixCode() {
    navigator.clipboard.writeText(pixQrCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  }

  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  // Card approved screen
  if (cardSuccess) {
    return (
      <div className="space-y-4" ref={formTopRef}>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pagamento aprovado!</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Seu pedido foi confirmado com sucesso.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Redirecionando para confirmação...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card processing screen
  if (cardLoading) {
    return (
      <div className="space-y-4" ref={formTopRef}>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Processando pagamento</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Estamos validando sua transação. Não feche esta página.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Isso pode levar alguns segundos...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PIX waiting screen
  if (pixQrBase64 || pixQrCode) {
    return (
      <div className="space-y-4" ref={formTopRef}>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-5 w-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">PIX gerado</h3>
          </div>

          {pixQrBase64 && (
            <div className="flex justify-center mb-4">
              <img
                src={`data:image/png;base64,${pixQrBase64}`}
                alt="QR Code PIX"
                className="h-48 w-48 rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}

          {pixQrCode && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Código copia e cola:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixQrCode}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 font-mono truncate"
                />
                <button
                  onClick={copyPixCode}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 transition"
                >
                  {pixCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {pixCopied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600 dark:text-yellow-400" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Aguardando pagamento... O código expira em 30 minutos.
            </p>
          </div>

          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 text-center">
            Pode sair desta página — seu pedido ficará como &quot;aguardando pagamento&quot; e será confirmado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={formTopRef}>
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Forma de pagamento</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Escolha como deseja pagar</p>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-4 py-3 animate-shake">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* CPF field if user doesn't have one */}
          {!userCpf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                CPF <span className="text-gray-400 font-normal">(obrigatório)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => {
                  setCpf(formatCpf(e.target.value));
                  setCpfError('');
                }}
                className={`w-full rounded-xl border ${cpfError ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'} bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30`}
              />
              {cpfError && <p className="mt-1 text-xs text-red-500">{cpfError}</p>}
            </div>
          )}


          {/* Payment method tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setPaymentMethod('pix')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition ${
                paymentMethod === 'pix'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <QrCode className="h-4 w-4 shrink-0" />
              PIX
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('credit')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition ${
                paymentMethod === 'credit'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Crédito</span>
              <span className="sm:hidden">Crédito</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('debit')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition ${
                paymentMethod === 'debit'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Débito</span>
              <span className="sm:hidden">Débito</span>
            </button>
          </div>

          {/* PIX content */}
          {paymentMethod === 'pix' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                  <QrCode className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Pagamento instantâneo</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Aprovação imediata, sem taxas adicionais</p>
                </div>
              </div>

              <button
                onClick={handlePixPayment}
                disabled={pixLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {pixLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando código PIX...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" />
                    Gerar código PIX
                  </>
                )}
              </button>
            </div>
          )}

          {/* Credit card content */}
          {paymentMethod === 'credit' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                  <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Cartão de crédito</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Parcele em até 12x com juros</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Número do cartão</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome impresso no cartão</label>
                <input
                  type="text"
                  placeholder="Como aparece no cartão"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Validade</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">CVV</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>
              </div>

              {installmentOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Parcelas</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  >
                    {installmentOptions.map((opt) => (
                      <option key={opt.installments} value={opt.installments}>
                        {opt.recommended_message}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {installmentsLoading && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Buscando parcelas...
                </p>
              )}

              {!installmentsLoading && installmentOptions.length === 0 && cardNumber.replace(/\D/g, '').length < 6 && (
                <p className="text-[11px] text-gray-400">Até 3x sem juros disponível</p>
              )}

              <button
                onClick={handleCardPayment}
                disabled={cardLoading || !sdkReady}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-200/40 dark:shadow-none transition hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {cardLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pagar com Crédito
                  </>
                )}
              </button>
            </div>
          )}

          {/* Debit card content */}
          {paymentMethod === 'debit' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Débito à vista</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Pagamento debitado diretamente da sua conta</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Número do cartão</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Nome impresso no cartão</label>
                <input
                  type="text"
                  placeholder="Como aparece no cartão"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Validade</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">CVV</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  />
                </div>
              </div>

              <button
                onClick={handleDebitPayment}
                disabled={cardLoading || !sdkReady}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200/40 dark:shadow-none transition hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {cardLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pagar com Débito
                  </>
                )}
              </button>
            </div>
          )}

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-4 mt-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Pagamento seguro
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Dados criptografados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRejectMessage(detail?: string): string {
  const messages: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Saldo insuficiente. Tente outro cartão.',
    cc_rejected_bad_filled_security_code: 'CVV incorreto. Verifique e tente novamente.',
    cc_rejected_bad_filled_date: 'Data de validade incorreta.',
    cc_rejected_bad_filled_other: 'Dados do cartão incorretos. Verifique e tente novamente.',
    cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro método.',
    cc_rejected_call_for_authorize: 'Autorize o pagamento junto ao banco emissor.',
    cc_rejected_card_disabled: 'Cartão desabilitado. Contacte seu banco.',
    cc_rejected_max_attempts: 'Limite de tentativas. Tente outro cartão.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado detectado.',
  };
  return messages[detail || ''] || 'Pagamento recusado. Tente outro cartão ou método de pagamento.';
}
