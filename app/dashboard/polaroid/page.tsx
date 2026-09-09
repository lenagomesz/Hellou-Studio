'use client';

import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  ImagePlus,
  Images,
  Info,
  Printer,
  RotateCcw,
  RotateCw,
  Scissors,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
} from 'lucide-react';
import { getPolaroidPrintSummary, paginatePolaroids } from '@/lib/polaroid-layout';
import styles from './polaroid.module.css';

type FitMode = 'cover' | 'contain';

type PolaroidPhoto = {
  id: string;
  fileName: string;
  url: string;
  fit: FitMode;
  zoom: number;
  positionX: number;
  positionY: number;
  rotation: number;
  width: number;
  height: number;
  approved: boolean;
};

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PolaroidPage() {
  const [photos, setPhotos] = useState<PolaroidPhoto[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => () => {
    const uniqueUrls = new Set(photosRef.current.map((photo) => photo.url));
    uniqueUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const pages = useMemo(() => paginatePolaroids(photos), [photos]);
  const summary = useMemo(() => getPolaroidPrintSummary(photos.length), [photos.length]);
  const selectedPhoto = photos.find((photo) => photo.id === selectedId) ?? null;
  const approvedCount = photos.filter((photo) => photo.approved).length;

  function addFiles(fileList: FileList | File[]) {
    const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const additions = imageFiles.map((file) => {
      const id = createId();
      const url = URL.createObjectURL(file);
      const image = new window.Image();
      image.onload = () => {
        setPhotos((current) => current.map((photo) => (
          photo.id === id ? { ...photo, width: image.naturalWidth, height: image.naturalHeight } : photo
        )));
      };
      image.src = url;
      return {
        id,
        fileName: file.name,
        url,
        fit: 'cover' as const,
        zoom: 100,
        positionX: 50,
        positionY: 50,
        rotation: 0,
        width: 0,
        height: 0,
        approved: false,
      };
    });

    setPhotos((current) => [
      ...current,
      ...additions,
    ]);
    setSelectedId((current) => current ?? additions[0].id);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo && current.filter((item) => item.url === photo.url).length === 1) {
        URL.revokeObjectURL(photo.url);
      }
      return current.filter((item) => item.id !== id);
    });
    if (selectedId === id) {
      setSelectedId(photos.find((photo) => photo.id !== id)?.id ?? null);
    }
  }

  function duplicatePhoto(photo: PolaroidPhoto) {
    const duplicate = { ...photo, id: createId(), approved: false };
    setPhotos((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);
  }

  function clearAll() {
    const uniqueUrls = new Set(photos.map((photo) => photo.url));
    uniqueUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setSelectedId(null);
  }

  function updatePhoto(id: string, changes: Partial<PolaroidPhoto>) {
    setPhotos((current) => current.map((photo) => (
      photo.id === id ? { ...photo, ...changes, approved: 'approved' in changes ? Boolean(changes.approved) : false } : photo
    )));
  }

  function resetPhoto(id: string) {
    updatePhoto(id, { fit: 'cover', zoom: 100, positionX: 50, positionY: 50, rotation: 0 });
  }

  function movePhoto(id: string, direction: -1 | 1) {
    setPhotos((current) => {
      const from = current.findIndex((photo) => photo.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const reordered = [...current];
      [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
      return reordered;
    });
  }

  function getImageStyle(photo: PolaroidPhoto) {
    return {
      objectPosition: `${photo.positionX}% ${photo.positionY}%`,
      transform: `scale(${photo.zoom / 100}) rotate(${photo.rotation}deg)`,
    };
  }

  function getQuality(photo: PolaroidPhoto) {
    if (!photo.width || !photo.height) return { label: 'Analisando', className: 'bg-slate-100 text-slate-600' };
    const shortest = Math.min(photo.width, photo.height);
    if (shortest >= 900) return { label: 'Ótima qualidade', className: 'bg-emerald-100 text-emerald-700' };
    if (shortest >= 600) return { label: 'Boa qualidade', className: 'bg-blue-100 text-blue-700' };
    return { label: 'Resolução baixa', className: 'bg-amber-100 text-amber-800' };
  }

  function printPages() {
    const pending = photos.length - approvedCount;
    if (pending > 0 && !window.confirm(`${pending} ${pending === 1 ? 'foto ainda não foi aprovada' : 'fotos ainda não foram aprovadas'}. Deseja imprimir mesmo assim?`)) {
      return;
    }
    window.print();
  }

  return (
    <div className={`${styles.workspace} space-y-6`}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-pink-700">
            <Scissors className="h-3.5 w-3.5" /> Pronto para recortar
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Images className="h-6 w-6 text-pink-600" /> Montador de Polaroid
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Adicione as fotos e o painel organiza tudo em folhas A4, no tamanho padrão de 62 × 86 mm.
          </p>
        </div>
        <button
          type="button"
          onClick={printPages}
          disabled={!photos.length}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer className="h-4 w-4" /> Imprimir {summary.pages > 0 ? `${summary.pages} ${summary.pages === 1 ? 'página' : 'páginas'}` : ''}
        </button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${dragActive ? 'border-pink-500 bg-pink-50' : 'border-slate-300 bg-white hover:border-pink-400'}`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
            <UploadCloud className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">Arraste suas fotos aqui</p>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP ou outras imagens do seu aparelho</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-pink-300 hover:text-pink-600">
            Escolher imagens
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleInput} className="sr-only" />
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Resumo da impressão</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black text-slate-950">{summary.count}</p><p className="text-xs text-slate-500">polaroids</p></div>
            <div className="rounded-xl bg-pink-50 p-3"><p className="text-2xl font-black text-pink-700">{summary.pages}</p><p className="text-xs text-pink-600">folhas A4</p></div>
          </div>
          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Até 9 por página</p>
            <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Marcas de corte incluídas</p>
            <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Qualidade original do arquivo</p>
            {photos.length > 0 && <p className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-pink-500" /> {approvedCount} de {photos.length} aprovadas</p>}
          </div>
          {photos.length > 0 && summary.remainingSlots > 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Ainda {summary.remainingSlots === 1 ? 'cabe 1 foto' : `cabem ${summary.remainingSlots} fotos`} na última folha.
            </p>
          )}
        </aside>
      </section>

      {photos.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-bold text-slate-900">Fotos adicionadas</h2><p className="mt-0.5 text-xs text-slate-500">Duplique uma foto para imprimir mais cópias.</p></div>
            <div className="flex items-center gap-1">
              {approvedCount < photos.length && <button type="button" onClick={() => setPhotos((current) => current.map((photo) => ({ ...photo, approved: true })))} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"><BadgeCheck className="h-3.5 w-3.5" /> Aprovar todas</button>}
              <button type="button" onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Limpar</button>
            </div>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {photos.map((photo, index) => (
              <article key={photo.id} className={`w-36 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${selectedId === photo.id ? 'border-pink-500 shadow-md shadow-pink-100' : 'border-slate-200'}`}>
                <div className="relative h-28 bg-slate-100">
                  <button type="button" onClick={() => setSelectedId(photo.id)} className="block h-full w-full overflow-hidden" aria-label={`Ajustar ${photo.fileName}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={`Foto ${index + 1}: ${photo.fileName}`} style={getImageStyle(photo)} className={`h-full w-full ${photo.fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
                  </button>
                  <span className="absolute left-2 top-2 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-bold text-white">{index + 1}</span>
                  {photo.approved && <span className="absolute bottom-2 left-2 rounded-full bg-emerald-500 p-1 text-white shadow" title="Aprovada"><Check className="h-3 w-3" /></span>}
                  <button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Remover ${photo.fileName}`} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-600 shadow transition hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                  <button type="button" onClick={() => setSelectedId(photo.id)} className="px-2 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Ajustar</button>
                  <button type="button" onClick={() => duplicatePhoto(photo)} className="flex items-center justify-center gap-1 px-2 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><Copy className="h-3 w-3" /> Copiar</button>
                </div>
              </article>
            ))}
            <button type="button" onClick={() => inputRef.current?.click()} className="flex h-[153px] w-32 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-500 transition hover:border-pink-300 hover:text-pink-600"><ImagePlus className="mb-2 h-5 w-5" /> Adicionar</button>
          </div>
        </section>
      )}

      {selectedPhoto && (() => {
        const quality = getQuality(selectedPhoto);
        const selectedIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
        return (
          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[280px_minmax(0,1fr)] lg:p-5">
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pink-600">Foto {selectedIndex + 1}</p><h2 className="max-w-48 truncate text-sm font-bold text-slate-900" title={selectedPhoto.fileName}>{selectedPhoto.fileName}</h2></div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${quality.className}`}>{quality.label}</span>
              </div>
              <div className="mx-auto box-border h-[344px] w-[248px] bg-white p-4 pb-[80px] shadow-xl ring-1 ring-slate-200">
                <div className="h-full w-full overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedPhoto.url} alt="Prévia ampliada para aprovação" style={getImageStyle(selectedPhoto)} className={`h-full w-full ${selectedPhoto.fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500">{selectedPhoto.width ? `${selectedPhoto.width} × ${selectedPhoto.height} px` : 'Lendo resolução…'} · impressão sem recompressão</p>
            </div>

            <div className="min-w-0 space-y-5">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="text-base font-bold text-slate-900">Ajustar e aprovar</h3><p className="mt-0.5 text-xs text-slate-500">O resultado ao lado será igual na folha A4.</p></div>
                <button type="button" onClick={() => updatePhoto(selectedPhoto.id, { approved: !selectedPhoto.approved })} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${selectedPhoto.approved ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-pink-600 text-white hover:bg-pink-700'}`}><BadgeCheck className="h-4 w-4" /> {selectedPhoto.approved ? 'Aprovada' : 'Aprovar esta foto'}</button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Encaixe da imagem</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updatePhoto(selectedPhoto.id, { fit: 'cover' })} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${selectedPhoto.fit === 'cover' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600'}`}>Preencher moldura</button>
                  <button type="button" onClick={() => updatePhoto(selectedPhoto.id, { fit: 'contain' })} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${selectedPhoto.fit === 'contain' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600'}`}>Mostrar foto inteira</button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-bold text-slate-700"><span className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5"><ZoomIn className="h-3.5 w-3.5" /> Zoom</span><span className="font-medium text-pink-600">{selectedPhoto.zoom}%</span></span><input type="range" min="100" max="250" step="1" value={selectedPhoto.zoom} onChange={(event) => updatePhoto(selectedPhoto.id, { zoom: Number(event.target.value) })} className="h-2 w-full accent-pink-600" /></label>
                <label className="text-xs font-bold text-slate-700"><span className="mb-2 flex justify-between"><span>Posição horizontal</span><span className="font-medium text-pink-600">{selectedPhoto.positionX}%</span></span><input type="range" min="0" max="100" value={selectedPhoto.positionX} onChange={(event) => updatePhoto(selectedPhoto.id, { positionX: Number(event.target.value) })} className="h-2 w-full accent-pink-600" /></label>
                <label className="text-xs font-bold text-slate-700"><span className="mb-2 flex justify-between"><span>Posição vertical</span><span className="font-medium text-pink-600">{selectedPhoto.positionY}%</span></span><input type="range" min="0" max="100" value={selectedPhoto.positionY} onChange={(event) => updatePhoto(selectedPhoto.id, { positionY: Number(event.target.value) })} className="h-2 w-full accent-pink-600" /></label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => updatePhoto(selectedPhoto.id, { rotation: (selectedPhoto.rotation + 270) % 360 })} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" /> Girar esquerda</button>
                <button type="button" onClick={() => updatePhoto(selectedPhoto.id, { rotation: (selectedPhoto.rotation + 90) % 360 })} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCw className="h-3.5 w-3.5" /> Girar direita</button>
                <button type="button" onClick={() => resetPhoto(selectedPhoto.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Restaurar ajuste</button>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <button type="button" disabled={selectedIndex === 0} onClick={() => movePhoto(selectedPhoto.id, -1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" /> Mover antes</button>
                <button type="button" disabled={selectedIndex === photos.length - 1} onClick={() => movePhoto(selectedPhoto.id, 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-30">Mover depois <ArrowRight className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => duplicatePhoto(selectedPhoto)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><Copy className="h-3.5 w-3.5" /> Duplicar</button>
              </div>
            </div>
          </section>
        );
      })()}

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Na janela de impressão escolha <strong>papel A4</strong>, <strong>escala 100%</strong> e desative cabeçalhos e rodapés. Use “Preencher” para o visual clássico ou “Foto inteira” para não cortar nenhuma parte da imagem.</p>
      </div>

      {pages.length > 0 ? (
        <section className={styles.printSection} aria-label="Prévia das folhas A4">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-bold text-slate-900">Prévia de impressão</h2><p className="text-xs text-slate-500">O papel abaixo representa o tamanho e a divisão finais.</p></div></div>
          <div className={styles.previewScroller}>
            <div className={styles.printArea}>
              {pages.map((page, pageIndex) => (
                <div key={pageIndex} className={styles.a4Page} aria-label={`Folha ${pageIndex + 1} de ${pages.length}`}>
                  {page.map((photo, photoIndex) => (
                    <div key={photo.id} className={styles.polaroid}>
                      <span className={`${styles.cropMark} ${styles.topLeft}`} />
                      <span className={`${styles.cropMark} ${styles.topRight}`} />
                      <span className={`${styles.cropMark} ${styles.bottomLeft}`} />
                      <span className={`${styles.cropMark} ${styles.bottomRight}`} />
                      <div className={styles.photoWindow}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={`Polaroid ${pageIndex * 9 + photoIndex + 1}`} style={getImageStyle(photo)} className={photo.fit === 'cover' ? styles.cover : styles.contain} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <ImagePlus className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-600">Sua folha A4 aparecerá aqui</p>
          <p className="mt-1 text-xs text-slate-400">Adicione uma ou mais fotos para começar.</p>
        </section>
      )}
    </div>
  );
}
