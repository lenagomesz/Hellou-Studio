'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { StoreSettings } from '@/lib/store-settings-schema';

export function HomeHeroCarousel({ settings }: { settings: StoreSettings }) {
  const slides = settings.home.heroSlides.filter((slide) => slide.active);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % Math.max(1, slides.length));
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
      className="home-hero relative flex min-h-[92vh] items-center justify-center overflow-hidden"
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
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-pink-950/10 dark:to-gray-900" />
      <div className="absolute right-10 top-20 h-72 w-72 animate-float rounded-full bg-gradient-to-br from-pink-200/40 to-orange-200/30 blur-3xl dark:from-pink-900/20 dark:to-orange-900/10" />
      <div className="absolute bottom-20 left-10 h-56 w-56 animate-float rounded-full bg-gradient-to-br from-orange-200/30 to-pink-100/20 blur-3xl dark:from-orange-900/15 dark:to-pink-900/10" style={{ animationDelay: '2s' }} />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 animate-pulse-soft rounded-full bg-gradient-to-br from-orange-100/30 to-pink-100/20 blur-3xl dark:from-pink-900/10 dark:to-orange-900/10" />
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div
        className="relative flex w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.accent}
            className="home-hero-content flex min-w-full items-center justify-center px-12 py-20 text-center sm:px-16"
            aria-label={`${index + 1} de ${slides.length}`}
            aria-hidden={index !== active}
          >
            <div className="mx-auto w-full max-w-6xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/80 px-4 py-2 text-xs font-semibold text-orange-700 shadow-sm backdrop-blur-sm dark:border-orange-800/40 dark:bg-gray-900/80 dark:text-orange-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                {slide.badge}
              </span>

              <h1 className="home-hero-title mx-auto mt-8 max-w-4xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="animate-gradient-x bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                  {slide.accent}
                </span>
                <br />
                <span>{slide.title}</span>
              </h1>

              <p className="home-hero-description mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                {slide.description}
              </p>

              <div className="home-hero-actions mt-10 flex justify-center">
                <Link
                  href={slide.href as Route}
                  tabIndex={index === active ? 0 : -1}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-pink-200/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-200/40 active:scale-[0.98] dark:shadow-none dark:hover:shadow-none"
                >
                  <span className="absolute inset-0 -translate-x-[200%] bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-[200%]" />
                  <span className="relative">{slide.action}</span>
                  <ArrowRight aria-hidden="true" className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="home-hero-trust mt-14 flex flex-wrap justify-center gap-6">
                {slide.trust.map((text) => (
                  <span key={text} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-green-500" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={showPrevious}
        aria-label="Banner anterior"
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pink-100 bg-white/75 text-pink-600 shadow-md backdrop-blur-sm transition hover:border-pink-200 hover:bg-white sm:left-5 dark:border-gray-700 dark:bg-gray-900/75 dark:text-pink-400 dark:hover:bg-gray-900"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={showNext}
        aria-label="Próximo banner"
        className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pink-100 bg-white/75 text-pink-600 shadow-md backdrop-blur-sm transition hover:border-pink-200 hover:bg-white sm:right-5 dark:border-gray-700 dark:bg-gray-900/75 dark:text-pink-400 dark:hover:bg-gray-900"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" aria-label="Escolher destaque">
        {slides.map((slide, index) => (
          <button
            key={slide.accent}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Mostrar banner ${index + 1}`}
            aria-pressed={index === active}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === active
                ? 'w-7 bg-gradient-to-r from-pink-500 to-orange-400'
                : 'w-2 bg-gray-300 hover:bg-pink-300 dark:bg-gray-600 dark:hover:bg-pink-600'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
