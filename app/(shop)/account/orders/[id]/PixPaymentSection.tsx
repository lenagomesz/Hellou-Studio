'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PixPaymentSectionProps {
  mpPaymentId: string;
  orderId: string;
}

export default function PixPaymentSection({ mpPaymentId, orderId }: PixPaymentSectionProps) {
  const router = useRouter();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(true);
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');
  const [pixExpiration, setPixExpiration] = useState('');
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    async function fetchPixData() {
      try {
        const res = await fetch(`/api/payments/mercadopago/status/${mpPaymentId}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();

        if (data.status === 'approved') {
          setApproved(true);
          setLoading(false);
          router.refresh();
          return;
        }

        if (data.pix_qr_code) {
          setPixQrCode(data.pix_qr_code);
          setPixQrBase64(data.pix_qr_code_base64 || '');
          setPixExpiration(data.pix_expiration || '');
        }

        if (data.pix_expiration && new Date(data.pix_expiration) < new Date()) {
          setExpired(true);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchPixData();

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/mercadopago/status/${mpPaymentId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setApproved(true);
          router.refresh();
        }
      } catch {}
    }, 5000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [mpPaymentId, router]);

  useEffect(() => {
    if (!pixExpiration) return;
    const checkExpiry = setInterval(() => {
      if (new Date(pixExpiration) < new Date()) {
        setExpired(true);
        clearInterval(checkExpiry);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 10000);
    return () => clearInterval(checkExpiry);
  }, [pixExpiration]);

  function copyPixCode() {
    navigator.clipboard.writeText(pixQrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function getTimeRemaining(): string {
    if (!pixExpiration) return '';
    const diff = new Date(pixExpiration).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min restantes`;
    const hours = Math.floor(mins / 60);
    return `${hours}h${mins % 60}min`;
  }

  if (loading) {
    return (
      <div className="mb-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-pink-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dados do PIX...</p>
        </div>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="mb-8 rounded-2xl border border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 text-green-600 dark:text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Pagamento confirmado!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Seu PIX foi recebido com sucesso.</p>
          </div>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="mb-8 rounded-2xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">PIX expirado</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">O código expirou. Faça um novo pedido para gerar outro.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pixQrCode && !pixQrBase64) {
    return (
      <div className="mb-8 rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-yellow-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Aguardando pagamento</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Será confirmado automaticamente quando o PIX for detectado.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-600 dark:text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Pague com PIX</h2>
        </div>
        {pixExpiration && (
          <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-2.5 py-1 text-[10px] font-medium text-green-700 dark:text-green-300">
            {getTimeRemaining()}
          </span>
        )}
      </div>

      {/* QR Code */}
      {pixQrBase64 && (
        <div className="flex justify-center mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pixQrBase64}`}
            alt="QR Code PIX"
            className="h-44 w-44 sm:h-52 sm:w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-2"
          />
        </div>
      )}

      {/* Copia e cola */}
      {pixQrCode && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Código copia e cola:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={pixQrCode}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 font-mono truncate focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            <button
              onClick={copyPixCode}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-green-700 transition active:scale-[0.97] shrink-0"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Copiar código
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-green-500" />
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Aguardando pagamento — será confirmado automaticamente.
        </p>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 text-center">
        Abra o app do banco, escaneie o QR Code ou cole o código na opção &quot;PIX copia e cola&quot;.
      </p>
    </div>
  );
}
