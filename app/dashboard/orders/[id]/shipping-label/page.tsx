'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Copy, Printer, Share2 } from 'lucide-react';
import {
  STORE_SENDER_ADDRESS,
  buildShippingLabelText,
  getShippingLabelRecipient,
} from '@/lib/shipping-label';

type OrderForLabel = {
  id: string;
  shipping_address: Record<string, unknown> | null;
  user: { email: string; name: string | null } | null;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement('textarea');
  field.value = value;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}

export default function ShippingLabelPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderForLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/orders/${id}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os dados do pedido.');
        return response.json() as Promise<OrderForLabel>;
      })
      .then(setOrder)
      .catch((requestError: unknown) => {
        if ((requestError as { name?: string }).name !== 'AbortError') {
          setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a etiqueta.');
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const labelText = useMemo(() => order
    ? buildShippingLabelText(order.user?.name, order.user?.email, order.shipping_address)
    : '', [order]);
  const recipient = useMemo(() => order
    ? getShippingLabelRecipient(order.user?.name, order.user?.email, order.shipping_address)
    : null, [order]);

  async function handleCopy() {
    await copyText(labelText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Envio do pedido #${order?.id.slice(0, 8) ?? ''}`,
          text: labelText,
        });
        return;
      } catch (shareError) {
        if ((shareError as { name?: string }).name === 'AbortError') return;
      }
    }
    await handleCopy();
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl py-16 text-center text-sm text-gray-500">Preparando dados para impressão...</div>;
  }

  if (error || !order || !recipient) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-red-700">{error || 'Pedido não encontrado.'}</p>
        <Link href={`/dashboard/orders/${id}`} className="mt-5 inline-flex text-sm font-semibold text-pink-600 hover:text-pink-700">Voltar ao pedido</Link>
      </div>
    );
  }

  return (
    <main className="shipping-label-print-root mx-auto max-w-[210mm] rounded-3xl bg-white p-5 shadow-sm sm:p-8">
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body * { visibility: hidden !important; }
          .shipping-label-print-root, .shipping-label-print-root * { visibility: visible !important; }
          .shipping-label-print-root { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; color: #111827 !important; }
          .shipping-label-actions { display: none !important; }
          .shipping-label-card { break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>

      <div className="shipping-label-actions mb-7 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/dashboard/orders/${id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-pink-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao pedido
          </Link>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Remetente e destinatário</h1>
          <p className="mt-1 text-xs text-gray-500">Pedido #{order.id.slice(0, 8)} · pronto para imprimir em A4 ou compartilhar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleCopy()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:border-pink-200 hover:text-pink-600">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button type="button" onClick={() => void handleShare()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-700 transition hover:border-pink-200 hover:text-pink-600">
            <Share2 className="h-4 w-4" /> Compartilhar
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      <section className="shipping-label-card overflow-hidden rounded-2xl border-2 border-gray-900 bg-white text-gray-900">
        <AddressBlock label="REMETENTE" tone="sender" address={STORE_SENDER_ADDRESS} />
        <div className="border-t-2 border-dashed border-gray-900" />
        <AddressBlock label="DESTINATÁRIO" tone="recipient" address={recipient} />
      </section>

      <p className="shipping-label-actions mt-4 text-center text-[11px] text-gray-400">
        Na janela de impressão, selecione sua impressora ou “Salvar como PDF” para enviar o arquivo.
      </p>
    </main>
  );
}

function AddressBlock({ label, tone, address }: {
  label: string;
  tone: 'sender' | 'recipient';
  address: {
    name: string;
    streetLine: string;
    complement?: string;
    neighborhood: string;
    cityState: string;
    cep: string;
  };
}) {
  return (
    <div className={`p-7 sm:p-10 ${tone === 'recipient' ? 'bg-orange-50/50' : 'bg-white'}`}>
      <p className="mb-5 text-xs font-black tracking-[0.22em] text-gray-500">{label}</p>
      <p className="text-xl font-black sm:text-2xl">{address.name}</p>
      <div className="mt-4 space-y-1 text-base leading-relaxed sm:text-lg">
        <p>{address.streetLine}</p>
        {address.complement && <p>{address.complement}</p>}
        {address.neighborhood && <p>{address.neighborhood}</p>}
        {address.cityState && <p>{address.cityState}</p>}
      </div>
      {address.cep && <p className="mt-5 font-mono text-xl font-black tracking-wider">CEP: {address.cep}</p>}
    </div>
  );
}
