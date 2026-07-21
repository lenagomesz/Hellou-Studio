'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

export function ImageUploadField({
  value,
  onChange,
  label = 'Imagem',
  compact = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('images', file);
      const response = await fetch('/api/upload/product-images', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({})) as { urls?: string[]; error?: string };
      if (!response.ok || !payload.urls?.[0]) throw new Error(payload.error || 'Não foi possível enviar a imagem.');
      onChange(payload.urls[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</p>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Prévia da variação" className={`${compact ? 'h-11 w-11' : 'h-16 w-16'} rounded-lg object-cover`} />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">Imagem enviada</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-1 text-[11px] font-bold text-pink-600">Trocar imagem</button></div>
          <button type="button" onClick={() => onChange('')} aria-label="Remover imagem da variação" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pink-300 bg-pink-50/50 px-3 py-3 text-xs font-bold text-pink-600 transition hover:bg-pink-50 disabled:opacity-60 dark:border-pink-900 dark:bg-pink-950/20">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? 'Enviando…' : 'Escolher imagem do computador'}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} className="hidden" />
      {error && <p role="alert" className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

