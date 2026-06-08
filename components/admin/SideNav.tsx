'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/dashboard', label: 'Visão geral', exact: true },
  { href: '/dashboard/orders', label: 'Pedidos' },
  { href: '/dashboard/requests', label: 'Impressões' },
  { href: '/dashboard/products', label: 'Produtos' },
  { href: '/dashboard/users', label: 'Usuários' },
  { href: '/dashboard/notifications', label: 'Notificações' },
  { href: '/dashboard/coupons', label: 'Cupons' },
];

export function SideNav({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="w-full md:w-64 md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
        <div>
          <Link href="/" className="text-lg font-bold text-gray-900">
            helloustudio
          </Link>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-pink-600 font-medium">
            Admin
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition"
          aria-label="Menu"
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`md:flex md:flex-col md:flex-1 overflow-hidden transition-all duration-200 ease-in-out ${
          mobileOpen ? 'max-h-[500px]' : 'max-h-0 md:max-h-none'
        }`}
      >
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href, item.exact)
                  ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {userEmail && (
            <p className="text-xs text-gray-500 mb-2 truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
