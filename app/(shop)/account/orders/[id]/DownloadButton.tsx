'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

interface DownloadButtonProps {
  orderId: string;
  productId: string;
  productName: string;
  orderStatus: string;
}

export default function DownloadButton({ orderId, productId, productName, orderStatus }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  if (orderStatus !== 'delivered') {
    return (
      <div className="mt-2">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
          title="O arquivo será disponível quando o pedido for entregue"
        >
          🔒 Indisponível
        </button>
      </div>
    );
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/download/${productId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Falha ao baixar arquivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productName.replace(/\s+/g, '_')}.stl`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Arquivo baixado com sucesso!');
    } catch (error) {
      console.error('[download] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao baixar arquivo');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-50 transition"
      >
        {downloading ? 'Baixando...' : '📥 Baixar Arquivo'}
      </button>
    </div>
  );
}
