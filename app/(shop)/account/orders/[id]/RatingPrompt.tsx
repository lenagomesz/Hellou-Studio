'use client';

import { useState, useEffect } from 'react';
import RatingModal from './RatingModal';

interface RatingPromptProps {
  orderId: string;
  orderStatus: string;
}

export default function RatingPrompt({ orderId, orderStatus }: RatingPromptProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (orderStatus !== 'delivered') return;
    const alreadyRated = localStorage.getItem(`rated-${orderId}`);
    if (!alreadyRated) {
      setShowModal(true);
    }
  }, [orderId, orderStatus]);

  if (!showModal) return null;

  return <RatingModal orderId={orderId} onClose={() => setShowModal(false)} />;
}
