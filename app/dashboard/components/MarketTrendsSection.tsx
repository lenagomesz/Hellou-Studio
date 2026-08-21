'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface Trend {
  name: string;
  justification: string;
  audience: string;
}

interface Product {
  name: string;
  description: string;
  trend_alignment: string;
}

export function MarketTrendsSection() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ trends: Trend[]; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/ai/market-trends', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to analyze trends');
        return;
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Market Trends Analysis</h2>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Analyze current market trends and get AI-powered suggestions for new products to manufacture.
      </p>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="mb-6 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze Trends
          </>
        )}
      </button>

      {error && (
        <div className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold">Current Market Trends</h3>
            <div className="space-y-3">
              {results.trends.map((trend, idx) => (
                <div key={idx} className="rounded-lg bg-amber-50 p-4">
                  <div className="font-medium text-amber-900">{trend.name}</div>
                  <p className="mt-1 text-sm text-amber-800">{trend.justification}</p>
                  <p className="mt-2 text-xs text-amber-700">Target: {trend.audience}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Suggested New Products</h3>
            <div className="space-y-3">
              {results.products.map((product, idx) => (
                <div key={idx} className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="font-medium text-green-900">{product.name}</div>
                  <p className="mt-1 text-sm text-green-800">{product.description}</p>
                  <p className="mt-2 text-xs font-medium text-green-700">Aligns with: {product.trend_alignment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
