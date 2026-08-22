'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  TrendingUp,
  Share2,
  PenTool,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Target,
  FileText,
  History,
} from 'lucide-react';

interface StatsData {
  totalGenerations: number;
  totalTokens: number;
  generationsByType: Record<string, number>;
}

export default function AIPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/ai/history');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();

        const totalGenerations = data.pagination?.total || 0;
        const totalTokens = data.data?.reduce((sum: number, entry: { tokens_used?: number }) => sum + (entry.tokens_used || 0), 0) || 0;
        const generationsByType: Record<string, number> = {};

        data.data?.forEach((entry: { feature_type: string }) => {
          generationsByType[entry.feature_type] = (generationsByType[entry.feature_type] || 0) + 1;
        });

        setStats({ totalGenerations, totalTokens, generationsByType });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: 'Análise de Tendências',
      description: 'Identifique tendências de mercado em tempo real e receba sugestões de novos produtos',
      href: '/dashboard/ai-dashboard',
      color: 'from-amber-500 to-amber-600',
      action: 'Analisar Tendências',
    },
    {
      icon: Share2,
      title: 'Campanhas Virais',
      description: 'Gere scripts profissionais para Reels, TikTok e redes sociais com hooks, scripts e legendas',
      href: '/dashboard/ai-dashboard',
      color: 'from-pink-500 to-pink-600',
      action: 'Criar Campanha',
    },
    {
      icon: PenTool,
      title: 'Blog SEO',
      description: 'Posts otimizados para Google que ranqueiam naturalmente e trazem tráfego orgânico',
      href: '/dashboard/ai-dashboard',
      color: 'from-blue-500 to-blue-600',
      action: 'Gerar Blog',
    },
    {
      icon: FileText,
      title: 'Gerenciar Blog',
      description: 'Revise, aprove ou rejeite posts gerados automaticamente antes de publicar',
      href: '/dashboard/ai-dashboard/blog-management',
      color: 'from-purple-500 to-purple-600',
      action: 'Gerenciar',
    },
    {
      icon: History,
      title: 'Histórico',
      description: 'Visualize, edite e delete todas as gerações de IA com análise de tokens usados',
      href: '/dashboard/ai-dashboard/history',
      color: 'from-green-500 to-green-600',
      action: 'Ver Histórico',
    },
  ];

  const tips = [
    {
      icon: Target,
      title: 'Estratégia de Conteúdo',
      description: 'Gere 1-2 blogs por semana para manter seu site fresco e ranquear melhor no Google',
    },
    {
      icon: Share2,
      title: 'Social Media Viral',
      description: 'Crie campanhas para TODOS os produtos semanalmente e publique em múltiplas plataformas',
    },
    {
      icon: Sparkles,
      title: 'Análise Contínua',
      description: 'Use análises de tendências para descobrir oportunidades antes da concorrência',
    },
    {
      icon: BarChart3,
      title: 'Otimizar Gastos',
      description: 'Monitore tokens usados no histórico para manter custos baixos e ROI alto',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-gradient-to-br from-amber-500 via-pink-500 to-blue-500 p-2">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Inteligência Artificial</h1>
        </div>
        <p className="text-gray-600">
          Aproveite a IA para gerar conteúdo, analisar mercado e criar campanhas virais que aumentam suas vendas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-600 mb-2">Total de Gerações</div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : (
            <div className="text-3xl font-bold text-gray-900">{stats?.totalGenerations || 0}</div>
          )}
        </div>

        <div className="rounded-lg border border-gradient-to-r from-amber-200 to-amber-100 bg-gradient-to-br from-amber-50 to-amber-100 p-6">
          <div className="text-sm text-amber-900 font-medium mb-2">Tokens Utilizados</div>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          ) : (
            <div className="text-3xl font-bold text-amber-700">{stats?.totalTokens?.toLocaleString() || 0}</div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-sm text-gray-600 mb-2">Limite Disponível</div>
          <div className="text-3xl font-bold text-gray-900">∞</div>
          <div className="text-xs text-gray-500 mt-1">Gratuito com chave AQ</div>
        </div>
      </div>

      {/* Main Features Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">Recursos Principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="group rounded-lg border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`rounded-lg bg-gradient-to-br ${feature.color} p-3`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                <button className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  {feature.action}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tips Section */}
      <div>
        <h2 className="text-xl font-bold mb-4">💡 Dicas para Crescimento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip) => {
            const IconComponent = tip.icon;
            return (
              <div key={tip.title} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <IconComponent className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-900">{tip.title}</h4>
                    <p className="text-sm text-blue-800 mt-1">{tip.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Uso por Tipo</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div>
                <div className="text-sm text-gray-600">Tendências</div>
                <div className="font-semibold">{stats.generationsByType.market_trends || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div>
                <div className="text-sm text-gray-600">Campanhas</div>
                <div className="font-semibold">{stats.generationsByType.social_campaign || 0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <div className="text-sm text-gray-600">Blogs</div>
                <div className="font-semibold">{stats.generationsByType.blog_post || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900">Modelo Ativo: Gemini 3.6 Flash</h4>
          <p className="text-sm text-blue-800 mt-1">
            Modelo mais econômico e rápido do Google. Sem custos enquanto você tiver créditos disponíveis.
            <Link href="/dashboard/ai-dashboard/history" className="ml-1 font-semibold underline hover:no-underline">
              Veja seu histórico
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
