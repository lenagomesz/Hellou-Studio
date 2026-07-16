'use client';

import { useState, useEffect, DragEvent } from 'react';
import {
  GripVertical,
  Settings,
  BarChart3,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  Eye,
} from 'lucide-react';

interface KPIData {
  revenue: number;
  orders: number;
  newUsers: number;
  avgTicket: number;
  activeProducts: number;
  totalRevenue: number;
  conversionRate: number;
  ordersToday: number;
}

interface CustomizableKPIsProps {
  data: KPIData;
}

type KPIKey = keyof KPIData;

const KPI_DEFINITIONS: Record<KPIKey, { label: string; icon: typeof DollarSign; format: string }> = {
  revenue: { label: 'Receita do mês', icon: DollarSign, format: 'currency' },
  orders: { label: 'Pedidos', icon: ShoppingCart, format: 'number' },
  newUsers: { label: 'Novos Usuários', icon: Users, format: 'number' },
  avgTicket: { label: 'Ticket Medio', icon: BarChart3, format: 'currency' },
  activeProducts: { label: 'Produtos Ativos', icon: Package, format: 'number' },
  totalRevenue: { label: 'Receita Total', icon: DollarSign, format: 'currency' },
  conversionRate: { label: 'Taxa de Conversao', icon: Eye, format: 'percent' },
  ordersToday: { label: 'Pedidos Hoje', icon: ShoppingCart, format: 'number' },
};

const PRESETS: Record<string, { name: string; kpis: KPIKey[] }> = {
  sales: { name: 'Foco em Vendas', kpis: ['revenue', 'orders', 'avgTicket', 'ordersToday'] },
  inventory: { name: 'Foco em Estoque', kpis: ['activeProducts', 'orders', 'totalRevenue', 'conversionRate'] },
  customers: { name: 'Foco em Clientes', kpis: ['newUsers', 'conversionRate', 'avgTicket', 'orders'] },
};

const DEFAULT_KPIS: KPIKey[] = ['revenue', 'orders', 'avgTicket', 'ordersToday'];
const STORAGE_KEY = 'dashboard-kpis';

function formatValue(value: number, format: string) {
  if (format === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString('pt-BR');
}

export default function CustomizableKPIs({ data }: CustomizableKPIsProps) {
  const [selectedKPIs, setSelectedKPIs] = useState<KPIKey[]>(DEFAULT_KPIS);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as KPIKey[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedKPIs(parsed);
        }
      } catch {
        // ignore invalid stored data
      }
    }
  }, []);

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKPIs));
    setShowSettings(false);
  }

  function toggleKPI(key: KPIKey) {
    setSelectedKPIs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function applyPreset(presetKey: string) {
    const preset = PRESETS[presetKey];
    if (preset) {
      setSelectedKPIs([...preset.kpis]);
    }
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    const updated = [...selectedKPIs];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setSelectedKPIs(updated);
    setDraggedIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">KPIs</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Configurar KPIs"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {showSettings && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Presets</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">KPIs</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(KPI_DEFINITIONS) as KPIKey[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg p-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedKPIs.includes(key)}
                    onChange={() => toggleKPI(key)}
                    className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                  />
                  {KPI_DEFINITIONS[key].label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600"
          >
            Salvar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {selectedKPIs.map((key, index) => {
          const definition = KPI_DEFINITIONS[key];
          if (!definition) return null;
          const Icon = definition.icon;
          const value = data[key];
          const isDragging = draggedIndex === index;

          return (
            <div
              key={key}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900 ${
                isDragging
                  ? 'border-dashed border-pink-300 opacity-50'
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-gray-300 dark:text-gray-600" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-pink-500" />
                    <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {definition.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatValue(value, definition.format)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
