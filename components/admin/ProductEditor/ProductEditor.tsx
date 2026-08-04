'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { ProductEditorState } from './types/editor-state';
import { ProductEditorProvider } from './ProductEditorContext';
import { VariationsSection } from './sections/VariationsSection';
import { createInitialEditorState } from './types/editor-state';

type ProductEditorProps =
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: any };

function ProductEditorContent({ mode }: { mode: 'create' | 'edit' }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(
        mode === 'create' ? '/api/admin/products' : '/api/admin/products/123',
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) throw new Error('Erro ao salvar');

      router.push('/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <header className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50/70 to-orange-50 p-6 text-slate-950 shadow-sm sm:p-8">
        <Link
          href="/dashboard/products"
          className="text-sm text-slate-500 hover:text-pink-600"
        >
          ← Voltar para produtos
        </Link>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">
          Catálogo inteligente
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          {mode === 'create' ? 'Cadastrar' : 'Editar'} produto
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <VariationsSection />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-pink-600 text-white py-3 font-medium hover:bg-pink-700 disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : 'Salvar Produto'}
          </button>
          <Link
            href="/dashboard/products"
            className="flex-1 rounded-lg border border-gray-300 py-3 text-center font-medium hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

export function ProductEditor(props: ProductEditorProps) {
  const initialState = createInitialEditorState(props.mode, props.product);

  return (
    <ProductEditorProvider initialState={initialState}>
      <ProductEditorContent mode={props.mode} />
    </ProductEditorProvider>
  );
}
