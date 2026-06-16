'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV_ITEMS = [
  { href: '/account', label: 'Minha Conta', mobileLabel: 'Conta', icon: 'user' },
  { href: '/account/orders', label: 'Meus Pedidos', mobileLabel: 'Pedidos', icon: 'orders' },
  { href: '/account/requests', label: 'Minhas Solicitações', mobileLabel: 'Encomendas', icon: 'requests' },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? 'h-4 w-4';
  if (name === 'user') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    );
  }
  if (name === 'requests') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
    </svg>
  );
}

interface AccountNavProps {
  userName: string | null;
  userEmail: string;
  isAdmin: boolean;
}

export function AccountSidebar({ userName, userEmail, isAdmin }: AccountNavProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[5.5rem] space-y-3">
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 text-sm font-bold text-white shadow-md shadow-pink-200/30 dark:shadow-pink-900/20">
            {(userName ?? userEmail).charAt(0).toUpperCase()}
          </div>
          <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white truncate">
            {userName ?? 'Usuário'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                Painel Admin
              </Link>
            )}
          </nav>

          <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AccountMobileNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 shadow-sm lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition ${
              active
                ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-1 ring-pink-200/60 dark:ring-pink-500/20'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <NavIcon name={item.icon} />
            <span className="text-[11px] font-medium leading-tight">{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
