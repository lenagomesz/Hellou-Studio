import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Voltar para produtos
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Novo produto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Preencha os dados básicos. Você poderá adicionar variações depois.
        </p>
      </header>

      <ProductForm mode="create" />
    </div>
  );
}
