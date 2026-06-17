import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← Voltar para produtos
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Novo produto</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Preencha os dados básicos. Após criar, você será redirecionado para adicionar tamanhos, cores e variações.
        </p>
      </header>

      <ProductForm mode="create" />
    </div>
  );
}
