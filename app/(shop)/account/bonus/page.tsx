import { redirect } from 'next/navigation';
import { Gift, Sparkles, Tag } from 'lucide-react';
import { getCurrentUser } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Coupon } from '@/types/database';

export default async function BonusPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/account/bonus');

  const admin = getSupabaseAdmin();
  const { data } = await admin.from('coupons').select('*').eq('active', true).eq('show_in_bonus_area', true).or(`exclusive_user_id.is.null,exclusive_user_id.eq.${user.id}`).order('created_at', { ascending: false });
  const coupons = (data ?? []).filter((coupon: Coupon) => !coupon.expires_at || new Date(coupon.expires_at) >= new Date()) as Coupon[];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <header className="relative overflow-hidden rounded-[28px] bg-[#101218] p-7 text-white sm:p-9"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pink-500/25 blur-3xl" /><div className="relative"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 shadow-lg"><Gift className="h-6 w-6" /></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">Clube Hellou</p><h1 className="mt-1 text-3xl font-bold">Seus bônus exclusivos</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Vantagens liberadas especialmente para sua conta. Use o código no carrinho antes que expire.</p></div></header>
      {coupons.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#12151d]"><Sparkles className="mx-auto h-9 w-9 text-pink-400" /><p className="mt-3 font-semibold">Novos bônus aparecerão aqui</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Continue acompanhando — a Hellou prepara surpresas para clientes especiais.</p></div> : <div className="grid gap-4 md:grid-cols-2">{coupons.map((coupon) => <article key={coupon.id} className="relative overflow-hidden rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-5 shadow-sm dark:border-pink-500/20 dark:from-[#151821] dark:to-[#251421] dark:text-white"><div className="flex items-start justify-between gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-600 text-white"><Tag className="h-5 w-5" /></span>{coupon.exclusive_user_id && <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-800 dark:bg-yellow-300 dark:text-yellow-950">Só para você</span>}</div><h2 className="mt-5 text-xl font-bold">{coupon.bonus_title || (coupon.free_shipping ? 'Frete por nossa conta' : `${coupon.discount_value}${coupon.discount_type === 'percent' ? '%' : ' reais'} de desconto`)}</h2>{coupon.bonus_description && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{coupon.bonus_description}</p>}<div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-pink-300 bg-white/70 px-4 py-3 dark:border-pink-500/30 dark:bg-black/20"><code className="text-lg font-black tracking-widest text-pink-700 dark:text-pink-300">{coupon.code}</code><span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">copie no carrinho</span></div>{coupon.expires_at && <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Válido até {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}</p>}</article>)}</div>}
    </div>
  );
}
