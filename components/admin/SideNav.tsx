'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  AlertCircle,
  BarChart3,
  Box,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Printer,
  Settings2,
  Shield,
  Star,
  Store,
  Tag,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminAccessLevel } from '@/lib/admin-permissions';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeKey?: 'alerts';
  ownerOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Hoje',
    items: [
      { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, exact: true },
      { href: '/dashboard/admin-alerts', label: 'Central de alertas', icon: AlertCircle, badgeKey: 'alerts' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/dashboard/orders', label: 'Pedidos', icon: Package },
      { href: '/dashboard/requests', label: 'Solicitações 3D', icon: Printer },
      { href: '/dashboard/products', label: 'Produtos', icon: Box },
      { href: '/dashboard/inventory', label: 'Estoque', icon: Warehouse },
      { href: '/dashboard/users', label: 'Clientes', icon: Users },
      { href: '/dashboard/order-ratings', label: 'Avaliações', icon: Star },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { href: '/dashboard/financeiro', label: 'Financeiro', icon: CircleDollarSign, ownerOnly: true },
      { href: '/dashboard/analytics', label: 'Análises', icon: BarChart3, ownerOnly: true },
      { href: '/dashboard/campaigns', label: 'Campanhas', icon: Mail, ownerOnly: true },
      { href: '/dashboard/coupons', label: 'Cupons', icon: Tag, ownerOnly: true },
      { href: '/dashboard/calculadora', label: 'Calculadora', icon: Calculator, ownerOnly: true },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/admin/security', label: 'Segurança (2FA)', icon: Shield },
      { href: '/dashboard/settings/features', label: 'Recursos da loja', icon: Settings2, ownerOnly: true },
    ],
  },
];

export function SideNav({ userEmail, alertCount = 0, accessLevel }: { userEmail: string | null; alertCount?: number; accessLevel: AdminAccessLevel }) {
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
    <aside className="w-full border-b border-white/10 bg-[#101218] text-white md:sticky md:top-0 md:h-screen md:w-[278px] md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between border-b border-white/10 p-4 md:px-5 md:py-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 text-sm font-black text-white shadow-lg shadow-pink-950/30">
            H
          </span>
          <span>
            <span className="block text-[15px] font-bold tracking-tight">hellou studio</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              Central admin
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 md:hidden"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out md:flex md:h-[calc(100vh-81px)] md:flex-col ${mobileOpen ? 'max-h-[78vh]' : 'max-h-0 md:max-h-none'}`}>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-color:#333_transparent] [scrollbar-width:thin]">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{section.label}</p>
              <div className="space-y-1">
                {section.items.filter((item) => !item.ownerOnly || accessLevel === 'owner').map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);
                  const badgeCount = item.badgeKey === 'alerts' ? alertCount : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${active ? 'bg-white text-slate-950 shadow-lg shadow-black/20' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}
                    >
                      <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? 'text-pink-600' : 'text-slate-500 transition group-hover:text-pink-400'}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badgeKey && badgeCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1.5 text-[10px] font-bold text-white">{badgeCount > 99 ? '99+' : badgeCount}</span>
                      ) : (
                        <ChevronRight className={`h-3.5 w-3.5 transition ${active ? 'text-slate-400' : 'translate-x-1 text-transparent group-hover:translate-x-0 group-hover:text-slate-600'}`} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          {userEmail && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-500/15 text-xs font-bold text-pink-300">{userEmail.charAt(0).toUpperCase()}</span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">{accessLevel === 'owner' ? 'Administradora principal' : 'Sócia operacional'}</span>
                <span className="block truncate text-xs text-slate-300" title={userEmail}>{userEmail}</span>
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Link href="/" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white">
              <Store className="h-3.5 w-3.5" /> Loja
            </Link>
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-300">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
