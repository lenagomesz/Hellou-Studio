import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function ButtonLink({ href, children, variant = 'primary', className = '' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; className?: string }) {
  const styles = {
    primary: 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg shadow-pink-200/30 hover:shadow-xl hover:-translate-y-0.5',
    secondary: 'border border-gray-200 bg-white text-gray-800 shadow-sm hover:border-pink-300 hover:text-pink-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
    ghost: 'text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-950/30',
  };
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition ${styles[variant]} ${className}`}>{children}</Link>;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-600 dark:text-pink-400">{eyebrow}</p>}<h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">{title}</h2>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>}</div>{action}</div>;
}

export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}>{children}</div>;
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-bold text-pink-600 transition hover:gap-2.5 dark:text-pink-400">{children}<ArrowRight className="h-4 w-4" /></Link>;
}
