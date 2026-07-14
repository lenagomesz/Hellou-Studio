'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Activity, ShieldCheck, Users } from 'lucide-react';

export function UserManagementTabs() {
  const pathname = usePathname();
  const { data } = useSession();
  const isOwner = data?.user?.accessLevel !== 'partner';
  const items = [
    { href: '/dashboard/users', label: 'Clientes', icon: Users, exact: true },
    ...(isOwner ? [
      { href: '/dashboard/users/activity', label: 'Atividade', icon: Activity, exact: false },
      { href: '/dashboard/users/access', label: 'Equipe e acessos', icon: ShieldCheck, exact: false },
    ] : []),
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{item.label}</Link>;
      })}
    </nav>
  );
}
