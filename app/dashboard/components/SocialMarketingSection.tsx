'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Copy, Loader2, Share2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface Campaign {
  visual_hook: string;
  script: string;
  caption: string;
}

export function SocialMarketingSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch('/api/admin/products');
      if (!response.ok) return;
      const data = await response.json();
      setProducts(data.products || []);
      if (data.products?.[0]) setSelectedProduct(data.products[0].id);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }

  async function generateCampaign() {
    if (!selectedProduct) {
      setError('Select a product');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/ai/social-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to generate campaign');
        return;
      }

      setCampaign(data.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Share2 className="h-5 w-5 text-pink-500" />
        <h2 className="text-lg font-semibold">Social Media Campaign</h2>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Generate viral-ready Reels/TikTok scripts with hook, script, and caption for any product.
      </p>

      <div className="mb-4 flex gap-2">
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select a product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={generateCampaign}
          disabled={loading || !selectedProduct}
          className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 text-white hover:bg-pink-600 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Generate
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {campaign && (
        <div className="space-y-4">
          {(['visual_hook', 'script', 'caption'] as const).map((field) => (
            <div key={field}>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium capitalize">{field.replace(/_/g, ' ')}</label>
                <button
                  onClick={() => copyToClipboard(campaign[field], field)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Copy className="h-3 w-3" />
                  {copiedField === field ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea
                value={campaign[field]}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                rows={field === 'script' ? 6 : 3}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
