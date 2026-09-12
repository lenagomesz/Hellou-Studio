'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

type FavoritesContextValue = {
  favoriteIds: ReadonlySet<string>;
  pendingIds: ReadonlySet<string>;
  toggleFavorite: (productId: string, productName: string) => Promise<void>;
};

const EMPTY_SET = new Set<string>();
const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: EMPTY_SET,
  pendingIds: EMPTY_SET,
  toggleFavorite: async () => undefined,
});

function favoriteLoginUrl() {
  const callbackUrl = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ callbackUrl, reason: 'favorite' });
  return `/login?${params.toString()}`;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'authenticated') {
      setFavoriteIds(new Set());
      return;
    }

    const controller = new AbortController();
    fetch('/api/account/favorites', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os favoritos.');
        return response.json() as Promise<{ productIds?: string[] }>;
      })
      .then((data) => setFavoriteIds(new Set(data.productIds ?? [])))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[favorites] Falha ao carregar favoritos:', error);
      });

    return () => controller.abort();
  }, [status]);

  const toggleFavorite = useCallback(async (productId: string, productName: string) => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      window.location.assign(favoriteLoginUrl());
      return;
    }

    if (pendingIds.has(productId)) return;
    const wasFavorite = favoriteIds.has(productId);
    setPendingIds((current) => new Set(current).add(productId));
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(productId);
      else next.add(productId);
      return next;
    });

    try {
      const response = await fetch(
        wasFavorite ? `/api/account/favorites?productId=${encodeURIComponent(productId)}` : '/api/account/favorites',
        wasFavorite
          ? { method: 'DELETE' }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) },
      );
      if (!response.ok) throw new Error('Não foi possível atualizar seus favoritos.');
      toast.success(wasFavorite ? `${productName} foi removido dos favoritos.` : `${productName} foi salvo nos favoritos.`);
    } catch (error) {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(productId);
        else next.delete(productId);
        return next;
      });
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar seus favoritos.');
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }, [favoriteIds, pendingIds, status]);

  const value = useMemo(() => ({ favoriteIds, pendingIds, toggleFavorite }), [favoriteIds, pendingIds, toggleFavorite]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
