'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin-theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin-theme', 'light');
    }
  }

  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label="Alternar tema"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
