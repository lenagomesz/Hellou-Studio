'use client';

/* eslint-disable @next/next/no-img-element -- URLs externas e transição sobreposta do carrossel. */

import { useState, useEffect } from 'react';

interface ImageCarouselProps {
  image1: string;
  image2?: string;
  alt: string;
}

export function ImageCarousel({ image1, image2, alt }: ImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = image2 ? [image1, image2] : [image1];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!hasMultiple) return;

    const timeout1 = setTimeout(() => setCurrentImageIndex(1), 6000);
    const timeout2 = setTimeout(() => setCurrentImageIndex(0), 9000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [hasMultiple]);

  if (!image2) {
    return (
      <img
        src={image1}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-105 transition"
      />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Primeira imagem */}
      <img
        src={images[0]}
        alt={alt}
        className={`absolute w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 ${
          currentImageIndex === 0 ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Segunda imagem */}
      <img
        src={images[1]}
        alt={`${alt} - vista alternativa`}
        className={`absolute w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 ${
          currentImageIndex === 1 ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Indicador visual */}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full text-center">
        {currentImageIndex + 1}/2
      </div>
    </div>
  );
}
