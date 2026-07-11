'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { StockMovementReason } from '@/types/inventory';

interface ProductOptionItem {
  id: string;
  product_id: string;
  name: string;
  stock: number;
  product_name: string;
}

const ADJUSTMENT_REASONS: { value: StockMovementReason; label: string }[] = [
  { value: 'reposicao', label: 'Reposicao (recebeu unidades)' },
  { value: 'ajuste_manual', label: 'Ajuste manual (contagem/correcao)' },
  { value: 'quebra', label: 'Quebra' },
  { value: 'perda', label: 'Perda' },
  { value: 'devolucao', label: 'Devolucao de cliente' },
];

export default function AdjustmentsPage() {
  const [options, setOptions] = useState<ProductOptionItem[]>([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockMovementReason>('reposicao');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  async function fetchOptions() {
    try {
      const res = await fetch('/api/admin/inventory/overview');
      const data = await res.json();
      const items = (data.overview ?? []).map((o: { product_option_id: string; product_id: string; option_name: string; current_stock: number; product_name: string }) => ({
        id: o.product_option_id,
        product_id: o.product_id,
        name: o.option_name,
        stock: o.current_stock,
        product_name: o.product_name,
      }));
      setOptions(items);
    } catch {
      setOptions([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOption || !quantity || parseInt(quantity) === 0) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatorios.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_option_id: selectedOption,
          quantity_change: parseInt(quantity),
          reason,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Estoque ajustado com sucesso!' });
        setSelectedOption('');
        setQuantity('');
        setNotes('');
        fetchOptions(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao ajustar estoque.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexao.' });
    } finally {
      setLoading(false);
    }
  }

  const selectedOptionData = options.find(o => o.id === selectedOption);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajuste de Estoque</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Registre entradas, saidas ou correcoes no estoque.
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          ← Voltar
        </Link>
      </header>

      {message && (
        <div className={`rounded-xl p-4 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5 dark:border-gray-800 dark:bg-gray-900">
        {/* Product Option Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Produto / Variacao *
          </label>
          <select
            value={selectedOption}
            onChange={e => setSelectedOption(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            required
          >
            <option value="">Selecione...</option>
            {options.map(o => (
              <option key={o.id} value={o.id}>
                {o.product_name} — {o.name} (Estoque: {o.stock})
              </option>
            ))}
          </select>
        </div>

        {selectedOptionData && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Estoque atual: <span className="font-bold text-gray-900 dark:text-white">{selectedOptionData.stock}</span> unidades
            </p>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Quantidade *
          </label>
          <p className="text-xs text-gray-400 mb-1">Use valor positivo para entrada, negativo para saida.</p>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Ex: 50 (entrada) ou -5 (saida)"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            required
          />
          {selectedOptionData && quantity && (
            <p className="mt-1 text-xs text-gray-500">
              Novo estoque: <span className="font-semibold">{selectedOptionData.stock + parseInt(quantity || '0')}</span>
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Motivo *
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as StockMovementReason)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            required
          >
            {ADJUSTMENT_REASONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Observacoes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Recebi 50 unidades do fornecedor X, NF 12345"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Registrar Ajuste'}
        </button>
      </form>
    </div>
  );
}
