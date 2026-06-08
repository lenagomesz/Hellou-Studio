import Link from 'next/link';
import type { Product } from '@/types/database';

const CATEGORY_LABELS: Record<string, string> = {
  chaveiros: 'Chaveiros',
  escritorio: 'Escritório',
  criaturas: 'Criaturas',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-square bg-gradient-to-br from-pink-50 to-orange-50">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-pink-200">
            ◇
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-pink-600">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-gray-900">
          {product.name}
        </h3>
        <p className="mt-2 text-base font-semibold text-gray-900">
          {formatPrice(product.base_price)}
        </p>
      </div>
    </Link>
  );
}
