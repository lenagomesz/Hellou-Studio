'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { StoreSettings } from '@/lib/store-settings-schema';

export function HomeHeroCarousel({ settings }: { settings: StoreSettings }) {
  const slides = settings.home.heroSlides.filter((slide) => slide.active);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, settings.home.heroAutoplaySeconds * 1000);
    return () => window.clearInterval(interval);
  }, [paused, settings.home.heroAutoplaySeconds, slides.length]);

  if (slides.length === 0) return null;

  function showPrevious() {
    setActive((current) => (current - 1 + slides.length) % slides.length);
  }

  function showNext() {
    setActive((current) => (current + 1) % slides.length);
  }

  return (
    <section
      className="home-hero relative w-full overflow-hidden bg-[#fffaf7] dark:bg-gray-950"
      aria-roledescription="carrossel"
      aria-label={`Destaques da ${settings.identity.name}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(distance) > 50) {
          if (distance > 0) showPrevious();
          else showNext();
        }
        touchStartX.current = null;
      }}
    >
      <div className="relative h-[calc(100svh-6rem)] min-h-[560px] max-h-[680px] w-full overflow-hidden bg-[#fff8f4] dark:bg-gray-900 md:h-[calc(100svh-6.75rem)] md:min-h-[560px] md:max-h-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(249,115,22,0.18),transparent_30%),radial-gradient(circle_at_10%_88%,rgba(236,72,153,0.2),transparent_32%),linear-gradient(135deg,#fffaf7,#fff1f5_52%,#fff7ed)] dark:bg-[radial-gradient(circle_at_88%_12%,rgba(249,115,22,0.18),transparent_30%),radial-gradient(circle_at_10%_88%,rgba(236,72,153,0.2),transparent_32%),linear-gradient(135deg,#111827,#1f1722_52%,#21170f)]" />
        <div
          className="relative flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <article
              key={slide.id}
              className="relative flex h-full min-w-full items-end overflow-hidden"
              aria-label={`${index + 1} de ${slides.length}`}
              aria-hidden={index !== active}
            >
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-10">
                <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-pink-200/70 bg-white/85 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-pink-700 shadow-sm backdrop-blur-md dark:border-pink-800/60 dark:bg-gray-900/80 dark:text-pink-300 sm:text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                  {slide.badge}
                </span>

                <h1 className="mt-5 max-w-[12ch] text-[2.35rem] font-black leading-[0.98] tracking-[-0.05em] text-gray-950 dark:text-white sm:text-[2.8rem] md:mt-6 md:max-w-[11ch] md:text-5xl lg:text-[4rem]">
                  <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                    {slide.accent}
                  </span>
                  <span className="block sm:mt-1">{slide.title}</span>
                </h1>

                <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-200 md:text-base lg:text-lg">
                  {slide.description}
                </p>

                <Link
                  href={slide.href as Route}
                  tabIndex={index === active ? 0 : -1}
                  className="group mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/20 active:translate-y-0 md:mt-5 md:min-h-12 md:rounded-2xl md:px-6 md:py-3 md:text-sm"
                >
                  {slide.action}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

              </div>
            </article>
          ))}
        </div>

        {slides.length > 1 && (
          <>
            <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 md:bottom-5" aria-label="Escolher destaque">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Mostrar banner ${index + 1}`}
                  aria-pressed={index === active}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === active
                      ? 'w-8 bg-gradient-to-r from-pink-500 to-orange-400'
                      : 'w-2 bg-gray-300 hover:bg-pink-300 dark:bg-gray-600 dark:hover:bg-pink-600'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
