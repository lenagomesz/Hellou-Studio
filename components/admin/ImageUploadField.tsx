'use client';

import { useEffect, useRef, useState } from 'react';
import { Crop, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react';

const CROP_OUTPUT_SIZE = 1000;

function drawSquareCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  zoom: number,
  positionX: number,
  positionY: number,
) {
  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return;

  const scale = Math.max(CROP_OUTPUT_SIZE / image.naturalWidth, CROP_OUTPUT_SIZE / image.naturalHeight) * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const availableX = Math.max(0, (width - CROP_OUTPUT_SIZE) / 2);
  const availableY = Math.max(0, (height - CROP_OUTPUT_SIZE) / 2);
  const x = (CROP_OUTPUT_SIZE - width) / 2 + (positionX / 100) * availableX;
  const y = (CROP_OUTPUT_SIZE - height) / 2 + (positionY / 100) * availableY;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
  context.drawImage(image, x, y, width, height);
}

export function ImageUploadField({
  value,
  onChange,
  label = 'Imagem',
  compact = false,
  cropSquare = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  compact?: boolean;
  cropSquare?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropUrlRef = useRef('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);

  useEffect(() => {
    if (!cropFile || !cropCanvasRef.current || !cropImageRef.current) return;
    drawSquareCrop(cropCanvasRef.current, cropImageRef.current, zoom, positionX, positionY);
  }, [cropFile, positionX, positionY, zoom]);

  useEffect(() => () => {
    if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
  }, []);

  function closeCrop() {
    if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current);
    cropUrlRef.current = '';
    cropImageRef.current = null;
    setCropFile(null);
    setZoom(1);
    setPositionX(0);
    setPositionY(0);
    if (inputRef.current) inputRef.current.value = '';
  }

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

  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!cropSquare) {
      void upload(file);
      return;
    }

    setError('');
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      cropUrlRef.current = objectUrl;
      cropImageRef.current = image;
      setZoom(1);
      setPositionX(0);
      setPositionY(0);
      setCropFile(file);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('Não foi possível abrir esta imagem.');
      if (inputRef.current) inputRef.current.value = '';
    };
    image.src = objectUrl;
  }

  async function applyCrop() {
    const canvas = cropCanvasRef.current;
    if (!canvas || !cropFile) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
    if (!blob) {
      setError('Não foi possível ajustar esta imagem.');
      return;
    }
    const baseName = cropFile.name.replace(/\.[^.]+$/, '') || 'opcao';
    const adjustedFile = new File([blob], `${baseName}-ajustada.webp`, { type: 'image/webp' });
    closeCrop();
    await upload(adjustedFile);
  }

  return (
    <div className={`min-w-0 w-full ${compact ? 'space-y-1.5' : 'space-y-2'}`}>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</p>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Prévia da variação" className={`${compact ? 'h-11 w-11' : 'h-16 w-16'} rounded-lg object-cover`} />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">Imagem enviada</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-1 text-[11px] font-bold text-pink-600">{cropSquare ? 'Trocar e reajustar' : 'Trocar imagem'}</button></div>
          <button type="button" onClick={() => onChange('')} aria-label="Remover imagem da variação" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pink-300 bg-pink-50/50 px-3 py-3 text-xs font-bold text-pink-600 transition hover:bg-pink-50 disabled:opacity-60 dark:border-pink-900 dark:bg-pink-950/20">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? 'Enviando…' : 'Escolher imagem do computador'}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} className="hidden" />
      <label className="block min-w-0">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Ou cole a URL da imagem</span>
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          className="mt-1 block min-w-0 w-full max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </label>
      {error && <p role="alert" className="text-[11px] font-medium text-red-600">{error}</p>}

      {cropFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="image-crop-title" className="text-lg font-bold text-slate-950 dark:text-white">Ajustar imagem da opção</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">A prévia quadrada será exatamente o enquadramento mostrado no produto.</p>
              </div>
              <button type="button" onClick={closeCrop} aria-label="Fechar ajuste de imagem" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto mt-5 aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-pink-200 bg-slate-100 shadow-inner dark:border-pink-900 dark:bg-slate-950">
              <canvas ref={cropCanvasRef} className="h-full w-full" aria-label="Prévia do recorte quadrado" />
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300"><span>Zoom</span><span>{Math.round(zoom * 100)}%</span></span>
                <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-pink-600" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mover na horizontal</span>
                  <input type="range" min="-100" max="100" step="1" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} className="mt-2 w-full accent-pink-600" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mover na vertical</span>
                  <input type="range" min="-100" max="100" step="1" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} className="mt-2 w-full accent-pink-600" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => { setZoom(1); setPositionX(0); setPositionY(0); }} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <RotateCcw className="h-4 w-4" /> Restaurar
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={closeCrop} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
                <button type="button" onClick={() => void applyCrop()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
                  <Crop className="h-4 w-4" /> Usar imagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
