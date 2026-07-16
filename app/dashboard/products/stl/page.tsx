import Link from 'next/link';
import { ProductTypeTabs } from '@/components/admin/ProductTypeTabs';
import { STLProductForm } from '@/components/admin/STLProductForm';

export default function STLUploadPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <header className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/60 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <Link href="/dashboard/products" className="text-sm text-gray-600 hover:text-gray-900">
          &larr; Voltar para produtos
        </Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Catálogo digital</p>
        <h1 className="mt-1 text-3xl font-bold">Cadastrar produto STL</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Envie o arquivo para download, adicione as imagens de apresentação e configure as informações de venda.
        </p>
      </header>

      <ProductTypeTabs active="digital" />
      <STLProductForm mode="create" />
    </div>
  );
}
