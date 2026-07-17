'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

interface ImageGalleryProps {
  images: string[];
  alt: string;
  activeImage?: string | null;
  overlay?: ReactNode;
}

export function ImageGallery({ images, alt, activeImage = null, overlay }: ImageGalleryProps) {
  const normalizedImages = useMemo(
    () => Array.from(new Set(images.map((image) => image.trim()).filter(Boolean))),
    [images],
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const availableImages = useMemo(
    () => normalizedImages.filter((image) => !failedImages.includes(image)),
    [failedImages, normalizedImages],
  );
  const hasMultiple = availableImages.length > 1;

  useEffect(() => {
    setCurrentImageIndex((current) => Math.min(current, Math.max(availableImages.length - 1, 0)));
  }, [availableImages.length]);

  useEffect(() => {
    if (!activeImage) return;
    const activeIndex = availableImages.indexOf(activeImage.trim());
    if (activeIndex >= 0) setCurrentImageIndex(activeIndex);
  }, [activeImage, availableImages]);

  useEffect(() => {
    if (!hasMultiple) return;
    const interval = globalThis.setInterval(() => {
      setCurrentImageIndex((current) => (current + 1) % availableImages.length);
    }, 6000);
    return () => globalThis.clearInterval(interval);
  }, [availableImages.length, hasMultiple]);

  const currentImage = availableImages[currentImageIndex];

  if (!currentImage) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 text-center text-sm text-gray-500 dark:from-gray-800 dark:to-gray-700 dark:text-gray-400">
        Imagem temporariamente indisponível
      </div>
    );
  }

  const markAsFailed = (image: string) => {
    setFailedImages((failed) => (failed.includes(image) ? failed : [...failed, image]));
  };

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`${alt} — imagem ${currentImageIndex + 1}`}
          className="h-full w-full object-cover"
          onError={() => markAsFailed(currentImage)}
        />
        {overlay}
      </div>

      {hasMultiple && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Galeria de imagens">
          {availableImages.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setCurrentImageIndex(index)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                currentImageIndex === index
                  ? 'border-pink-500 ring-2 ring-pink-500/20'
                  : 'border-transparent opacity-65 hover:opacity-100'
              }`}
              aria-label={`Mostrar imagem ${index + 1}`}
              aria-pressed={currentImageIndex === index}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
                onError={() => markAsFailed(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
