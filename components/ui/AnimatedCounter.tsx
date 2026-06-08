'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  target: string;
  className?: string;
}

export function AnimatedCounter({ target, className = '' }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState('0');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const numericPart = parseInt(target.replace(/\D/g, ''), 10);
    const suffix = target.replace(/[\d]/g, '');

    if (isNaN(numericPart)) {
      setDisplay(target);
      return;
    }

    const duration = 1800;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * numericPart);
      setDisplay(value + suffix);

      if (current >= steps) {
        clearInterval(timer);
        setDisplay(target);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [started, target]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
