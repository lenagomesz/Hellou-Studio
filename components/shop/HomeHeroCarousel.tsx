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
      className="home-hero relative overflow-hidden bg-[#fffaf7] px-3 py-4 dark:bg-gray-950 sm:px-6 sm:py-6 lg:px-10"
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
      <div className="relative mx-auto aspect-[5/4] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-pink-100 bg-[#fff8f4] shadow-[0_28px_80px_-38px_rgba(190,24,93,0.38)] dark:border-white/10 dark:bg-gray-900 sm:aspect-[16/9] sm:rounded-[2.75rem] lg:aspect-[12/5]">
        <div
          className="relative flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <article
              key={slide.id}
              className="relative flex min-w-full items-start overflow-hidden px-7 pb-20 pt-8 sm:items-center sm:px-12 sm:pb-14 sm:pt-10 lg:px-16"
              aria-label={`${index + 1} de ${slides.length}`}
              aria-hidden={index !== active}
            >
              <Image
                src={HERO_IMAGES[slide.id] ?? HERO_IMAGES.catalogo}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 96vw, 1280px"
                className="object-cover object-[64%_center] sm:object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#fffaf7]/96 via-[#fffaf7]/78 to-transparent sm:via-[#fffaf7]/32 lg:via-transparent dark:from-gray-950/94 dark:via-gray-950/38" />

              <div className="relative z-10 w-full max-w-[68%] sm:max-w-[56%] lg:max-w-[48%]">
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-200/70 bg-white/85 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.17em] text-pink-700 shadow-sm backdrop-blur-md dark:border-pink-800/60 dark:bg-gray-900/80 dark:text-pink-300 sm:text-xs">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                  {slide.badge}
                </span>

                <h1 className="mt-5 max-w-[11ch] text-[2.15rem] font-black leading-[0.96] tracking-[-0.05em] text-gray-950 dark:text-white sm:mt-6 sm:text-5xl lg:text-[4rem]">
                  <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
                    {slide.accent}
                  </span>
                  <span className="block sm:mt-1">{slide.title}</span>
                </h1>

                <p className="mt-4 hidden max-w-lg text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-200 min-[430px]:block sm:mt-5 sm:text-base lg:text-lg">
                  {slide.description}
                </p>

                <Link
                  href={slide.href as Route}
                  tabIndex={index === active ? 0 : -1}
                  className="group mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/20 active:translate-y-0 sm:min-h-12 sm:px-6 sm:py-3 sm:text-sm"
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
              className="absolute bottom-5 left-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-pink-600 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-gray-900/90 dark:text-pink-300 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Próximo banner"
              className="absolute bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-pink-600 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-gray-900/90 dark:text-pink-300 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
            >
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>

            <div className="absolute bottom-9 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:bottom-5" aria-label="Escolher destaque">
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
