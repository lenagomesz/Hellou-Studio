import Link from 'next/link';
import { MarketTrendsSection } from '../components/MarketTrendsSection';
import { SocialMarketingSection } from '../components/SocialMarketingSection';
import { SEOBlogSection } from '../components/SEOBlogSection';
import { FileText, Zap } from 'lucide-react';

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
          <Link
            href="/dashboard/ai-dashboard/blog-management"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <FileText className="h-4 w-4" />
            Gerenciar Blog
          </Link>
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
