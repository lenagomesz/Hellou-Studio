'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useProductEditor } from '../hooks/useProductEditor';
import { CollapsibleSection } from '../shared/CollapsibleSection';

export function ImagesSection() {
  const { state, dispatch } = useProductEditor();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const uploadImages = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    if (state.images.length + selected.length > 6) {
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
      dispatch({ type: 'SET_IMAGES', images: [...state.images, ...data.urls] });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Erro ao enviar imagens');
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
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
            uploadImages(e.dataTransfer.files);
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
            {uploadingImages ? 'Enviando imagens...' : 'Arraste imagens aqui ou clique para escolher'}
          </span>
          <span className="mt-1 text-xs text-gray-500">JPG, PNG ou WebP · máximo de 6 imagens · 8 MB cada · armazenamento automático</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => e.target.files && uploadImages(e.target.files)}
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
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
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
                    onClick={() => dispatch({ type: 'REMOVE_IMAGE', index: idx })}
                    className="rounded-full bg-red-500 p-1.5 text-xs font-bold text-white hover:bg-red-600"
                    title="Remover"
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
            type="url"
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
          A primeira imagem será usada como capa. As imagens enviadas ficam no bucket products do Supabase.
        </p>
      </div>
    </CollapsibleSection>
  );
}
