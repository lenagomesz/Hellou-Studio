'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { ReorderTaskStatus } from '@/types/inventory';

interface ReorderTaskRow {
  id: string;
  product_id: string;
  product_option_id: string | null;
  supplier_id: string | null;
  status: ReorderTaskStatus;
  quantity_ordered: number;
  quantity_received: number;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  cost_total: number | null;
  notes: string | null;
  created_at: string;
  product: { name: string } | null;
  option: { name: string } | null;
  supplier: { name: string } | null;
}

const STATUS_CONFIG: Record<ReorderTaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  ordered: { label: 'Encomendado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  in_transit: { label: 'Em trânsito', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  received: { label: 'Recebido', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  canceled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ReorderTasksPage() {
  const [tasks, setTasks] = useState<ReorderTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/inventory/reorder-tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateStatus(taskId: string, newStatus: ReorderTaskStatus) {
    setUpdating(taskId);
    try {
      const res = await fetch('/api/admin/inventory/reorder-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch {
      // silent fail
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tarefas de Reposição</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Acompanhe pedidos de reposição feitos a fornecedores.
          </p>
        </div>
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          ← Voltar
        </Link>
      </header>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Carregando...</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center text-gray-400">Nenhuma tarefa de reposição encontrada.</div>
        ) : (
          tasks.map(task => {
            const statusConf = STATUS_CONFIG[task.status];
            return (
              <div key={task.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        {task.product?.name || 'Produto'}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {task.option?.name && `${task.option.name} · `}
                      {task.supplier?.name && `Fornecedor: ${task.supplier.name} · `}
                      Qtd: {task.quantity_ordered}
                      {task.quantity_received > 0 && ` (Recebido: ${task.quantity_received})`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Criado em {new Date(task.created_at).toLocaleDateString('pt-BR')}
                      {task.estimated_arrival && ` · Previsão: ${new Date(task.estimated_arrival).toLocaleDateString('pt-BR')}`}
                      {task.cost_total && ` · Custo: ${formatPrice(task.cost_total)}`}
                    </p>
                    {task.notes && <p className="text-xs text-gray-400 mt-1 italic">{task.notes}</p>}
                  </div>

                  {/* Actions */}
                  {task.status !== 'received' && task.status !== 'canceled' && (
                    <div className="flex gap-2">
                      {task.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(task.id, 'ordered')}
                          disabled={updating === task.id}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                        >
                          Marcar Encomendado
                        </button>
                      )}
                      {task.status === 'ordered' && (
                        <button
                          onClick={() => updateStatus(task.id, 'in_transit')}
                          disabled={updating === task.id}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                        >
                          Em trânsito
                        </button>
                      )}
                      {(task.status === 'ordered' || task.status === 'in_transit') && (
                        <button
                          onClick={() => updateStatus(task.id, 'received')}
                          disabled={updating === task.id}
                          className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                        >
                          Recebido
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(task.id, 'canceled')}
                        disabled={updating === task.id}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
