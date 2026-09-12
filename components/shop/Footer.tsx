'use client';
/* eslint-disable @next/next/no-img-element -- Logos white-label may come from customer-controlled remote domains. */

import Link from 'next/link';
import { ArrowUpRight, Heart, MessageCircle, PackageCheck, Palette, ShieldCheck } from 'lucide-react';
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

const footerLink = 'text-sm text-gray-400 transition hover:text-white';

export function Footer({ settings }: { settings: StoreSettings }) {
  const whatsappUrl = getWhatsAppUrl(settings);

  return (
    <footer className="relative mt-auto overflow-hidden bg-[#111014] text-white">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1400px] px-4 pt-5 sm:px-6 sm:pt-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 px-5 py-6 shadow-2xl shadow-pink-950/30 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[32px] border-white/10" />
          <div className="relative max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Feito para ter a sua cara</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">Encontrou uma peça que amou?</h2>
            <p className="mt-2 text-sm leading-6 text-white/85">Salve nos favoritos, monte sua lista e acompanhe ofertas exclusivas na sua conta.</p>
          </div>
          <Link href="/account/favorites" className="relative mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-pink-600 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:mt-0 sm:w-auto sm:shrink-0">
            <Heart className="h-4 w-4 fill-current" /> Ver favoritos <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1.1fr] lg:gap-12 lg:py-14">
          <div>
            <Link href="/" className="inline-flex text-2xl font-black tracking-tight" aria-label={`${settings.identity.name} — página inicial`}>
              {settings.identity.logoUrl ? <img src={settings.identity.logoUrl} alt={settings.identity.name} className="h-10 max-w-52 object-contain object-left brightness-0 invert" /> : <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">{settings.identity.shortName}</span>}
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">{settings.identity.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-xs font-bold text-white transition hover:border-emerald-400/40 hover:bg-emerald-400/10">
                  <MessageCircle className="h-4 w-4 text-emerald-400" /> Fale conosco
                </a>
              )}
              {settings.contact.instagram && (
                <a href={settings.contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gray-300 transition hover:border-pink-400/40 hover:bg-pink-400/10 hover:text-pink-300">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.16c3.2 0 3.58.02 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.67 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85c.15-3.23 1.66-4.77 4.92-4.92C8.42 2.18 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" /></svg>
                </a>
              )}
              {settings.contact.tiktok && (
                <a href={settings.contact.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-gray-300 transition hover:border-pink-400/40 hover:bg-pink-400/10 hover:text-pink-300">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.11V9.4a6.27 6.27 0 0 0-.82-.05 6.34 6.34 0 0 0-6.34 6.35A6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.18a8.16 8.16 0 0 0 4.76 1.53v-3.4a4.85 4.85 0 0 1-1-.62Z" /></svg>
                </a>
              )}
            </div>
          </div>

          <FooterColumn title="Descobrir" links={NAVIGATION_LINKS} />
          <FooterColumn title="Sua conta" links={ACCOUNT_LINKS} />

          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Compra tranquila</h2>
            <ul className="mt-5 space-y-4">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-orange-500/15 text-pink-300 ring-1 ring-white/10"><Icon className="h-4 w-4" /></span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Pagamento</span>
              {['PIX', 'Visa', 'Mastercard', 'Elo'].map((method) => <span key={method} className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-bold text-gray-400">{method}</span>)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT))} className="transition hover:text-white">Cookies</button>
              <Link href="/terms#privacidade" className="transition hover:text-white">Privacidade</Link>
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
    <div>
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{title}</h2>
      <ul className="mt-5 space-y-3.5">
        {links.map((link) => <li key={link.href}><Link href={link.href} className={footerLink}>{link.label}</Link></li>)}
      </ul>
    </div>
  );
}
