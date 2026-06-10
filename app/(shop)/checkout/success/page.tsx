import Link from 'next/link';
import { ClearCartOnMount } from '@/components/shop/ClearCartOnMount';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ session_id?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <ClearCartOnMount />
      {/* Celebration icon */}
      <div className="relative mx-auto h-24 w-24">
        <div className="absolute inset-0 animate-ping rounded-full bg-green-100 dark:bg-green-800 opacity-20" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-950 shadow-lg shadow-green-100/50 dark:shadow-green-900/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-12 w-12 text-green-500 animate-scale-in"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-up">
        Pedido confirmado!
      </h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        Seu pagamento foi processado com sucesso. Já estamos preparando seu pedido com muito carinho.
      </p>

      {sessionId && (
        <p className="mt-2 font-mono text-xs text-gray-400 animate-fade-in" style={{ animationDelay: '200ms' }}>
          Ref: ...{sessionId.slice(-12).toUpperCase()}
        </p>
      )}

      {/* Progress steps */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        {[
          { step: '✓', title: 'Pagamento recebido', desc: 'Seu pagamento foi processado com sucesso.', done: true },
          { step: '🖨️', title: 'Produção iniciada', desc: 'Sua peça será impressa em até 3 dias úteis.', done: false },
          { step: '📦', title: 'Envio', desc: 'Você receberá o código de rastreamento por email.', done: false },
        ].map(({ step, title, desc, done }) => (
          <div
            key={title}
            className={`rounded-2xl border p-5 shadow-sm transition ${done ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-green-100 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              {step}
            </span>
            <p className={`mt-3 text-sm font-semibold ${done ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>{title}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <Link
          href="/account"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/30 transition-all hover:shadow-xl hover:scale-[1.02]"
        >
          Ver meus pedidos
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:scale-[1.02]"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
