'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll();
      secondFrame = window.requestAnimationFrame(resetScroll);
    });
    const delayedReset = window.setTimeout(resetScroll, 80);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(delayedReset);
    };
  }, [pathname]);

  return null;
}
