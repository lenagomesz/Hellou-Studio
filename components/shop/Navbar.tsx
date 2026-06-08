'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useCart } from '@/components/shop/CartContext';
import { NotificationBell } from '@/components/shop/NotificationBell';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Catálogo' },
  { href: '/request-print', label: 'Encomendas' },
  { href: '/about', label: 'Sobre' },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const { count } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    <header
      className={`sticky top-0 z-30 border-b bg-gradient-to-r from-white via-white to-orange-50/40 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? 'border-pink-100/60 shadow-sm shadow-pink-100/30' : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
            helloustudio
          </span>
        </Link>

        {/* Desktop nav - centered */}
        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-medium transition ${
                  isActive
                    ? 'text-pink-600'
                    : 'text-gray-600 hover:text-pink-600'
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

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Cart — always visible */}
          <Link
            href="/cart"
            className={`relative rounded-full p-2 transition ${
              pathname === '/cart'
                ? 'bg-pink-50 text-pink-600'
                : 'text-gray-600 hover:bg-pink-50/60 hover:text-pink-600'
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

          {/* Notifications — desktop only */}
          <div className="hidden md:block">
            <NotificationBell />
          </div>

          {/* Auth — desktop only */}
          <div className="hidden md:flex items-center gap-2">
            {status === 'loading' ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
            ) : session?.user ? (
              <>
                <Link
                  href="/account"
                  className="rounded-full p-2 text-gray-600 transition hover:bg-pink-50/60 hover:text-pink-600"
                  aria-label="Minha conta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="rounded-full p-2 text-gray-400 transition hover:bg-red-50/60 hover:text-red-500"
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
                className="rounded-full border border-pink-200 bg-white px-4 py-1.5 text-sm font-medium text-pink-600 transition hover:border-pink-300 hover:bg-pink-50/50"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* Mobile menu toggle (hamburger) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-50 md:hidden"
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

      {/* Mobile nav slide-down */}
      <div
        className={`overflow-hidden border-t border-gray-100 bg-gradient-to-b from-white to-orange-50/50 transition-all duration-300 ease-in-out md:hidden ${
          menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700'
                    : 'text-gray-700 hover:bg-orange-50/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="my-1 border-t border-gray-100" />

          {status !== 'loading' && session?.user ? (
            <>
              <Link
                href="/account"
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  pathname.startsWith('/account')
                    ? 'bg-gradient-to-r from-pink-50 to-orange-50 text-pink-700'
                    : 'text-gray-700 hover:bg-orange-50/50'
                }`}
              >
                Minha conta
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50/50"
              >
                Sair
              </button>
            </>
          ) : status !== 'loading' ? (
            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-pink-600 transition hover:bg-pink-50/50"
            >
              Entrar
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
