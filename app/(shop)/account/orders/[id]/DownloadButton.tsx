'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

interface DownloadButtonProps {
  orderId: string;
  productId: string;
  productName: string;
  userId: string;
}

export default function DownloadButton({ orderId, productId, productName, userId }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/download/${productId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName.replace(/\s+/g, '_')}.stl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
        {downloading ? 'Baixando...' : '\u{1F4E5} Baixar Arquivo'}
      </button>
    </div>
  );
}
