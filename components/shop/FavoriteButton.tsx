'use client';

import { useId } from 'react';
import { useFavorites } from '@/components/shop/FavoritesContext';

export function FavoriteButton({
  productId,
  productName,
  className = '',
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const gradientId = `favorite-${useId().replaceAll(':', '')}`;
  const { favoriteIds, pendingIds, toggleFavorite } = useFavorites();
  const active = favoriteIds.has(productId);
  const pending = pendingIds.has(productId);

  return (
    <button
      type="button"
      aria-label={active ? `Remover ${productName} dos favoritos` : `Salvar ${productName} nos favoritos`}
      aria-pressed={active}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite(productId, productName);
      }}
      className={`group/favorite inline-flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border border-white/80 bg-white/85 text-gray-500 shadow-sm backdrop-blur-md transition hover:scale-105 hover:border-pink-200 hover:text-pink-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-gray-950/75 dark:text-gray-300 dark:hover:border-pink-800 ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-[19px] w-[19px] transition-transform ${active ? 'scale-105' : 'group-hover/favorite:scale-105'}`}>
        <defs>
          <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ec4899" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
          fill={active ? `url(#${gradientId})` : 'none'}
          stroke={active ? `url(#${gradientId})` : 'currentColor'}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
