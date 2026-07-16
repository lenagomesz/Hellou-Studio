import Link from 'next/link';
import { Box, FileBox } from 'lucide-react';

type ProductTypeTabsProps = {
  active: 'physical' | 'digital';
};

const tabs = [
  {
    type: 'physical' as const,
    href: '/dashboard/products/new',
    label: 'Produto físico',
    description: 'Peças sob demanda ou à pronta-entrega',
    icon: Box,
  },
  {
    type: 'digital' as const,
    href: '/dashboard/products/stl',
    label: 'Arquivo STL',
    description: 'Produto digital com download após a compra',
    icon: FileBox,
  },
];

export function ProductTypeTabs({ active }: ProductTypeTabsProps) {
  return (
    <nav aria-label="Tipo de produto" className="grid gap-3 sm:grid-cols-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.type === active;

        return (
          <Link
            key={tab.type}
            href={tab.href}
            aria-current={selected ? 'page' : undefined}
            className={`flex items-center gap-4 rounded-2xl border p-4 transition sm:p-5 ${
              selected
                ? 'border-pink-400 bg-pink-50 text-slate-950 shadow-sm ring-2 ring-pink-500/10 dark:border-pink-700 dark:bg-pink-500/10 dark:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-pink-200 hover:bg-pink-50/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selected ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold">{tab.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                {tab.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
