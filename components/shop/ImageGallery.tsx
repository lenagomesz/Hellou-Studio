'use client';

import { useState, useEffect } from 'react';

interface ImageGalleryProps {
  image1: string;
  image2?: string;
}

export function ImageGallery({ image1, image2 }: ImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = image2 ? [image1, image2] : [image1];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!hasMultiple) return;

    const intervals: NodeJS.Timeout[] = [];

    if (hasMultiple) {
      // Imagem 1 por 6 segundos
      intervals.push(
        setTimeout(() => setCurrentImageIndex(1), 6000)
      );
      // Imagem 2 por 3 segundos (volta pra 0)
      intervals.push(
        setTimeout(() => setCurrentImageIndex(0), 9000)
      );
    }

    return () => intervals.forEach(interval => clearTimeout(interval));
  }, [hasMultiple]);

  return (
    <div>
      {/* Imagem principal */}
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentImageIndex]}
          alt="Produto"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Minigaleria - mostrar apenas se tiver 2 imagens */}
      {hasMultiple && (
        <div className="mt-2 flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`h-12 w-12 overflow-hidden rounded transition flex-shrink-0 ${
                currentImageIndex === i
                  ? 'ring-2 ring-pink-500'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Imagem ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
