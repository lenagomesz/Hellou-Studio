'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useCart } from '@/components/shop/CartContext';
import { NotificationBell } from '@/components/shop/NotificationBell';
import { WHATSAPP_URL } from '@/components/shop/WhatsAppButton';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { href: '/products', label: 'Catálogo', icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z' },
  { href: '/stl', label: 'STL', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 0H4.5m19.5 0a3.375 3.375 0 0 1-3.375 3.375H3.375A3.375 3.375 0 0 1 0 14.25m19.5 0V5.25A3.375 3.375 0 0 0 16.125 1.875H3.375A3.375 3.375 0 0 0 0 5.25v9' },
  { href: '/request-print', label: 'Encomendas', icon: 'M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25' },
  { href: '/about', label: 'Sobre', icon: 'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z' },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const { count } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
      className={`sticky top-0 z-30 border-b bg-gradient-to-r from-white via-white to-orange-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? 'border-pink-100/60 shadow-sm shadow-pink-100/30 dark:border-gray-800 dark:shadow-gray-900/50' : 'border-transparent'
      }`}
    >
      <div className="mx-auto w-full px-4 py-3.5 sm:px-6">
        <div className="grid grid-cols-3 items-center gap-4 md:gap-8">
          {/* Logo - Left */}
          <div>
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                helloustudio
              </span>
            </Link>
          </div>

          {/* Desktop nav - centered */}
          <nav className="hidden items-center justify-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-sm font-medium transition ${
                    isActive
                      ? 'text-pink-600 dark:text-pink-400'
                      : 'text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side - icons */}
        <div className="flex items-center justify-end gap-3">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full p-2 text-gray-600 transition hover:bg-pink-50/60 hover:text-pink-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-pink-400"
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>
          )}

          {/* Cart — desktop only in top bar */}
          <Link
            href="/cart"
            className={`relative hidden rounded-full p-2 transition md:inline-flex ${
              pathname === '/cart'
                ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400'
                : 'text-gray-600 hover:bg-pink-50/60 hover:text-pink-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-pink-400'
            }`}
            aria-label={count > 0 ? `Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-1 text-[10px] font-bold leading-4 text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <NotificationBell />

          {/* Auth — desktop only */}
          <div className="hidden md:flex items-center gap-2">
            {status === 'loading' ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            ) : session?.user ? (
              <>
                <Link
                  href="/account"
                  className="rounded-full p-2 text-gray-600 transition hover:bg-pink-50/60 hover:text-pink-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-pink-400"
                  aria-label="Minha conta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="rounded-full p-2 text-gray-400 transition hover:bg-red-50/60 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  aria-label="Sair"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-pink-200 bg-white px-4 py-1.5 text-sm font-medium text-pink-600 transition hover:border-pink-300 hover:bg-pink-50/50 dark:bg-gray-800 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-gray-700 dark:hover:border-pink-600"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* Mobile menu toggle (hamburger) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-50 md:hidden dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
        </div>
      </div>

      {/* Mobile nav slide-down */}
      <div
        className={`overflow-hidden border-t border-gray-100 dark:border-gray-800 bg-gradient-to-b from-white to-orange-50/50 dark:from-gray-900 dark:to-gray-900 transition-all duration-300 ease-in-out md:hidden ${
          menuOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700 dark:from-pink-950/50 dark:to-orange-950/30 dark:text-pink-400'
                    : 'text-gray-700 hover:bg-orange-50/50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </Link>
            );
          })}

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          {/* Cart link in mobile menu */}
          <Link
            href="/cart"
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname === '/cart'
                ? 'bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700 dark:from-pink-950/50 dark:to-orange-950/30 dark:text-pink-400'
                : 'text-gray-700 hover:bg-orange-50/50 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
            </svg>
            Carrinho
            {count > 0 && (
              <span className="ml-auto inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-1.5 text-[10px] font-bold leading-4 text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-orange-50/50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Fale conosco
          </a>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          {status !== 'loading' && session?.user ? (
            <>
              <Link
                href="/account"
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  pathname.startsWith('/account')
                    ? 'bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700 dark:from-pink-950/50 dark:to-orange-950/30 dark:text-pink-400'
                    : 'text-gray-700 hover:bg-orange-50/50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                Minha conta
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50/50 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                Sair
              </button>
            </>
          ) : status !== 'loading' ? (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-pink-600 transition hover:bg-pink-50/50 dark:text-pink-400 dark:hover:bg-pink-950/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              Entrar
            </Link>
          ) : null}
        </nav>
      </div>
    </header>

      {/* Floating cart button — mobile only, visible when items in cart, hidden on /cart page */}
      {count > 0 && pathname !== '/cart' && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105 active:scale-95 md:hidden"
          aria-label={`Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-5 text-pink-600 shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        </Link>
      )}
    </>
  );
}
