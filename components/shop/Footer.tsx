'use client';

import Link from 'next/link';
import { WHATSAPP_URL } from '@/components/shop/WhatsAppButton';

const FOOTER_GROUPS = [
  {
    title: 'Descobrir',
    links: [
      { href: '/products', label: 'Catálogo' },
      { href: '/stl', label: 'Arquivos STL' },
      { href: '/request-print', label: 'Encomendas' },
      { href: '/about', label: 'Sobre a Hellou' },
    ],
  },
  {
    title: 'Minha conta',
    links: [
      { href: '/account', label: 'Meu perfil' },
      { href: '/account/orders', label: 'Meus pedidos' },
      { href: '/account/requests', label: 'Minhas solicitações' },
      { href: '/account/bonus', label: 'Meus bônus' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { href: '/cart', label: 'Carrinho' },
      { href: '/login', label: 'Entrar' },
      { href: '/register', label: 'Criar conta' },
      { href: '/terms', label: 'Termos de uso' },
    ],
  },
] as const;

const BENEFITS = [
  {
    title: 'Produção cuidadosa',
    description: 'Peças feitas sob demanda',
    color: 'from-pink-500 to-rose-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 2.75 8.5 4.75L12 12.25 3.5 7.5 12 2.75Zm-8.5 9L12 16.5l8.5-4.75m-17 5L12 21.5l8.5-4.75" />
      </svg>
    ),
  },
  {
    title: 'Pagamento protegido',
    description: 'Compra simples e segura',
    color: 'from-violet-500 to-pink-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1Zm6 4v2" />
      </svg>
    ),
  },
  {
    title: 'Atendimento próximo',
    description: 'Acompanhamento de verdade',
    color: 'from-orange-500 to-amber-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a8 8 0 0 1 16 0M4 13v4a2 2 0 0 0 2 2h1v-7H4v1Zm16 0v4a2 2 0 0 1-2 2h-1v-7h3v1ZM17 19c0 1.1-.9 2-2 2h-3" />
      </svg>
    ),
  },
] as const;

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-pink-100/70 bg-[#fffaf8] dark:border-white/10 dark:bg-[#120d0c]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-400 to-transparent" />
      <div className="pointer-events-none absolute -left-40 top-12 h-80 w-80 rounded-full bg-pink-200/25 blur-3xl dark:bg-pink-950/15" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-950/15" />

      <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
        <section className="grid overflow-hidden rounded-2xl border border-pink-100/80 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] md:grid-cols-3" aria-label="Benefícios da Hellou Studio">
          {BENEFITS.map((benefit, index) => (
            <div
              key={benefit.title}
              className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? 'border-t border-pink-100/70 dark:border-white/10 md:border-l md:border-t-0' : ''}`}
            >
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${benefit.color} text-white shadow-sm`}>
                {benefit.icon}
              </span>
              <span>
                <strong className="block text-sm font-bold text-gray-900 dark:text-white">{benefit.title}</strong>
                <small className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{benefit.description}</small>
              </span>
            </div>
          ))}
        </section>

        <div className="mt-5 overflow-hidden rounded-[26px] border border-pink-100/80 bg-white/80 shadow-[0_20px_60px_rgba(120,60,40,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-black/20">
          <div className="grid gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1.15fr_2fr] lg:gap-16 lg:px-10 lg:py-10">
            <div>
              <Link href="/" className="inline-flex text-2xl font-bold tracking-tight" aria-label="Hellou Studio — página inicial">
                <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">helloustudio</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
                Impressão 3D com personalidade, cuidado e acabamento em cada camada.
              </p>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <WhatsAppIcon />
                Falar com a Hellou
              </a>

              <div className="mt-5 flex items-center gap-2">
                <a href="https://instagram.com/helloustudio_" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-pink-900 dark:hover:bg-pink-950/30 dark:hover:text-pink-400" aria-label="Instagram">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
                </a>
                <a href="https://www.tiktok.com/@helloustudio_" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-pink-900 dark:hover:bg-pink-950/30 dark:hover:text-pink-400" aria-label="TikTok">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .56.04.82.11V9.4a6.27 6.27 0 0 0-.82-.05 6.34 6.34 0 0 0-6.34 6.35A6.34 6.34 0 0 0 9.49 22a6.34 6.34 0 0 0 6.34-6.34V9.18a8.16 8.16 0 0 0 4.76 1.53v-3.4a4.85 4.85 0 0 1-1-.62z" /></svg>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-7 gap-y-8 sm:grid-cols-3">
              {FOOTER_GROUPS.map((group) => (
                <div key={group.title}>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">{group.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400">
                          {link.label}
                          <span aria-hidden="true" className="translate-x-0 text-xs opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-pink-100/70 bg-pink-50/35 px-6 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Pagamento</span>
              {['PIX', 'Visa', 'Mastercard', 'Elo', 'Boleto'].map((method) => (
                <span key={method} className="rounded-lg border border-gray-200/80 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
                  {method}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-400 dark:text-gray-500">
              <span>© {new Date().getFullYear()} helloustudio</span>
              <span className="hidden h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700 sm:block" />
              <span>Todos os direitos reservados</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
