'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  Printer,
  Box,
  Users,
  Bell,
  Tag,
  BarChart3,
  DollarSign,
  Calculator,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Gerenciamento',
    items: [
      { href: '/dashboard/orders', label: 'Pedidos', icon: Package },
      { href: '/dashboard/requests', label: 'Solicitações', icon: Printer },
      { href: '/dashboard/products', label: 'Produtos', icon: Box },
      { href: '/dashboard/users', label: 'Usuários', icon: Users },
      { href: '/dashboard/coupons', label: 'Cupons', icon: Tag },

    ],
  },
  {
    label: 'Relatorios',
    items: [
      { href: '/dashboard/analytics', label: 'Analíticos', icon: BarChart3 },
      { href: '/dashboard/financeiro', label: 'Financeiro', icon: DollarSign },
      { href: '/dashboard/calculadora', label: 'Calculadora', icon: Calculator },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard/notifications', label: 'Notificações', icon: Bell },
    ],
  },
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
    <aside className="w-full md:w-64 md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col dark:bg-gray-950 dark:border-gray-800">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
            helloustudio
          </Link>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-pink-600 font-medium">
            Admin
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={`md:flex md:flex-col md:flex-1 overflow-hidden transition-all duration-200 ease-in-out ${
          mobileOpen ? 'max-h-[600px]' : 'max-h-0 md:max-h-none'
        }`}
      >
        <nav className="flex-1 p-3 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {userEmail && (
            <p className="text-xs text-gray-500 mb-2 truncate dark:text-gray-400" title={userEmail}>
              {userEmail}
            </p>
          )}
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              ← Voltar
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
