import { MarketTrendsSection } from '../components/MarketTrendsSection';
import { SocialMarketingSection } from '../components/SocialMarketingSection';
import { SEOBlogSection } from '../components/SEOBlogSection';
import { Zap } from 'lucide-react';

export default function AIDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-amber-500 via-pink-500 to-blue-500 p-2">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Painel de IA</h1>
            <p className="mt-1 text-gray-600">Análise de tendências, geração de campanhas sociais e conteúdo SEO com Google Gemini</p>
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
