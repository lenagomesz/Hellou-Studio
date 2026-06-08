'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/components/shop/CartContext';

export function ClearCartOnMount() {
  const { clearCart, items } = useCart();
  const didClear = useRef(false);

  useEffect(() => {
    if (didClear.current) return;
    if (items.length === 0) return;
    didClear.current = true;
    void clearCart();
  }, [clearCart, items]);

  return null;
}
