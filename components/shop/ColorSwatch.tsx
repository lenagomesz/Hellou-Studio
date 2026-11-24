'use client';

export function ColorSwatch({ label, value, selected, unavailable = false, onClick }: {
  label: string;
  value: string;
  selected: boolean;
  unavailable?: boolean;
  onClick: () => void;
}) {
  return <button
    type="button"
    disabled={unavailable}
    onClick={onClick}
    aria-label={`${label}${unavailable ? ' indisponível' : ''}`}
    aria-pressed={selected && !unavailable}
    title={`${label}${unavailable ? ' — indisponível' : ''}`}
    className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition dark:bg-gray-900 ${unavailable
      ? 'cursor-not-allowed border-gray-300'
      : selected
        ? 'border-pink-500 ring-2 ring-pink-200 dark:ring-pink-900'
        : 'border-gray-300 hover:border-pink-400 hover:scale-105 dark:border-gray-600'}`}
  >
    <span className="relative block h-7 w-7 overflow-hidden rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: unavailable ? '#D1D5DB' : value }}>
      {unavailable && <span aria-hidden="true" className="absolute left-[-15%] top-1/2 block h-0.5 w-[130%] -rotate-45 bg-gray-600" />}
    </span>
  </button>;
}
