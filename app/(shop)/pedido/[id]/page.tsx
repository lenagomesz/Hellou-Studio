import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Acessar pedido',
  robots: { index: false, follow: false, noarchive: true },
};

export default async function EmailOrderAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destination = `/pedido/${id}`;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(destination)}`);
  }

  const { data: order } = await getSupabaseAdmin()
    .from('orders')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (order) {
    redirect(`/account/orders/${order.id}`);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-12 text-center sm:px-6">
      <div className="w-full rounded-3xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/40 sm:p-8 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-2xl dark:bg-orange-950/40">🔐</span>
        <h1 className="mt-4 text-xl font-bold text-gray-950 dark:text-white">Entre com a conta que fez a compra</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Este pedido não pertence à conta aberta neste navegador. Use o mesmo e-mail que recebeu a confirmação da Hellou Studio.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link href={`/login?callbackUrl=${encodeURIComponent(destination)}`} className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-bold text-white">
            Entrar com outra conta
          </Link>
          <Link href="/account/orders" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200">
            Ver meus pedidos
          </Link>
        </div>
      </div>
    </main>
  );
}
