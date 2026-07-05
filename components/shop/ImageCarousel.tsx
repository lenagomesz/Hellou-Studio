'use client';

import { useState } from 'react';

interface ImageCarouselProps {
  image1: string;
  image2?: string;
  alt: string;
}

export function ImageCarousel({ image1, image2, alt }: ImageCarouselProps) {
  const [showSecond, setShowSecond] = useState(false);

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
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setShowSecond(true)}
      onMouseLeave={() => setShowSecond(false)}
    >
      {/* Primeira imagem (principal) */}
      <img
        src={image1}
        alt={alt}
        className={`absolute w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 ${
          showSecond ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Segunda imagem (ao passar mouse) */}
      <img
        src={image2}
        alt={`${alt} - vista alternativa`}
        className={`absolute w-full h-full object-cover transition-opacity duration-300 group-hover:scale-105 ${
          showSecond ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Indicador visual */}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full text-center">
        {showSecond ? '2/2' : '1/2'}
      </div>
    </div>
  );
}
