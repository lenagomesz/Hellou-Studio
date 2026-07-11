'use client';

import { useState } from 'react';
import type { Order } from '@/types/database';

interface DownloadButtonProps {
  order: Order;
  isDigitalOnly: boolean;
}

export default function DownloadButton({ order, isDigitalOnly }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // If digital-only and in 'approved' status, update to 'delivered'
      if (isDigitalOnly && order.status === 'approved') {
        const response = await fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'delivered' }),
        });

        if (!response.ok) {
          throw new Error('Falha ao atualizar pedido');
        }

        const result = await response.json();
        console.log('[DownloadButton] Status updated:', result);
      }

      // Proceed with download
      const downloadUrl = `/api/orders/${order.id}/download`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.click();
    } catch (err) {
      console.error('[DownloadButton] error:', err);
      setError('Erro ao fazer download. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/30 transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50"
    >
      {isLoading ? 'Processando...' : '📥 Baixar arquivo'}
    </button>
  );
}
