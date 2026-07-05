'use client';

import { useEffect } from 'react';

export function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('Service Worker registered', reg);
        })
        .catch((err) => {
          console.log('Service Worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
