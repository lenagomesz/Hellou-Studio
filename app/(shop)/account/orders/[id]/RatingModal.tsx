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
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleRate() {
    if (isSubmitting || !selectedRating) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/orders/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, rating: selectedRating, comment }),
      });

      if (res.ok) {
        localStorage.setItem(`rated-${orderId}`, '1');
        setShowThanks(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? 'Não foi possível enviar sua avaliação. Tente novamente.');
      }
    } catch (err) {
      console.error('[RatingModal] fetch error:', err);
      setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
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
                  onClick={() => setSelectedRating(value)}
                  disabled={isSubmitting}
                  title={label}
                  className={`rounded-xl p-1 text-3xl transition hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed sm:text-4xl ${selectedRating === value ? 'scale-110 bg-pink-50 ring-2 ring-pink-500 dark:bg-pink-500/10' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {selectedRating && (
              <div className="mt-5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quer contar um pouco mais? <span className="font-normal text-gray-400">(opcional)</span></label>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1200} rows={3} placeholder="O que você mais gostou? Algo poderia melhorar?" className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 dark:border-gray-700 dark:bg-gray-800 dark:focus:ring-pink-500/10" />
                {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
                <button type="button" onClick={handleRate} disabled={!selectedRating || isSubmitting} className="mt-3 w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">{isSubmitting ? 'Enviando...' : 'Enviar avaliação'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
