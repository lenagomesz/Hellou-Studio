'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfirmDeliveryButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, {
      method: 'POST',
    });
    if (res.ok) {
      setConfirmed(true);
      router.refresh();
    }
    setConfirming(false);
  }

  if (confirmed) {
    return (
      <div className="mt-6 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 p-5 shadow-sm text-center">
        <p className="text-sm font-medium text-green-800 dark:text-green-300">
          Recebimento confirmado! Obrigado.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">Confirmar recebimento</h2>
      <p className="text-xs text-green-700 dark:text-green-400 mb-3">
        Seu pedido foi enviado! Quando receber, confirme aqui para finalizarmos.
      </p>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirming}
        className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {confirming ? 'Confirmando...' : 'Recebi meu pedido'}
      </button>
    </div>
  );
}
