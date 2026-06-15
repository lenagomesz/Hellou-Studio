'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/components/shop/CartContext';

export function ClearCartOnMount() {
  const { clearCart, items, status } = useCart();
  const didClear = useRef(false);

  useEffect(() => {
    if (didClear.current) return;
    if (status === 'loading') return;
    didClear.current = true;
    if (items.length > 0) {
      void clearCart();
    }
  }, [clearCart, items, status]);

  return null;
}
