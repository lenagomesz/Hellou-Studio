import Link from 'next/link';
import { MarketTrendsSection } from '../components/MarketTrendsSection';
import { SocialMarketingSection } from '../components/SocialMarketingSection';
import { SEOBlogSection } from '../components/SEOBlogSection';
import { FileText, Zap, TrendingUp, Share2, PenTool, History } from 'lucide-react';

export default function AIDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 via-pink-500 to-blue-500 p-2">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Painel de IA</h1>
              <p className="mt-1 text-gray-600">Análise de tendências, geração de campanhas sociais e conteúdo SEO com Google Gemini</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/ai-dashboard/history"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <History className="h-4 w-4" />
              Histórico
            </Link>
            <Link
              href="/dashboard/ai-dashboard/blog-management"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-4 w-4" />
              Gerenciar Blog
            </Link>
          </div>
        </div>
      </div>

      {/* Sugestões de Crescimento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900">Tendências de Mercado</h3>
              <p className="text-sm text-amber-800 mt-1">Analise tendências atuais e descubra oportunidades de produtos</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100 p-4">
          <div className="flex items-start gap-3">
            <Share2 className="h-5 w-5 text-pink-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-pink-900">Campanhas Virais</h3>
              <p className="text-sm text-pink-800 mt-1">Gere scripts para Reels/TikTok que aumentam visibilidade e vendas</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
          <div className="flex items-start gap-3">
            <PenTool className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900">Blogs Otimizados</h3>
              <p className="text-sm text-blue-800 mt-1">Posts SEO auto-publicados para ranquear no Google e trazer tráfego</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <MarketTrendsSection />
        <SocialMarketingSection />
        <SEOBlogSection />
      </div>
    </div>
  );
}
