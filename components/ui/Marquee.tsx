'use client';

interface MarqueeProps {
  items: string[];
  speed?: number;
}

export function Marquee({ items, speed = 30 }: MarqueeProps) {
  const content = [...items, ...items];

  return (
    <div className="relative overflow-hidden py-4">
      <div
        className="flex w-max animate-marquee gap-8"
        style={{ animationDuration: `${speed}s` }}
      >
        {content.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-500"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-pink-400 to-orange-400" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
