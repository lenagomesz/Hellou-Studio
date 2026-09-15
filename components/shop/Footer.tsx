'use client';
/* eslint-disable @next/next/no-img-element -- Logos white-label may come from customer-controlled remote domains. */

import Link from 'next/link';
import { ArrowUpRight, Heart, MessageCircle, PackageCheck, Palette, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { OPEN_PRIVACY_EVENT } from '@/lib/privacy';
import { getWhatsAppUrl, type StoreSettings } from '@/lib/store-settings-schema';

const NAVIGATION_LINKS = [
  { href: '/products', label: 'Catálogo' },
  { href: '/stl', label: 'Arquivos STL' },
  { href: '/request-print', label: 'Encomendas' },
  { href: '/about', label: 'Nossa história' },
] as const;

const ACCOUNT_LINKS = [
  { href: '/account', label: 'Minha conta' },
  { href: '/account/favorites', label: 'Meus favoritos' },
  { href: '/account/orders', label: 'Meus pedidos' },
  { href: '/account/bonus', label: 'Descontos e bônus' },
] as const;

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Pagamento seguro' },
  { icon: Palette, label: 'Feito sob demanda' },
  { icon: PackageCheck, label: 'Envio para todo o Brasil' },
] as const;

const footerLink = 'text-sm text-gray-600 transition hover:text-pink-600 dark:text-gray-400 dark:hover:text-white';

export function Footer({ settings }: { settings: StoreSettings }) {
  const whatsappUrl = getWhatsAppUrl(settings);
  const { status } = useSession();
  const favoritesHref = status === 'unauthenticated'
    ? '/login?callbackUrl=%2Faccount%2Ffavorites&reason=favorite'
    : '/account/favorites';

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-pink-100 bg-gradient-to-b from-pink-50 via-rose-50/80 to-orange-50/70 text-gray-900 dark:border-white/10 dark:bg-[#111014] dark:bg-none dark:text-white">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-600/10" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-500/10" />

      <div className="relative mx-auto max-w-[1400px] px-3 pt-4 min-[380px]:px-4 sm:px-6 sm:pt-6 lg:px-10">
        <section className="rounded-2xl border border-pink-200/70 bg-white/55 px-4 py-3 text-gray-700 shadow-sm backdrop-blur-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-5 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-sm font-bold leading-tight sm:text-base">Encontrou uma peça que amou?</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">Salve para encontrar facilmente depois.</p>
          </div>
          <Link href={favoritesHref} className="mt-2.5 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-pink-200 bg-white/70 px-3 text-xs font-semibold text-pink-600 transition hover:border-pink-300 hover:bg-pink-50 sm:mt-0 sm:w-auto sm:shrink-0 dark:border-white/10 dark:bg-white/[0.04] dark:text-pink-300 dark:hover:bg-white/[0.08]">
            <Heart className="h-3.5 w-3.5" /> Ver favoritos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <div className="grid grid-cols-2 gap-x-5 gap-y-8 py-8 sm:gap-x-8 sm:gap-y-10 sm:py-10 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1.1fr] lg:gap-12 lg:py-12">
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <Link href="/" className="inline-flex text-2xl font-black tracking-tight" aria-label={`${settings.identity.name} — página inicial`}>
              {settings.identity.logoUrl ? <img src={settings.identity.logoUrl} alt={settings.identity.name} className="h-10 max-w-52 object-contain object-left dark:brightness-0 dark:invert" /> : <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent dark:from-pink-400 dark:to-orange-400">{settings.identity.shortName}</span>}
            </Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">{settings.identity.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pink-200 bg-white/70 px-4 text-xs font-bold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:border-emerald-400/40 dark:hover:bg-emerald-400/10">
                  <MessageCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> Fale conosco
                </a>
              )}
              {settings.contact.instagram && (
                <a href={settings.contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-pink-200 bg-white/70 text-pink-500 transition hover:border-pink-300 hover:bg-pink-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:border-pink-400/40 dark:hover:bg-pink-400/10 dark:hover:text-pink-300">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.16c3.2 0 3.58.02 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.67 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85c.15-3.23 1.66-4.77 4.92-4.92C8.42 2.18 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" /></svg>
                </a>
              )}
              {settings.contact.tiktok && (
                <a href={settings.contact.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-pink-200 bg-white/70 text-pink-500 transition hover:border-pink-300 hover:bg-pink-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:border-pink-400/40 dark:hover:bg-pink-400/10 dark:hover:text-pink-300">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.11V9.4a6.27 6.27 0 0 0-.82-.05 6.34 6.34 0 0 0-6.34 6.35A6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.18a8.16 8.16 0 0 0 4.76 1.53v-3.4a4.85 4.85 0 0 1-1-.62Z" /></svg>
                </a>
              )}
            </div>
          </div>

          <FooterColumn title="Descobrir" links={NAVIGATION_LINKS} />
          <FooterColumn title="Sua conta" links={ACCOUNT_LINKS} />

          <div className="col-span-2 min-w-0 lg:col-span-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500/80 dark:text-white/45">Compra tranquila</h2>
            <ul className="mt-4 grid gap-3 min-[520px]:grid-cols-3 lg:grid-cols-1">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-orange-500/15 text-pink-500 ring-1 ring-pink-200 dark:text-pink-300 dark:ring-white/10"><Icon className="h-4 w-4" /></span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-pink-200/70 py-5 dark:border-white/10 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/35">Pagamento</span>
              {['PIX', 'Visa', 'Mastercard', 'Elo'].map((method) => <span key={method} className="rounded-lg border border-pink-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-400">{method}</span>)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-500 dark:text-gray-500 sm:text-xs">
              <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT))} className="transition hover:text-pink-600 dark:hover:text-white">Cookies</button>
              <Link href="/terms#privacidade" className="transition hover:text-pink-600 dark:hover:text-white">Privacidade</Link>
              <span>© {new Date().getFullYear()} {settings.identity.shortName}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: ReadonlyArray<{ href: string; label: string }> }) {
  return (
    <div className="min-w-0">
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500/80 dark:text-white/45">{title}</h2>
      <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5">
        {links.map((link) => <li key={link.href}><Link href={link.href} className={footerLink}>{link.label}</Link></li>)}
      </ul>
    </div>
  );
}
