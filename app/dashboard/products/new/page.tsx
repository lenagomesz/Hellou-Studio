import Link from 'next/link';
import { ProductForm } from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <header className="rounded-[26px] bg-[#101218] p-6 text-white sm:p-8">
        <Link
          href="/dashboard/products"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Voltar para produtos
        </Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">Catálogo inteligente</p>
        <h1 className="mt-1 text-3xl font-bold">Criar novo produto</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Defina venda sob demanda ou pronta-entrega. Depois você poderá relacionar variações, cores, material e tempo de produção.
        </p>
      </header>

      <ProductForm mode="create" />
    </div>
  );
}
