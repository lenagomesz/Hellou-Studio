'use client';

import { useEffect, useRef, useState } from 'react';
import { Crop, Upload, Loader2, RotateCcw, X } from 'lucide-react';
import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';

const RESIZED_IMAGE_SIZE = 1000;

function drawSquareImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  zoom: number,
  positionX: number,
  positionY: number,
) {
  canvas.width = RESIZED_IMAGE_SIZE;
  canvas.height = RESIZED_IMAGE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return;

  const scale = Math.max(RESIZED_IMAGE_SIZE / image.naturalWidth, RESIZED_IMAGE_SIZE / image.naturalHeight) * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const availableX = Math.max(0, (width - RESIZED_IMAGE_SIZE) / 2);
  const availableY = Math.max(0, (height - RESIZED_IMAGE_SIZE) / 2);
  const x = (RESIZED_IMAGE_SIZE - width) / 2 + (positionX / 100) * availableX;
  const y = (RESIZED_IMAGE_SIZE - height) / 2 + (positionY / 100) * availableY;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, RESIZED_IMAGE_SIZE, RESIZED_IMAGE_SIZE);
  context.drawImage(image, x, y, width, height);
}

export function ImagesSection() {
  const { state, dispatch } = useProductEditor();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const resizeCanvasRef = useRef<HTMLCanvasElement>(null);
  const resizeImageRef = useRef<HTMLImageElement | null>(null);
  const resizeUrlRef = useRef('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resizeFiles, setResizeFiles] = useState<File[]>([]);
  const [resizedFiles, setResizedFiles] = useState<File[]>([]);
  const [resizeIndex, setResizeIndex] = useState(0);
  const [resizeFile, setResizeFile] = useState<File | null>(null);
  const [replacementImageIndex, setReplacementImageIndex] = useState<number | null>(null);
  const [preparingImageIndex, setPreparingImageIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);

  useEffect(() => {
    if (!resizeFile || !resizeCanvasRef.current || !resizeImageRef.current) return;
    drawSquareImage(resizeCanvasRef.current, resizeImageRef.current, zoom, positionX, positionY);
  }, [positionX, positionY, resizeFile, zoom]);

  useEffect(() => () => {
    if (resizeUrlRef.current) URL.revokeObjectURL(resizeUrlRef.current);
  }, []);

  const uploadImages = async (files: FileList | File[], replaceIndex: number | null = null) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    if (replaceIndex === null && state.images.length + selected.length > 6) {
      setError('Você pode cadastrar até 6 imagens por produto');
      return;
    }

    setError(null);
    setUploadingImages(true);
    try {
      const formData = new FormData();
      selected.forEach((file) => formData.append('images', file));
      const response = await fetch('/api/upload/product-images', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { urls?: string[]; error?: string };
      if (!response.ok || !data.urls) throw new Error(data.error ?? 'Não foi possível enviar as imagens');
      if (replaceIndex === null) {
        dispatch({ type: 'SET_IMAGES', images: [...state.images, ...data.urls] });
      } else {
        dispatch({
          type: 'SET_IMAGES',
          images: state.images.map((url, index) => index === replaceIndex ? data.urls![0] : url),
        });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Erro ao enviar imagens');
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const clearCurrentResizeImage = () => {
    if (resizeUrlRef.current) URL.revokeObjectURL(resizeUrlRef.current);
    resizeUrlRef.current = '';
    resizeImageRef.current = null;
  };

  const closeResize = () => {
    clearCurrentResizeImage();
    setResizeFiles([]);
    setResizedFiles([]);
    setResizeIndex(0);
    setResizeFile(null);
    setReplacementImageIndex(null);
    setZoom(1);
    setPositionX(0);
    setPositionY(0);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const openResizeFile = (file: File) => {
    clearCurrentResizeImage();
    setZoom(1);
    setPositionX(0);
    setPositionY(0);

    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resizeUrlRef.current = objectUrl;
      resizeImageRef.current = image;
      setResizeFile(file);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError(`${file.name}: não foi possível abrir esta imagem`);
      closeResize();
    };
    image.src = objectUrl;
  };

  const selectImagesForResize = (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    if (state.images.length + selected.length > 6) {
      setError('Você pode cadastrar até 6 imagens por produto');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    setError(null);
    setResizeFiles(selected);
    setResizedFiles([]);
    setResizeIndex(0);
    setReplacementImageIndex(null);
    openResizeFile(selected[0]);
  };

  const resizeExistingImage = async (url: string, index: number) => {
    setError(null);
    setPreparingImageIndex(index);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Não foi possível carregar a imagem salva');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('O arquivo salvo não é uma imagem válida');

      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const file = new File([blob], `produto-${index + 1}.${extension}`, { type: blob.type });
      setResizeFiles([file]);
      setResizedFiles([]);
      setResizeIndex(0);
      setReplacementImageIndex(index);
      openResizeFile(file);
    } catch (cause) {
      setError(cause instanceof Error ? `${cause.message}. Envie novamente pelo computador para ajustá-la.` : 'Não foi possível ajustar esta imagem');
    } finally {
      setPreparingImageIndex(null);
    }
  };

  const finishCurrentResize = (file: File) => {
    const completedFiles = [...resizedFiles, file];
    const nextIndex = resizeIndex + 1;

    if (nextIndex >= resizeFiles.length) {
      const replaceIndex = replacementImageIndex;
      closeResize();
      void uploadImages(completedFiles, replaceIndex);
      return;
    }

    clearCurrentResizeImage();
    setResizeFile(null);
    setResizedFiles(completedFiles);
    setResizeIndex(nextIndex);
    openResizeFile(resizeFiles[nextIndex]);
  };

  const applyResize = async () => {
    const canvas = resizeCanvasRef.current;
    if (!canvas || !resizeFile) return;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
    if (!blob) {
      setError('Não foi possível redimensionar esta imagem');
      return;
    }

    const baseName = resizeFile.name.replace(/\.[^.]+$/, '') || 'produto';
    finishCurrentResize(new File([blob], `${baseName}-1000x1000.webp`, { type: 'image/webp' }));
  };

  return (
    <CollapsibleSection
      title="Imagens do produto"
      description={`${state.images.length} imagens`}
      validationStatus={state.errors.images ? 'error' : state.images.length > 0 ? 'valid' : 'idle'}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setImageDragOver(true);
          }}
          onDragLeave={() => setImageDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setImageDragOver(false);
            selectImagesForResize(e.dataTransfer.files);
          }}
          disabled={uploadingImages || state.images.length >= 6}
          className={`mb-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${
            imageDragOver
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-300 bg-gray-50/60 hover:border-pink-400 hover:bg-pink-50/50 dark:border-gray-700 dark:bg-gray-800/40'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {uploadingImages ? (
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          ) : (
            <Upload className="h-8 w-8 text-pink-500" />
          )}
          <span className="mt-2 text-sm font-bold text-gray-800 dark:text-white">
            {uploadingImages ? 'Enviando imagens...' : 'Arraste imagens aqui ou clique para escolher e ajustar'}
          </span>
          <span className="mt-1 text-xs text-gray-500">JPG, PNG ou WebP · máximo de 6 imagens · ajuste para 1000 × 1000 px antes do envio</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => e.target.files && selectImagesForResize(e.target.files)}
          className="hidden"
        />

        {state.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {state.images.map((url, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Imagem ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-100 transition sm:bg-black/50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'MOVE_IMAGE', fromIndex: idx, toIndex: idx - 1 })}
                      className="rounded-full bg-white/90 p-1.5 text-xs font-bold text-gray-800 hover:bg-white"
                      title="Mover para esquerda"
                    >
                      ←
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void resizeExistingImage(url, idx)}
                    disabled={preparingImageIndex !== null || uploadingImages}
                    className="rounded-full bg-pink-500 p-1.5 text-white hover:bg-pink-600 disabled:opacity-60"
                    title="Redimensionar imagem"
                    aria-label={`Redimensionar imagem ${idx + 1}`}
                  >
                    {preparingImageIndex === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crop className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'REMOVE_IMAGE', index: idx })}
                    className="rounded-full bg-red-500 p-1.5 text-xs font-bold text-white hover:bg-red-600"
                    title={idx === 0 ? 'Remover capa' : 'Remover imagem'}
                    aria-label={idx === 0 ? 'Remover capa do produto' : `Remover imagem ${idx + 1}`}
                  >
                    ✕
                  </button>
                  {idx < state.images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'MOVE_IMAGE', fromIndex: idx, toIndex: idx + 1 })}
                      className="rounded-full bg-white/90 p-1.5 text-xs font-bold text-gray-800 hover:bg-white"
                      title="Mover para direita"
                    >
                      →
                    </button>
                  )}
                </div>
                {idx === 0 && (
                  <span className="absolute top-1 left-1 rounded bg-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Capa
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Ou cole uma URL de imagem..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            type="button"
            onClick={() => {
              const url = newImageUrl.trim();
              if (url && !state.images.includes(url)) {
                dispatch({ type: 'ADD_IMAGE', url });
                setNewImageUrl('');
              }
            }}
            disabled={!newImageUrl.trim() || state.images.length >= 6}
            className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            Adicionar
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          A primeira imagem será usada como capa. Se ela for removida, a próxima imagem vira a nova capa; se não restar nenhuma, o produto fica sem imagem. As imagens enviadas ficam no bucket products do Supabase.
        </p>
      </div>

      {resizeFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="product-image-resize-title">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-600">
                  Imagem {resizeIndex + 1} de {resizeFiles.length}
                </p>
                <h2 id="product-image-resize-title" className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Redimensionar imagem do produto</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">A imagem será salva em 1000 × 1000 px. Ajuste o enquadramento antes de enviar.</p>
              </div>
              <button type="button" onClick={closeResize} aria-label="Fechar redimensionamento" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-auto mt-5 aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl border-2 border-pink-200 bg-slate-100 shadow-inner dark:border-pink-900 dark:bg-slate-950">
              <canvas ref={resizeCanvasRef} className="h-full w-full" aria-label="Prévia da imagem redimensionada" />
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
                <button type="button" onClick={() => finishCurrentResize(resizeFile)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Enviar original</button>
                <button type="button" onClick={() => void applyResize()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
                  <Crop className="h-4 w-4" /> Redimensionar e enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
