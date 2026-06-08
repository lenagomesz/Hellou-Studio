'use client';

import { useCallback, useEffect, useState } from 'react';

const SLIDES = [
  {
    id: 1,
    emoji: '🎨',
    title: 'Cores Personalizadas',
    description: 'Escolha entre centenas de combinações únicas de cores.',
    gradient: 'from-pink-500 via-pink-400 to-orange-400',
  },
  {
    id: 2,
    emoji: '⚡',
    title: 'Impressão Rápida',
    description: 'Produção em até 3 dias úteis com tecnologia FDM/SLA.',
    gradient: 'from-orange-400 via-pink-500 to-pink-400',
  },
  {
    id: 3,
    emoji: '📦',
    title: 'Envio Seguro',
    description: 'Embalagem premium com rastreamento para todo o Brasil.',
    gradient: 'from-pink-400 via-orange-400 to-pink-500',
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(next, 4000);
    return () => clearInterval(interval);
  }, [next]);

  const slide = SLIDES[active];

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-lg">
      <div
        className={`relative flex h-[220px] items-center justify-center bg-gradient-to-r ${slide.gradient} px-8 text-center transition-all duration-700 ease-out sm:h-[240px]`}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        </div>

        <div className="relative">
          <span
            key={`emoji-${slide.id}`}
            className="inline-block text-5xl animate-scale-in"
          >
            {slide.emoji}
          </span>
          <h3
            key={`title-${slide.id}`}
            className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl animate-fade-in-up"
          >
            {slide.title}
          </h3>
          <p
            key={`desc-${slide.id}`}
            className="mx-auto mt-3 max-w-md text-base text-white/90 animate-fade-in"
            style={{ animationDelay: '150ms' }}
          >
            {slide.description}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? 'w-6 bg-white' : 'w-2 bg-white/50'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
