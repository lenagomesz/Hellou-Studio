import Link from 'next/link';
import Image from 'next/image';

interface RecommendedProduct {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
}

interface ProductRecommendationProps {
  products: RecommendedProduct[];
}

export function ProductRecommendation({ products }: ProductRecommendationProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Produtos Recomendados</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex items-center gap-4 rounded-lg border border-amber-100 bg-white p-3 transition hover:shadow-md"
          >
            {product.image_url && (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
              <p className="text-sm text-amber-700">
                R$ {product.base_price.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
