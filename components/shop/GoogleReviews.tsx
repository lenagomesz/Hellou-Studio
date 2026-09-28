'use client';

import { useEffect, useState } from 'react';

const REVIEWS = [
  'Os produtos são incríveis, com extremo cuidado e qualidade nos acabamentos e detalhes, além de um atendimento maravilhoso 👏',
  'Os itens são incríveis, de ótima qualidade e com acabamentos impecáveis, além de ser muito úteis! Super recomendo! ❤️❤️❤️',
  'A melhor, extremamente detalhista em cada detalhe, tudo feito com muito carinho!',
  'Atendimento excepcional, produto de ótima qualidade e personalização com a minha cara! Enfim, indico de olhos fechados!',
  'Muito bom!! Material de qualidade e entrega rápida. Recomendo!!!',
  'Qualidade excelente e o atendimento excepcional!!',
  'Amei demais meu pedido na Hellou! Ficou tudo perfeito 😍',
  'Excelente atendimento e produtos incríveis. Recomendo!',
];

export function GoogleReviews() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % REVIEWS.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [paused]);

  const goTo = (index: number) => setActiveIndex(index);
  const previous = () => goTo((activeIndex - 1 + REVIEWS.length) % REVIEWS.length);
  const next = () => goTo((activeIndex + 1) % REVIEWS.length);

  return (
    <div
      className="mx-auto mt-8 max-w-3xl sm:mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <button type="button" onClick={previous} aria-label="Ver avaliação anterior" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-white text-lg font-bold text-pink-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 hover:text-orange-500 dark:border-gray-800 dark:bg-gray-900 dark:text-pink-400" aria-controls="google-review-slide">
          <span aria-hidden="true">←</span>
        </button>

        <div id="google-review-slide" aria-live="polite" className="min-w-0 flex-1 overflow-hidden">
          <blockquote key={activeIndex} className="min-h-52 rounded-2xl border border-white/80 bg-white/90 p-5 text-center shadow-[0_12px_30px_-22px_rgba(219,39,119,.5)] [animation:review-fade-slide_450ms_ease-out_both] dark:border-gray-800 dark:bg-gray-900/90 sm:min-h-48 sm:rounded-3xl sm:p-7">
            <span className="text-lg tracking-[0.12em] text-amber-400" aria-label="5 de 5 estrelas">★★★★★</span>
            <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">&ldquo;{REVIEWS[activeIndex]}&rdquo;</p>
            <footer className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-pink-600 dark:from-pink-950/50 dark:to-orange-950/50 dark:text-pink-300" aria-hidden="true">G</span>
              Avaliação publicada no Google
            </footer>
          </blockquote>
        </div>

        <button type="button" onClick={next} aria-label="Ver próxima avaliação" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-white text-lg font-bold text-pink-600 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 hover:text-orange-500 dark:border-gray-800 dark:bg-gray-900 dark:text-pink-400" aria-controls="google-review-slide">
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="mt-5 flex justify-center gap-1.5" aria-label="Selecionar avaliação">
        {REVIEWS.map((review, index) => (
          <button key={review} type="button" onClick={() => goTo(index)} aria-label={`Mostrar avaliação ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-gradient-to-r from-pink-500 to-orange-400' : 'w-2 bg-pink-200 hover:bg-pink-300 dark:bg-pink-900 dark:hover:bg-pink-800'}`} />
        ))}
      </div>
    </div>
  );
}
