'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { StoreSettings } from '@/lib/store-settings-schema';

function AxolotlMascot() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 280 230"
      className="h-auto w-full drop-shadow-[0_18px_28px_rgba(190,24,93,0.24)]"
    >
      <defs>
        <linearGradient id="axolotl-body" x1="48" y1="28" x2="216" y2="212" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD2D9" />
          <stop offset="0.5" stopColor="#FF9EAD" />
          <stop offset="1" stopColor="#FB7185" />
        </linearGradient>
        <linearGradient id="axolotl-gill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
        <radialGradient id="axolotl-cheek">
          <stop stopColor="#F43F5E" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F43F5E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g fill="url(#axolotl-gill)" stroke="#BE185D" strokeWidth="3.5" strokeLinejoin="round">
        <path d="M76 75C38 65 28 40 43 31c11-7 25 8 29 22-3-25 8-44 22-39 13 5 8 29-1 43 12-15 31-22 38-10 8 14-14 31-35 34Z" />
        <path d="M204 75c38-10 48-35 33-44-11-7-25 8-29 22 3-25-8-44-22-39-13 5-8 29 1 43-12-15-31-22-38-10-8 14 14 31 35 34Z" />
      </g>

      <path
        d="M174 180c40-4 70 9 79 29-23-8-43-4-59 12-13 13-35-1-24-17"
        fill="url(#axolotl-body)"
        stroke="#BE185D"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="140" cy="116" rx="81" ry="78" fill="url(#axolotl-body)" stroke="#BE185D" strokeWidth="4" />
      <ellipse cx="91" cy="127" rx="22" ry="17" fill="url(#axolotl-cheek)" />
      <ellipse cx="189" cy="127" rx="22" ry="17" fill="url(#axolotl-cheek)" />
      <ellipse cx="109" cy="104" rx="12" ry="16" fill="#201A24" />
      <ellipse cx="171" cy="104" rx="12" ry="16" fill="#201A24" />
      <ellipse cx="105" cy="99" rx="4" ry="5" fill="white" />
      <ellipse cx="167" cy="99" rx="4" ry="5" fill="white" />
      <path d="M124 128c7 11 25 11 32 0" fill="none" stroke="#9D174D" strokeWidth="5" strokeLinecap="round" />
      <path d="M126 130c7 8 21 8 28 0-2 15-25 15-28 0Z" fill="#BE185D" />
      <path d="M102 179c-20 8-29 22-22 31 7 8 23 1 33-15M178 179c20 8 29 22 22 31-7 8-23 1-33-15" fill="url(#axolotl-body)" stroke="#BE185D" strokeWidth="4" strokeLinecap="round" />
      <path d="M90 68c16-15 84-24 105 4" fill="none" stroke="white" strokeOpacity="0.36" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function GlassRibbon({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 540 260"
      className={`absolute h-auto w-[118%] max-w-none opacity-80 ${flip ? '-bottom-12 -right-24 rotate-12' : '-right-20 -top-12 -rotate-6'}`}
    >
      <defs>
        <linearGradient id={flip ? 'ribbon-flip' : 'ribbon'} x1="20" y1="40" x2="510" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9A8D4" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#FB7185" stopOpacity="0.82" />
          <stop offset="1" stopColor="#FDBA74" stopOpacity="0.72" />
        </linearGradient>
        <filter id={flip ? 'ribbon-shadow-flip' : 'ribbon-shadow'} x="-20%" y="-30%" width="140%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#BE185D" floodOpacity="0.2" />
        </filter>
      </defs>
      <path
        d="M-20 188C84 61 173 232 278 117 366 21 435 55 568 12"
        fill="none"
        stroke={`url(#${flip ? 'ribbon-flip' : 'ribbon'})`}
        strokeWidth="62"
        strokeLinecap="round"
        filter={`url(#${flip ? 'ribbon-shadow-flip' : 'ribbon-shadow'})`}
      />
      <path d="M-10 177C87 69 176 218 286 105 375 13 448 52 562 20" fill="none" stroke="white" strokeOpacity="0.52" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

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
      className="home-hero relative flex min-h-[calc(100svh-6.75rem)] items-center overflow-hidden bg-[#fffaf7] py-4 dark:bg-gray-950 sm:py-6"
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
      <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #ec4899 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div
        className="relative flex w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            className="home-hero-content min-w-full px-3 py-2 sm:px-6 lg:px-10"
            aria-label={`${index + 1} de ${slides.length}`}
            aria-hidden={index !== active}
          >
            <div className="home-hero-shell relative mx-auto min-h-[680px] max-w-7xl overflow-hidden rounded-[2rem] border border-pink-100/80 bg-white shadow-[0_28px_80px_-38px_rgba(190,24,93,0.38)] dark:border-white/10 dark:bg-gray-900 sm:min-h-[650px] sm:rounded-[2.75rem]">
              <div className="home-hero-color-field absolute inset-y-0 right-0 w-[44%] overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.35),transparent_30%),linear-gradient(145deg,transparent_35%,rgba(255,255,255,0.12)_36%,transparent_63%)]" />
                <GlassRibbon />
                <GlassRibbon flip />
                <div className="absolute right-[8%] top-[15%] h-36 w-36 rounded-full border-[18px] border-white/20 bg-white/10 shadow-[inset_0_0_28px_rgba(255,255,255,0.38),0_24px_40px_rgba(136,19,55,0.18)] backdrop-blur-sm" />
              </div>

              <div className="home-hero-layout relative grid min-h-[680px] grid-cols-1 md:min-h-[650px] md:grid-cols-[56%_44%]">
                <div className="home-hero-copy flex min-w-0 flex-col">
                  <div className="home-hero-heading relative px-6 pb-12 pt-10 sm:px-10 sm:pt-12 md:bg-transparent md:px-12 md:pb-5 md:pt-14 lg:px-16">
                    <span className="home-hero-badge inline-flex items-center gap-2 rounded-full border border-pink-200/70 bg-white/85 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.17em] text-pink-700 shadow-sm backdrop-blur-md dark:border-pink-800/60 dark:bg-gray-900/80 dark:text-pink-300 sm:text-xs">
                      <span className="h-2 w-2 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 shadow-[0_0_0_4px_rgba(255,255,255,0.32)]" />
                      {slide.badge}
                    </span>

                    <h1 className="home-hero-title mt-5 max-w-[12ch] text-[2.65rem] font-black leading-[0.98] tracking-[-0.05em] text-white md:mt-7 md:max-w-[10ch] md:text-gray-950 dark:md:text-white sm:text-5xl lg:text-[4.4rem]">
                      <span className="md:bg-gradient-to-r md:from-pink-500 md:to-orange-400 md:bg-clip-text md:text-transparent">
                        {slide.accent}
                      </span>
                      <span className="block md:mt-1">{slide.title}</span>
                    </h1>
                  </div>

                  <div className="home-hero-body flex flex-1 flex-col px-6 pb-24 pt-7 sm:px-10 md:px-12 md:pb-16 md:pt-3 lg:px-16">
                    <p className="home-hero-description max-w-xl text-base font-medium leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
                      {slide.description}
                    </p>

                    <div className="home-hero-actions mt-7">
                      <Link
                        href={slide.href as Route}
                        tabIndex={index === active ? 0 : -1}
                        className="group inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/20 active:translate-y-0"
                      >
                        {slide.action}
                        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>

                    <div className="home-hero-trust mt-auto grid gap-2 pt-8 sm:grid-cols-3 md:max-w-2xl">
                      {slide.trust.map((text) => (
                        <span key={text} className="flex min-h-12 items-center gap-2 rounded-2xl border border-pink-100 bg-pink-50/55 px-3 py-2.5 text-[11px] font-bold leading-tight text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-pink-500" />
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="home-hero-art relative hidden overflow-hidden md:block">
                  <div className="absolute bottom-[12%] right-[8%] w-[72%] max-w-[330px]">
                    <AxolotlMascot />
                  </div>
                  <div className="absolute bottom-[7%] right-[2%] h-20 w-[86%] rounded-[50%] border-[12px] border-white/25 bg-white/10 shadow-[inset_0_0_22px_rgba(255,255,255,0.35),0_22px_36px_rgba(136,19,55,0.2)] backdrop-blur-sm" />
                </div>
              </div>

              <div className="home-hero-mobile-mascot pointer-events-none absolute right-[-1rem] top-[13.5rem] w-36 md:hidden">
                <AxolotlMascot />
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
            className="absolute bottom-5 left-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-pink-600 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-gray-900/90 dark:text-pink-300 sm:bottom-auto sm:left-5 sm:top-1/2 sm:-translate-y-1/2"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Próximo banner"
            className="absolute bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-pink-100 bg-white/90 text-pink-600 shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-gray-900/90 dark:text-pink-300 sm:bottom-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2"
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
    </section>
  );
}
