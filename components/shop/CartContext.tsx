'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import {
  LOCAL_CART_STORAGE_KEY,
  clampQuantity,
  computeCartCount,
  computeCartTotal,
  findExistingItem,
  type AddItemInput,
  type CartItemView,
} from '@/lib/cart';

type CartStatus = 'idle' | 'loading' | 'syncing' | 'error';

interface CartContextValue {
  items: CartItemView[];
  count: number;
  total: number;
  status: CartStatus;
  addItem: (input: AddItemInput) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readLocalCart(): CartItemView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItemView[];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItemView[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LOCAL_CART_STORAGE_KEY,
      JSON.stringify(items),
    );
  } catch {
    // ignore quota / private-mode errors
  }
}

function clearLocalCart() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_CART_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function makeLocalId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `local_${globalThis.crypto.randomUUID()}`;
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function fetchServerCart(): Promise<CartItemView[]> {
  const res = await fetch('/api/cart', {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: CartItemView[] };
  return json.items ?? [];
}

async function postServerItem(input: AddItemInput) {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: input.product.id,
      product_option_id: input.option?.id ?? null,
      quantity: input.quantity,
      customization_text: input.customization_text?.trim() || null,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Falha ao adicionar item');
  }
}

async function patchServerQuantity(id: string, quantity: number) {
  const res = await fetch(`/api/cart/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar quantidade');
}

async function deleteServerItem(id: string) {
  const res = await fetch(`/api/cart/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Falha ao remover item');
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const isAuthed = sessionStatus === 'authenticated';

  const [items, setItems] = useState<CartItemView[]>([]);
  const [status, setStatus] = useState<CartStatus>('idle');
  const hydratedRef = useRef(false);
  const lastModeRef = useRef<'guest' | 'auth' | null>(null);

  // Hydrate based on auth state. When logging in, push guest items to server
  // before fetching the merged result.
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    let cancelled = false;
    const mode: 'auth' | 'guest' = isAuthed ? 'auth' : 'guest';

    const hydrate = async () => {
      if (mode === 'guest') {
        if (lastModeRef.current === 'guest' && hydratedRef.current) return;
        const local = readLocalCart();
        if (!cancelled) {
          setItems(local);
          setStatus('idle');
          hydratedRef.current = true;
          lastModeRef.current = 'guest';
        }
        return;
      }

      // Auth mode
      setStatus('loading');
      try {
        let server: CartItemView[] = [];

        if (lastModeRef.current === 'guest' || !hydratedRef.current) {
          const guestItems = readLocalCart();

          // Try to merge guest items to server
          const syncedItems: string[] = [];
          for (const item of guestItems) {
            try {
              await postServerItem({
                product: item.product,
                option: item.option,
                quantity: item.quantity,
                customization_text: item.customization_text,
              });
              syncedItems.push(item.id);
            } catch {
              // best-effort merge, continue
            }
          }

          // Only clear localStorage if items were successfully synced
          if (syncedItems.length > 0 && syncedItems.length === guestItems.length) {
            clearLocalCart();
          }
        }

        server = await fetchServerCart();

        // If server is empty but localStorage has items, use localStorage
        if (server.length === 0) {
          const localItems = readLocalCart();
          if (localItems.length > 0) {
            server = localItems;
          }
        }

        if (!cancelled) {
          setItems(server);
          setStatus('idle');
          hydratedRef.current = true;
          lastModeRef.current = 'auth';
        }
      } catch {
        if (!cancelled) {
          // On error, fall back to localStorage
          const localItems = readLocalCart();
          setItems(localItems);
          setStatus('idle');
          hydratedRef.current = true;
          lastModeRef.current = 'auth';
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, isAuthed]);

  // Persist guest cart to localStorage on every change.
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (isAuthed) return;
    if (!hydratedRef.current) return;
    writeLocalCart(items);
  }, [items, isAuthed, sessionStatus]);

  const addItem = useCallback(
    async ({ product, option, quantity, customization_text }: AddItemInput) => {
      const safeQuantity = clampQuantity(quantity, option?.stock);
      const normalizedCustomization = customization_text?.trim() || null;

      if (isAuthed) {
        setStatus('syncing');
        try {
          await postServerItem({ product, option, quantity: safeQuantity, customization_text: normalizedCustomization });
          const server = await fetchServerCart();
          setItems(server);
          setStatus('idle');
        } catch (error) {
          setStatus('error');
          throw error;
        }
        return;
      }

      setItems((prev) => {
        const existing = findExistingItem(
          prev,
          product.id,
          option?.id ?? null,
          normalizedCustomization,
        );
        if (existing) {
          const newQty = clampQuantity(
            existing.quantity + safeQuantity,
            option?.stock,
          );
          return prev.map((item) =>
            item.id === existing.id ? { ...item, quantity: newQty } : item,
          );
        }
        const next: CartItemView = {
          id: makeLocalId(),
          product_id: product.id,
          product_option_id: option?.id ?? null,
          quantity: safeQuantity,
          customization_text: normalizedCustomization,
          product,
          option,
        };
        return [...prev, next];
      });
    },
    [isAuthed],
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      const target = items.find((item) => item.id === id);
      if (!target) return;
      const safeQuantity = clampQuantity(quantity, target.option?.stock);

      if (isAuthed) {
        setStatus('syncing');
        try {
          await patchServerQuantity(id, safeQuantity);
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, quantity: safeQuantity } : item,
            ),
          );
          setStatus('idle');
        } catch {
          setStatus('error');
        }
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: safeQuantity } : item,
        ),
      );
    },
    [isAuthed, items],
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (isAuthed) {
        setStatus('syncing');
        try {
          await deleteServerItem(id);
          setItems((prev) => prev.filter((item) => item.id !== id));
          setStatus('idle');
        } catch {
          setStatus('error');
        }
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [isAuthed],
  );

  const clearCart = useCallback(async () => {
    if (isAuthed) {
      setStatus('syncing');
      try {
        await Promise.all(items.map((item) => deleteServerItem(item.id)));
        setItems([]);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
      return;
    }
    setItems([]);
    clearLocalCart();
  }, [isAuthed, items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: computeCartCount(items),
      total: computeCartTotal(items),
      status,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, status, addItem, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart deve ser usado dentro de <CartProvider>');
  }
  return ctx;
}
