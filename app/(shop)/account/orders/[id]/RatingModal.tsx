'use client';

import { useState } from 'react';

interface RatingModalProps {
  orderId: string;
  onClose: () => void;
}

const EMOJIS = [
  { value: 1, emoji: '😞', label: 'Muito insatisfeito' },
  { value: 2, emoji: '😕', label: 'Insatisfeito' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '😊', label: 'Satisfeito' },
  { value: 5, emoji: '😍', label: 'Muito satisfeito' },
];

export default function RatingModal({ orderId, onClose }: RatingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  async function handleRate(rating: number) {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating }),
      });

      if (res.ok) {
        localStorage.setItem(`rated-${orderId}`, '1');
        setShowThanks(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const error = await res.json();
        console.error('[RatingModal] API error:', res.status, error);
      }
    } catch (err) {
      console.error('[RatingModal] fetch error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Fechar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {showThanks ? (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Obrigada pela avaliação!
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Como foi sua experiência?
            </h2>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
              Avalie seu pedido
            </p>
            <div className="flex justify-center gap-3">
              {EMOJIS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRate(value)}
                  disabled={isSubmitting}
                  title={label}
                  className="text-3xl sm:text-4xl transition hover:scale-125 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
