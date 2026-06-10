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
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-gray-900/50"
    >
      <div className="aspect-square bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-800">
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
        <p className="text-xs font-medium uppercase tracking-wider text-pink-600 dark:text-pink-400">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </p>
        <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">
          {product.name}
        </h3>
        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
          {formatPrice(product.base_price)}
        </p>
      </div>
    </Link>
  );
}
