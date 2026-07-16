'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useCart } from '@/components/shop/CartContext';
import { NotificationBell } from '@/components/shop/NotificationBell';
import { WHATSAPP_URL } from '@/components/shop/WhatsAppButton';

const NAV_LINKS = [
  {
    href: '/',
    label: 'Home',
    icon: 'M3 10.75 12 3l9 7.75M5.5 9.5v10.25h13V9.5M9.25 19.75v-6h5.5v6',
  },
  {
    href: '/products',
    label: 'Catálogo',
    icon: 'M4.75 3.75h4.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1Zm10 0h4.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1Zm-10 10h4.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1Zm10 0h4.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-4.5a1 1 0 0 1-1-1v-4.5a1 1 0 0 1 1-1Z',
  },
  {
    href: '/stl',
    label: 'STL',
    icon: 'M6.5 2.75h7l4 4v14.5h-11V2.75Zm7 0v4h4M9.25 12h5.5m-5.5 4h5.5',
  },
  {
    href: '/request-print',
    label: 'Encomendas',
    icon: 'm12 2.75 8.5 4.75L12 12.25 3.5 7.5 12 2.75Zm-8.5 9L12 16.5l8.5-4.75m-17 5L12 21.5l8.5-4.75',
  },
  {
    href: '/about',
    label: 'Sobre',
    icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-10h.01',
  },
];

function ThemeGlyph({ dark }: { dark: boolean }) {
  return dark ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

function BagIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
    </svg>
  );
}

function MenuIcon({ path, filled = false }: { path: string; filled?: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
      <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7} className="h-[18px] w-[18px]">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </span>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const { count } = useCart();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const userName = session?.user?.name?.trim() || session?.user?.email?.split('@')[0] || 'Minha conta';
  const firstName = userName.split(/\s+/)[0];
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const accountLinks = session?.user?.role === 'admin'
    ? [
        { href: '/dashboard', label: 'Painel Admin', icon: 'M4.75 4.75h5.5v5.5h-5.5v-5.5Zm9 0h5.5v5.5h-5.5v-5.5Zm-9 9h5.5v5.5h-5.5v-5.5Zm9 0h5.5v5.5h-5.5v-5.5Z' },
        { href: '/account', label: 'Minha conta', icon: 'M15.75 7a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20a7.5 7.5 0 0 1 15 0' },
      ]
    : [
        { href: '/account', label: 'Minha conta', icon: 'M15.75 7a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20a7.5 7.5 0 0 1 15 0' },
        { href: '/account/orders', label: 'Meus pedidos', icon: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9' },
        { href: '/account/bonus', label: 'Meus bônus', icon: 'M4 10.25h16v10H4v-10Zm-1-4h18v4H3v-4ZM12 6.25v14M12 6.25H8.75A2.25 2.25 0 1 1 11 4v2.25m1 0h3.25A2.25 2.25 0 1 0 13 4v2.25' },
      ];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen || !window.matchMedia('(max-width: 1023px)').matches) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [menuOpen]);

  function handleMobileNavigation() {
    setMenuOpen(false);
    setAccountMenuOpen(false);

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    window.requestAnimationFrame(resetScroll);
    window.setTimeout(resetScroll, 120);
    window.setTimeout(resetScroll, 350);
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const iconButtonClass =
    'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/80 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50/60 hover:text-pink-600 dark:border-white/10 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-pink-800 dark:hover:bg-gray-700 dark:hover:text-pink-400';

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-xl transition-shadow dark:bg-gray-950/95 lg:fixed lg:inset-x-0 lg:top-0 ${
          scrolled
            ? 'border-pink-100/80 shadow-md shadow-pink-100/20 dark:border-gray-800 dark:shadow-black/30'
            : 'border-gray-100 dark:border-gray-900'
        }`}
      >
        <div
          className="w-full px-4 py-3 sm:px-6 lg:px-8"
        >
          <div className="flex min-h-11 items-center justify-between gap-3 lg:hidden">
            <Link href="/" className="shrink-0 text-xl font-bold tracking-tight" aria-label="Hellou Studio — página inicial">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                helloustudio
              </span>
            </Link>

            <div className="flex items-center justify-end gap-1.5">
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={iconButtonClass}
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  <ThemeGlyph dark={theme === 'dark'} />
                </button>
              )}

              {status === 'authenticated' && session?.user && <NotificationBell />}

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className={iconButtonClass}
                aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={menuOpen}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(160px,0.8fr)_auto_minmax(225px,0.8fr)] items-center gap-4 lg:grid">
            <Link href="/" className="w-fit text-2xl font-bold tracking-tight" aria-label="Hellou Studio — página inicial">
              <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                helloustudio
              </span>
            </Link>

            <nav className="flex items-center justify-center gap-1 rounded-2xl bg-orange-50/40 p-1 dark:bg-white/[0.03]" aria-label="Navegação principal">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition xl:px-3 ${
                      active
                        ? 'border-pink-200/70 bg-gradient-to-r from-pink-50 to-orange-50 text-pink-600 shadow-sm shadow-pink-100/50 dark:border-pink-900 dark:from-pink-950/60 dark:to-orange-950/30 dark:text-pink-400 dark:shadow-none'
                        : 'border-transparent text-gray-600 hover:-translate-y-0.5 hover:border-gray-200 hover:bg-white hover:text-gray-900 hover:shadow-sm dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center justify-end gap-1.5">
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={iconButtonClass}
                  aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  <ThemeGlyph dark={theme === 'dark'} />
                </button>
              )}

              <Link
                href="/cart"
                className={`${iconButtonClass} ${
                  pathname === '/cart' ? 'border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-900 dark:bg-pink-950/50 dark:text-pink-400' : ''
                }`}
                aria-label={count > 0 ? `Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho'}
              >
                <BagIcon />
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-pink-500 to-orange-400 px-1 text-[9px] font-black leading-4 text-white dark:border-gray-900">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>

              {status === 'authenticated' && session?.user && (
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-gray-800">
                  <NotificationBell />
                </div>
              )}

              {status === 'loading' ? (
                <div className="h-10 w-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ) : session?.user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((open) => !open)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200/80 bg-white py-1 pl-1 pr-2.5 text-xs font-bold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 dark:border-white/10 dark:bg-gray-800 dark:text-white dark:hover:border-pink-800"
                    aria-label="Abrir menu da conta"
                    aria-expanded={accountMenuOpen}
                  >
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-pink-500 to-orange-400 px-1 text-[10px] font-black text-white">
                      {initials || 'US'}
                    </span>
                    <span className="max-w-24 truncate">{firstName}</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 transition ${accountMenuOpen ? 'rotate-180' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {accountMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+0.65rem)] w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl shadow-gray-900/15 dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-pink-50 to-orange-50 p-3 dark:from-pink-950/40 dark:to-orange-950/20">
                        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 px-1 text-xs font-black text-white">
                          {initials || 'US'}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm text-gray-900 dark:text-white">Olá, {firstName}!</strong>
                          {session.user.email && <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{session.user.email}</span>}
                        </span>
                      </div>
                      {accountLinks.map((item) => (
                        <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-orange-50 dark:text-gray-300 dark:hover:bg-gray-800">
                          {item.label}<span aria-hidden="true">→</span>
                        </Link>
                      ))}
                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Sair da conta
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-200 bg-gradient-to-r from-white to-orange-50 px-3 text-xs font-bold text-pink-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 dark:border-pink-900 dark:from-gray-800 dark:to-gray-800 dark:text-pink-400">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20a7.5 7.5 0 0 1 15 0" />
                  </svg>
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>

        <div
          className={`w-full border-x-0 border-b border-t bg-white/98 shadow-xl shadow-gray-900/10 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-in-out dark:bg-gray-950/98 lg:hidden ${
            menuOpen
              ? 'max-h-[calc(100dvh-4.25rem)] overflow-y-auto overscroll-contain border-gray-200 opacity-100 dark:border-gray-800'
              : 'max-h-0 overflow-hidden border-transparent opacity-0'
          }`}
        >
          <nav className="flex flex-col gap-1 p-3" aria-label="Menu do celular">
            {session?.user && (
              <div className="mb-1 flex items-center gap-3 rounded-xl border border-pink-100 bg-gradient-to-r from-pink-50 to-orange-50 p-3 dark:border-pink-900/60 dark:from-pink-950/40 dark:to-orange-950/20">
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 px-1 text-xs font-black text-white">
                  {initials || 'US'}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-gray-900 dark:text-white">Olá, {firstName}!</strong>
                  {session.user.email && <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{session.user.email}</span>}
                </span>
              </div>
            )}

            <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Explorar
            </p>

            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  scroll
                  onClick={handleMobileNavigation}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition ${
                    active
                      ? 'border-pink-100 bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700 dark:border-pink-900 dark:from-pink-950/50 dark:to-orange-950/30 dark:text-pink-400'
                      : 'border-transparent text-gray-700 hover:border-gray-100 hover:bg-orange-50/60 dark:text-gray-300 dark:hover:border-gray-800 dark:hover:bg-gray-800'
                  }`}
                >
                  <MenuIcon path={link.icon} />
                  {link.label}
                  <span aria-hidden="true" className="ml-auto text-gray-400">→</span>
                </Link>
              );
            })}

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <p className="px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Compras
            </p>

            <Link
              href="/cart"
              scroll
              onClick={handleMobileNavigation}
              className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition ${
                pathname === '/cart'
                  ? 'border-pink-100 bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700 dark:border-pink-900 dark:from-pink-950/50 dark:to-orange-950/30 dark:text-pink-400'
                  : 'border-transparent text-gray-700 hover:border-gray-100 hover:bg-orange-50/60 dark:text-gray-300 dark:hover:border-gray-800 dark:hover:bg-gray-800'
              }`}
            >
              <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500"><BagIcon className="h-[18px] w-[18px]" /></span>
              Carrinho
              {count > 0 && <span className="ml-auto rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-2 py-0.5 text-[10px] font-black text-white">{count > 99 ? '99+' : count}</span>}
            </Link>

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <p className="px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Atendimento
            </p>

            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-semibold text-gray-700 transition hover:border-gray-100 hover:bg-gray-50 dark:text-gray-300 dark:hover:border-gray-800 dark:hover:bg-gray-800">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
              </svg>
              </span>
              <span><strong className="block">Entre em contato</strong><small className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">Fale conosco pelo WhatsApp</small></span>
              <span aria-hidden="true" className="ml-auto text-gray-400">→</span>
            </a>

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <p className="px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Sua conta
            </p>

            {status === 'loading' ? (
              <div className="h-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ) : session?.user ? (
              <>
                {accountLinks.map((item) => (
                  <Link key={item.href} href={item.href} scroll onClick={handleMobileNavigation} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-gray-700 transition hover:bg-orange-50/60 dark:text-gray-300 dark:hover:bg-gray-800">
                    <MenuIcon path={item.icon} />
                    {item.label}<span aria-hidden="true" className="ml-auto">→</span>
                  </Link>
                ))}
                <button type="button" onClick={() => { handleMobileNavigation(); void signOut({ callbackUrl: '/' }); }} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                  <MenuIcon path="M14.25 8.25 18 12m0 0-3.75 3.75M18 12H8.25m2.25-8.25H5.75A1.75 1.75 0 0 0 4 5.5v13c0 .966.784 1.75 1.75 1.75h4.75" />
                  Sair da conta
                </button>
              </>
            ) : (
              <Link href="/login" scroll onClick={handleMobileNavigation} className="flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:shadow-xl">
                Entrar na minha conta
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div aria-hidden="true" className="hidden h-16 lg:block" />

      {count > 0 && pathname !== '/cart' && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-105 active:scale-95 lg:hidden"
          aria-label={`Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}`}
        >
          <BagIcon className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-5 text-pink-600 shadow-sm">
            {count > 99 ? '99+' : count}
          </span>
        </Link>
      )}
    </>
  );
}
