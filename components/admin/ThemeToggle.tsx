'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="rounded-xl border border-black/10 bg-white/80 p-2.5 text-gray-500 shadow-sm transition hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-pink-500/50"
      aria-label="Alternar tema"
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
