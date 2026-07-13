'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-pink-100 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-pink-100/60 blur-3xl dark:bg-pink-950/20" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl dark:bg-orange-950/20" />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-orange-50 px-6 py-7 text-slate-950 shadow-sm dark:border-pink-200 dark:from-white dark:via-pink-50 dark:to-orange-50 dark:text-slate-950 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-9 sm:py-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pink-600">Sua ideia pode virar realidade</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Não encontrou o que imaginou?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Envie seu arquivo ou conte sua ideia. Analisamos a impressão 3D e respondemos com um orçamento personalizado.</p>
          </div>
          <Link href="/request-print" className="mt-5 inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-pink-950/30 transition hover:scale-[1.02] sm:mt-0">
            Pedir impressão personalizada
          </Link>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                helloustudio
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Marketplace de produtos impressos em 3D, feitos sob demanda com carinho e qualidade premium.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://wa.me/5547988450461?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos."
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 hover:bg-green-50 hover:text-green-500 hover:scale-110 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-green-950/50 dark:hover:text-green-400"
                aria-label="WhatsApp"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/helloustudio_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 hover:bg-pink-50 hover:text-pink-500 hover:scale-110 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-pink-950/50 dark:hover:text-pink-400"
                aria-label="Instagram"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@helloustudio_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 hover:bg-pink-50 hover:text-pink-500 hover:scale-110 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-pink-950/50 dark:hover:text-pink-400"
                aria-label="TikTok"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.88 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.11V9.4a6.27 6.27 0 00-.82-.05A6.34 6.34 0 003.15 15.7 6.34 6.34 0 009.49 22a6.34 6.34 0 006.34-6.34V9.18a8.16 8.16 0 004.76 1.53v-3.4a4.85 4.85 0 01-1-.62z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Navegação
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                { href: '/products', label: 'Catálogo' },
                { href: '/products?category=chaveiros', label: 'Chaveiros' },
                { href: '/products?category=escritorio', label: 'Escritório' },
                { href: '/products?category=criaturas', label: 'Criaturas' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors duration-200 hover:text-pink-500 dark:text-gray-400 dark:hover:text-pink-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Conta */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Conta
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                { href: '/login', label: 'Entrar' },
                { href: '/register', label: 'Criar conta' },
                { href: '/account/orders', label: 'Meus pedidos' },
                { href: '/request-print', label: 'Encomendas' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors duration-200 hover:text-pink-500 dark:text-gray-400 dark:hover:text-pink-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Confiança */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Garantias
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                { icon: '🔒', text: 'Pagamento seguro' },
                { icon: '🎨', text: 'Produzido sob demanda' },
                { icon: '📦', text: 'Envio para todo o Brasil' },
                { icon: '↩️', text: 'Troca garantida' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                  <span className="text-base">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-pink-100/60 bg-pink-50/40 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} helloustudio. Todos os direitos reservados.
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 dark:text-gray-500">Formas de pagamento:</span>
            <div className="flex items-center gap-1.5">
              {/* Visa */}
              <div className="flex h-7 w-10 items-center justify-center rounded border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <svg viewBox="0 0 48 32" className="h-4 w-auto" fill="none">
                  <path d="M19.5 21h-3l1.9-11.5h3L19.5 21z" fill="#1A1F71" />
                  <path d="M31 9.8c-.6-.2-1.5-.5-2.7-.5-3 0-5.1 1.5-5.1 3.7 0 1.6 1.5 2.5 2.7 3 1.2.6 1.6 1 1.6 1.5 0 .8-1 1.2-1.9 1.2-1.3 0-1.9-.2-3-.7l-.4-.2-.4 2.6c.7.3 2.1.6 3.5.6 3.2 0 5.3-1.5 5.3-3.8 0-1.3-.8-2.3-2.5-3.1-1-.5-1.7-.9-1.7-1.4 0-.5.5-1 1.7-1 1 0 1.7.2 2.2.4l.3.1.4-2.4z" fill="#1A1F71" />
                  <path d="M35 9.5h-2.3c-.7 0-1.3.2-1.6 1L27.4 21h3.2s.5-1.4.6-1.7h3.9c.1.4.4 1.7.4 1.7H38L35 9.5zm-3.2 8c.3-.7 1.2-3.2 1.2-3.2l.4-1 .2 1s.6 2.7.7 3.2h-2.5z" fill="#1A1F71" />
                  <path d="M15 9.5l-3 7.8-.3-1.6c-.5-1.9-2.3-3.9-4.2-4.9l2.7 10.2h3.2l4.8-11.5H15z" fill="#1A1F71" />
                  <path d="M10.5 9.5H5.6l-.1.3C9 10.6 11.3 12.8 12.2 15.4l-.9-4.8c-.2-.8-.7-1-.8-1.1h-.5z" fill="#FBBF24" />
                </svg>
              </div>
              {/* Mastercard */}
              <div className="flex h-7 w-10 items-center justify-center rounded border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <svg viewBox="0 0 48 32" className="h-4 w-auto" fill="none">
                  <circle cx="19" cy="16" r="8" fill="#EB001B" />
                  <circle cx="29" cy="16" r="8" fill="#F79E1B" />
                  <path d="M24 10.3a8 8 0 0 1 0 11.4 8 8 0 0 1 0-11.4z" fill="#FF5F00" />
                </svg>
              </div>
              {/* Elo */}
              <div className="flex h-7 w-10 items-center justify-center rounded border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <svg viewBox="0 0 48 32" className="h-4 w-auto" fill="none">
                  <path d="M14.5 12.5a3.5 3.5 0 0 1 2.8 1.4l2-1.5A6 6 0 0 0 14.5 10a6 6 0 0 0-5.9 5h2.5a3.5 3.5 0 0 1 3.4-2.5z" fill="#FFF100" />
                  <path d="M11.1 17a3.5 3.5 0 0 1 3.4-2.5 3.5 3.5 0 0 1 3.4 2.5h2.5a6 6 0 0 0-5.9-5 6 6 0 0 0-5.9 5h2.5z" fill="#00A4E0" />
                  <path d="M17.3 19.6a3.5 3.5 0 0 1-2.8 1.4 3.5 3.5 0 0 1-3.4-2.5H8.6a6 6 0 0 0 5.9 5 6 6 0 0 0 4.8-2.4l-2-1.5z" fill="#EF4123" />
                  <text x="22" y="20" fill="#000" fontSize="8" fontFamily="Arial" fontWeight="bold">elo</text>
                </svg>
              </div>
              {/* Amex */}
              <div className="flex h-7 w-10 items-center justify-center rounded border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <svg viewBox="0 0 48 32" className="h-4 w-auto" fill="none">
                  <rect x="4" y="6" width="40" height="20" rx="2" fill="#016FD0" />
                  <text x="24" y="19" fill="white" fontSize="7" fontFamily="Arial" fontWeight="bold" textAnchor="middle">AMEX</text>
                </svg>
              </div>
              {/* Pix */}
              <div className="flex h-7 w-10 items-center justify-center rounded border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <svg viewBox="0 0 48 32" className="h-3.5 w-auto" fill="none">
                  <path d="M30.4 22.5l-4.2-4.2a1.2 1.2 0 0 1 0-1.7l4.2-4.2a4.2 4.2 0 0 1 3-1.2h2.1l-5.5 5.5a.8.8 0 0 0 0 1.1l5.5 5.5h-2.1a4.2 4.2 0 0 1-3-1.2v-.6z" fill="#32BCAD" />
                  <path d="M17.6 22.5l4.2-4.2a1.2 1.2 0 0 0 0-1.7l-4.2-4.2a4.2 4.2 0 0 0-3-1.2h-2.1l5.5 5.5a.8.8 0 0 1 0 1.1l-5.5 5.5h2.1a4.2 4.2 0 0 0 3-1.2v-.6z" fill="#32BCAD" />
                </svg>
              </div>
              {/* Boleto */}
              <div className="flex h-7 w-10 items-center justify-center rounded border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <svg viewBox="0 0 24 24" className="h-4 w-auto" fill="none">
                  <rect x="2" y="4" width="1.5" height="16" fill="#374151" />
                  <rect x="5" y="4" width="1" height="16" fill="#374151" />
                  <rect x="7.5" y="4" width="2" height="16" fill="#374151" />
                  <rect x="11" y="4" width="1" height="16" fill="#374151" />
                  <rect x="13.5" y="4" width="1.5" height="16" fill="#374151" />
                  <rect x="16.5" y="4" width="1" height="16" fill="#374151" />
                  <rect x="19" y="4" width="2" height="16" fill="#374151" />
                  <rect x="22" y="4" width="1" height="16" fill="#374151" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
