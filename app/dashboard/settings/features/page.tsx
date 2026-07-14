'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Settings,
  ToggleLeft,
  ToggleRight,
  Search,
  ChevronRight,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Clock,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  category: string;
  icon: string | null;
  route: string | null;
  dependencies: string[];
  setup_required: boolean;
  setup_steps: { title: string; description: string; completed: boolean }[] | null;
  documentation_url: string | null;
  updated_at: string;
  updated_by: string | null;
  health: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    lastChecked: string;
  };
}

interface CategoryGroup {
  category: string;
  meta: { label: string; description: string; color: string };
  flags: FeatureFlag[];
  enabledCount: number;
  totalCount: number;
}

interface SetupPathItem {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  completed: boolean;
}

interface FeaturesData {
  flags: FeatureFlag[];
  categories: CategoryGroup[];
  stats: { total: number; enabled: number; disabled: number; setupRequired: number };
  setupPath: SetupPathItem[];
  setupProgress: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Products: 'from-blue-500 to-blue-600',
  Orders: 'from-green-500 to-green-600',
  Users: 'from-purple-500 to-purple-600',
  Analytics: 'from-orange-500 to-orange-600',
  Automation: 'from-pink-500 to-pink-600',
  Inventory: 'from-teal-500 to-teal-600',
  Integrations: 'from-indigo-500 to-indigo-600',
};

const CATEGORY_BG: Record<string, string> = {
  Products: 'bg-blue-50 dark:bg-blue-950/30',
  Orders: 'bg-green-50 dark:bg-green-950/30',
  Users: 'bg-purple-50 dark:bg-purple-950/30',
  Analytics: 'bg-orange-50 dark:bg-orange-950/30',
  Automation: 'bg-pink-50 dark:bg-pink-950/30',
  Inventory: 'bg-teal-50 dark:bg-teal-950/30',
  Integrations: 'bg-indigo-50 dark:bg-indigo-950/30',
};

export default function FeaturesPage() {
  const [data, setData] = useState<FeaturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/features');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    try {
      const res = await fetch(`/api/admin/features/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error toggling feature:', err);
    } finally {
      setToggling(null);
    }
  };

  const filteredCategories = data?.categories.filter((cat) => {
    if (filterCategory !== 'all' && cat.category !== filterCategory) return false;
    return true;
  }).map((cat) => ({
    ...cat,
    flags: cat.flags.filter((flag) => {
      if (searchTerm && !flag.name.toLowerCase().includes(searchTerm.toLowerCase()) && !flag.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterStatus === 'enabled' && !flag.enabled) return false;
      if (filterStatus === 'disabled' && flag.enabled) return false;
      return true;
    }),
  })).filter((cat) => cat.flags.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Erro ao carregar features. Tente novamente.</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-7 w-7 text-pink-500" />
            Painel de Controle
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie todas as features do sistema em um so lugar
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/settings/audit-log"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <FileText className="h-4 w-4" />
            Audit Log
          </Link>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Features"
          value={data.stats.total}
          icon={<Zap className="h-5 w-5 text-blue-500" />}
          color="blue"
        />
        <StatCard
          label="Ativas"
          value={data.stats.enabled}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          color="green"
        />
        <StatCard
          label="Desativadas"
          value={data.stats.disabled}
          icon={<XCircle className="h-5 w-5 text-gray-400" />}
          color="gray"
        />
        <StatCard
          label="Setup Necessário"
          value={data.stats.setupRequired}
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          color="orange"
        />
      </div>

      {/* Onboarding / Recommended Setup Path */}
      {showOnboarding && data.setupProgress < 1 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Setup Recomendado</h3>
              <p className="text-sm text-indigo-100">Siga este caminho para configurar seu painel</p>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="text-sm text-indigo-200 hover:text-white transition"
            >
              Pular
            </button>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${data.setupProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-indigo-200 mb-4">
            {Math.round(data.setupProgress * 100)}% concluido
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {data.setupPath.map((step, idx) => (
              <div
                key={step.key}
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  step.completed ? 'bg-white/20' : 'bg-white/10'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.completed ? 'bg-green-400 text-green-900' : 'bg-white/30'
                }`}>
                  {step.completed ? '✓' : idx + 1}
                </div>
                <div>
                  <p className="text-xs font-medium">{step.title}</p>
                  <p className="text-[10px] text-indigo-200 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="all">Todas categorias</option>
            <option value="Products">Produtos</option>
            <option value="Orders">Pedidos</option>
            <option value="Users">Usuários</option>
            <option value="Analytics">Analiticos</option>
            <option value="Automation">Automacao</option>
            <option value="Inventory">Estoque</option>
            <option value="Integrations">Integracoes</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="all">Todos status</option>
            <option value="enabled">Ativas</option>
            <option value="disabled">Desativadas</option>
          </select>
        </div>
      </div>

      {/* Feature Categories Grid */}
      <div className="space-y-6">
        {filteredCategories?.map((cat) => (
          <div key={cat.category} className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${CATEGORY_BG[cat.category] ?? ''}`}>
            {/* Category Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[cat.category] ?? 'from-gray-500 to-gray-600'} flex items-center justify-center text-white shadow-sm`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{cat.meta.label}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{cat.meta.description}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-green-600 dark:text-green-400">{cat.enabledCount}</span>
                  /{cat.totalCount} ativas
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cat.flags.map((flag) => (
                <FeatureCard
                  key={flag.key}
                  flag={flag}
                  toggling={toggling === flag.key}
                  onToggle={(enabled) => handleToggle(flag.key, enabled)}
                  onSelect={() => setSelectedFlag(flag)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Detail Modal */}
      {selectedFlag && (
        <FeatureDetailModal
          flag={selectedFlag}
          onClose={() => setSelectedFlag(null)}
          onToggle={(enabled) => {
            handleToggle(selectedFlag.key, enabled);
            setSelectedFlag({ ...selectedFlag, enabled });
          }}
          toggling={toggling === selectedFlag.key}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color: _color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  flag,
  toggling,
  onToggle,
  onSelect,
}: {
  flag: FeatureFlag;
  toggling: boolean;
  onToggle: (enabled: boolean) => void;
  onSelect: () => void;
}) {
  const healthIcon = flag.health.status === 'healthy'
    ? <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
    : flag.health.status === 'warning'
    ? <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
    : <span className="inline-block w-2 h-2 rounded-full bg-red-400" />;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {healthIcon}
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{flag.name}</h4>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(!flag.enabled);
          }}
          disabled={toggling}
          className={`relative transition-opacity ${toggling ? 'opacity-50' : ''}`}
          aria-label={flag.enabled ? 'Desativar' : 'Ativar'}
        >
          {flag.enabled ? (
            <ToggleRight className="h-6 w-6 text-green-500" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-gray-400" />
          )}
        </button>
      </div>
      {flag.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{flag.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {flag.setup_required && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              Setup
            </span>
          )}
          {flag.dependencies.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Deps
            </span>
          )}
        </div>
        <button
          onClick={onSelect}
          className="text-xs text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition opacity-0 group-hover:opacity-100"
        >
          Detalhes <ChevronRight className="inline h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function FeatureDetailModal({
  flag,
  onClose,
  onToggle,
  toggling,
}: {
  flag: FeatureFlag;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
  toggling: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 pb-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{flag.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{flag.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${flag.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {flag.enabled ? 'Ativa' : 'Desativada'}
              </span>
            </div>
            <button
              onClick={() => onToggle(!flag.enabled)}
              disabled={toggling}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                flag.enabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
              } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {flag.enabled ? 'Desabilitar' : 'Habilitar'}
            </button>
          </div>

          {/* Health Status */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Health Check
            </h4>
            <div className={`p-3 rounded-lg border ${
              flag.health.status === 'healthy' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
              flag.health.status === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
              'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-2">
                {flag.health.status === 'healthy' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {flag.health.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {flag.health.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                <span className="text-sm text-gray-700 dark:text-gray-300">{flag.health.message}</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Informacoes
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Categoria</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{flag.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Ultima atualizacao</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date(flag.updated_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {flag.updated_by && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Atualizado por</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{flag.updated_by}</span>
                </div>
              )}
              {flag.dependencies.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Dependencias</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {flag.dependencies.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Setup Steps (if applicable) */}
          {flag.setup_required && flag.setup_steps && flag.setup_steps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4" /> Setup Steps
              </h4>
              <div className="space-y-2">
                {flag.setup_steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {step.completed ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{step.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {flag.route && (
              <Link
                href={flag.route}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition"
              >
                <ExternalLink className="h-4 w-4" /> Ver Página
              </Link>
            )}
            {flag.documentation_url && (
              <a
                href={flag.documentation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <FileText className="h-4 w-4" /> Documentacao
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
