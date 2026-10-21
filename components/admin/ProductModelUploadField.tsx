'use client';

import { useId, useRef, useState } from 'react';

export function ProductModelUploadField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('model', file);
      const response = await fetch('/api/upload/product-model', { method: 'POST', body });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível enviar o modelo');
      onChange(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível enviar o modelo');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <div className="rounded-xl border border-violet-200 p-3 dark:border-violet-900">
      <label htmlFor={id} className="block text-xs font-semibold">{label}</label>
      <p className="mt-1 text-xs text-gray-500">STL ou GLB até 25 MB. A prévia acompanha este modelo e a cor escolhida.</p>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="URL do modelo 3D (opcional)" className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-2 text-xs dark:border-gray-700" />
      <input ref={input} type="file" accept=".stl,.glb" hidden onChange={(event) => void upload(event.target.files?.[0])} />
      <button type="button" disabled={uploading} onClick={() => input.current?.click()} className="mt-2 rounded-lg bg-violet-100 px-3 py-2 text-xs font-bold text-violet-800 disabled:opacity-50">{uploading ? 'Enviando modelo…' : `Enviar 3D: ${label.replace(/^Modelo 3D: /, '')}`}</button>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
