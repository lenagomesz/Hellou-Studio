'use client';

interface MarqueeProps {
  items: string[];
  speed?: number;
}

export function Marquee({ items, speed = 30 }: MarqueeProps) {
  // A faixa precisa ser mais larga que telas grandes antes de repetir. Dois
  // blocos idênticos permitem que a animação volte ao início sem salto.
  const loopItems = Array.from({ length: 3 }, () => items).flat();

  return (
    <div className="relative overflow-hidden py-4" aria-label={items.join(' · ')}>
      <p className="sr-only">{items.join('. ')}</p>
      <div
        aria-hidden="true"
        className="flex w-max animate-marquee gap-8 motion-reduce:translate-x-0 motion-reduce:animate-none"
        style={{ animationDuration: `${speed}s` }}
      >
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0 gap-8">
            {loopItems.map((item, index) => (
              <span
                key={`${group}-${index}`}
                className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-500"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-400 to-orange-400" />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
