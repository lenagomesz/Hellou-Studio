'use client';

import Link from 'next/link';
import { WHATSAPP_URL } from '@/components/shop/WhatsAppButton';
import { OPEN_PRIVACY_EVENT } from '@/lib/privacy';

const NAVIGATION_LINKS = [
  { href: '/products', label: 'Catálogo' },
  { href: '/stl', label: 'Arquivos STL' },
  { href: '/request-print', label: 'Encomendas' },
  { href: '/about', label: 'Sobre a Hellou' },
] as const;

const ACCOUNT_LINKS = [
  { href: '/account', label: 'Minha conta' },
  { href: '/account/orders', label: 'Meus pedidos' },
  { href: '/account/requests', label: 'Minhas solicitações' },
  { href: '/account/bonus', label: 'Meus bônus' },
] as const;

const GUARANTEES = [
  { icon: '🔒', label: 'Pagamento seguro' },
  { icon: '🎨', label: 'Produzido sob demanda' },
  { icon: '📦', label: 'Envio para todo o Brasil' },
  { icon: '💬', label: 'Atendimento humanizado' },
] as const;

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
    </svg>
  );
}

const linkClass =
  'group inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400';

export function Footer() {
  return (
    <footer className="relative mt-auto w-full overflow-hidden border-t border-pink-100 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-400/80 to-transparent" />
      <div className="pointer-events-none absolute -left-36 top-8 h-80 w-80 rounded-full bg-pink-100/55 blur-3xl dark:hidden" />
      <div className="pointer-events-none absolute -right-36 bottom-0 h-80 w-80 rounded-full bg-orange-100/55 blur-3xl dark:hidden" />

      <div className="relative w-full px-5 py-10 sm:px-8 lg:px-12 lg:py-14 xl:px-16">
        <div className="grid grid-cols-2 gap-x-7 gap-y-10 md:grid-cols-4 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex text-2xl font-bold tracking-tight" aria-label="Hellou Studio — página inicial">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">helloustudio</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
              Produtos e arquivos para impressão 3D, criados com carinho, personalidade e cuidado em cada camada.
            </p>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              <WhatsAppIcon />
              Fale conosco
            </a>

            <div className="mt-4 flex gap-2">
              <a href="https://instagram.com/helloustudio_" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-pink-900 dark:hover:bg-pink-950/30 dark:hover:text-pink-400">
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
              </a>
              <a href="https://www.tiktok.com/@helloustudio_" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-pink-900 dark:hover:bg-pink-950/30 dark:hover:text-pink-400">
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.11V9.4a6.27 6.27 0 0 0-.82-.05 6.34 6.34 0 0 0-6.34 6.35A6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.18a8.16 8.16 0 0 0 4.76 1.53v-3.4a4.85 4.85 0 0 1-1-.62z" /></svg>
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Navegação</h2>
            <ul className="mt-4 space-y-3">
              {NAVIGATION_LINKS.map((link) => (
                <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}<span aria-hidden="true" className="opacity-0 transition group-hover:opacity-100">→</span></Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Conta</h2>
            <ul className="mt-4 space-y-3">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}<span aria-hidden="true" className="opacity-0 transition group-hover:opacity-100">→</span></Link></li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Garantias</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-1">
              {GUARANTEES.map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                  <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-sm dark:bg-pink-950/30">{item.icon}</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative w-full border-t border-pink-100/70 bg-pink-50/45 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex w-full flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12 xl:px-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Pagamento</span>
            {['PIX', 'Visa', 'Mastercard', 'Elo'].map((method) => (
              <span key={method} className="rounded-lg border border-gray-200/80 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">{method}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT))} className="transition hover:text-pink-600 dark:hover:text-pink-400">Preferências de cookies</button>
            <Link href="/terms#privacidade" className="transition hover:text-pink-600 dark:hover:text-pink-400">Privacidade</Link>
            <span>© {new Date().getFullYear()} helloustudio. Todos os direitos reservados.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
