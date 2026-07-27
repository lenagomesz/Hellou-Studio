'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { StoreSettings } from '@/lib/store-settings-schema';

const HERO_IMAGES: Record<string, string> = {
  catalogo: '/images/home-hero-catalogo.png',
  personalizaveis: '/images/home-hero-personalizaveis.png',
  stl: '/images/home-hero-stl.png',
  encomenda: '/images/home-hero-encomenda.png',
};

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
      <div className="relative h-[calc(100svh-6rem)] min-h-[640px] w-full overflow-hidden bg-[#fff8f4] dark:bg-gray-900 md:h-[calc(100svh-6.75rem)] md:min-h-[560px]">
        <div
          className="relative flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <article
              key={slide.id}
              className="relative flex h-full min-w-full items-end overflow-hidden md:items-center"
              aria-label={`${index + 1} de ${slides.length}`}
              aria-hidden={index !== active}
            >
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src={HERO_IMAGES[slide.id] ?? HERO_IMAGES.catalogo}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover object-[78%_center] md:object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#fffaf7] via-[#fffaf7]/88 to-transparent dark:from-gray-950 dark:via-gray-950/88 md:from-[#fffaf7]/98 md:via-[#fffaf7]/30 dark:md:from-gray-950/96 dark:md:via-gray-950/35" />
              </div>

              <div className="relative z-10 flex h-full w-[58%] flex-col justify-center px-5 pb-14 pt-10 sm:w-[55%] sm:px-7 md:h-auto md:max-w-[54%] md:px-14 md:pb-14 md:pt-10 lg:max-w-[50%] lg:px-20 xl:px-24">
                <span className="hidden w-fit max-w-full items-center gap-2 rounded-full border border-pink-200/70 bg-white/85 px-3.5 py-2 text-xs font-black uppercase tracking-[0.14em] text-pink-700 shadow-sm backdrop-blur-md dark:border-pink-800/60 dark:bg-gray-900/80 dark:text-pink-300 md:inline-flex">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                  {slide.badge}
                </span>

                <h1 className="max-w-[9ch] text-[1.7rem] font-black leading-[0.98] tracking-[-0.05em] text-gray-950 dark:text-white sm:text-[2rem] md:mt-6 md:max-w-[11ch] md:text-5xl lg:text-[4rem]">
                  <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                    {slide.accent}
                  </span>
                  <span className="block sm:mt-1">{slide.title}</span>
                </h1>

                <p className="mt-5 hidden max-w-lg font-medium leading-relaxed text-gray-600 dark:text-gray-200 md:block md:text-base lg:text-lg">
                  {slide.description}
                </p>

                <Link
                  href={slide.href as Route}
                  tabIndex={index === active ? 0 : -1}
                  className="group mt-4 inline-flex min-h-9 w-fit items-center gap-1 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-3 py-1.5 text-[10px] font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/20 active:translate-y-0 sm:text-[11px] md:mt-5 md:min-h-12 md:gap-2 md:rounded-2xl md:px-6 md:py-3 md:text-sm"
                >
                  {slide.action}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <div className="mt-6 hidden gap-2 lg:grid lg:grid-cols-3">
                  {slide.trust.map((text) => (
                    <span key={text} className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-[10px] font-bold leading-tight text-gray-700 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-gray-950/45 dark:text-gray-200">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-pink-500" />
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Banner anterior"
              className="absolute left-5 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-pink-600 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-gray-900/90 dark:text-pink-300 md:flex"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Próximo banner"
              className="absolute right-5 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-pink-600 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-gray-900/90 dark:text-pink-300 md:flex"
            >
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>

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
