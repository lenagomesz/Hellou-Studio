'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeProductColor } from '@/lib/product-colors';

type Material = { pbrMetallicRoughness: { baseColorFactor: readonly number[]; setBaseColorFactor: (color: number[] | string) => void } };
type Viewer = HTMLElement & { model?: { materials: Material[] }; resetTurntableRotation: (value: number) => void; jumpCameraToGoal: () => void };

export function Product3DViewer({ modelUrl, color, productName }: Readonly<{
  modelUrl: string;
  color?: string | null;
  productName: string;
  poster?: string | null;
}>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const originalColors = useRef<number[][]>([]);
  const colorRef = useRef(color);
  const [opened, setOpened] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [rotating, setRotating] = useState(false);

  function applyColor(viewer: Viewer, value?: string | null) {
    const normalized = normalizeProductColor(value);
    for (const [index, material] of (viewer.model?.materials ?? []).entries()) {
      // CSS colors are converted from sRGB by model-viewer, unlike raw numeric factors.
      material.pbrMetallicRoughness.setBaseColorFactor(normalized || originalColors.current[index] || [1, 1, 1, 1]);
    }
  }

  useEffect(() => {
    colorRef.current = color;
    if (viewerRef.current?.model) applyColor(viewerRef.current, color);
  }, [color]);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    let viewer: Viewer | null = null;
    // Bundle locally: no third-party script or weaker Content Security Policy required.
    void import('@google/model-viewer').then(() => {
      if (cancelled || !hostRef.current) return;
      setStatus('loading');
      viewer = document.createElement('model-viewer') as Viewer;
      viewer.setAttribute('src', modelUrl);
      viewer.setAttribute('alt', `Modelo 3D de ${productName}`);
      viewer.setAttribute('camera-controls', '');
      viewer.setAttribute('touch-action', 'pan-y');
      viewer.setAttribute('shadow-intensity', '1');
      viewer.setAttribute('camera-orbit', '0deg 75deg auto');
      viewer.setAttribute('interaction-prompt', 'auto');
      viewer.style.width = '100%';
      viewer.style.height = '100%';
      viewer.addEventListener('load', () => {
        if (cancelled || !viewer) return;
        originalColors.current = (viewer.model?.materials ?? []).map((m) => [...m.pbrMetallicRoughness.baseColorFactor]);
        applyColor(viewer, colorRef.current);
        setStatus('ready');
      });
      viewer.addEventListener('error', () => { if (!cancelled) setStatus('error'); });
      hostRef.current.replaceChildren(viewer);
      viewerRef.current = viewer;
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; viewer?.remove(); viewerRef.current = null; };
  }, [opened, modelUrl, productName, attempt]);

  useEffect(() => { viewerRef.current?.toggleAttribute('auto-rotate', rotating); }, [rotating, status, modelUrl]);

  return (
    <section className="overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-sm dark:border-pink-900 dark:bg-gray-950" aria-label="Visualização 3D do produto">
      <div className="border-b border-pink-100 px-4 py-3 dark:border-pink-900">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Veja sua peça em 3D</h2>
        <p className="mt-1 text-xs text-gray-500">Arraste para girar · use a pinça ou a roda do mouse para aproximar</p>
      </div>
      {!opened ? (
        <div className="p-5 text-center">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">Explore os detalhes e experimente a cor escolhida.</p>
          <button type="button" onClick={() => { setStatus('loading'); setOpened(true); }} className="rounded-full bg-pink-600 px-5 py-2.5 text-sm font-bold text-white">Abrir visualização 3D</button>
        </div>
      ) : (
        <>
          <div className="relative aspect-square bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-900 dark:to-gray-800" aria-busy={status === 'loading'}>
            <div ref={hostRef} className="absolute inset-0" />
            {status === 'loading' && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-gray-600">Carregando modelo 3D…</p>}
            {status === 'error' && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-pink-50 p-5 text-center text-sm text-gray-700"><p>Não foi possível abrir o modelo 3D.</p><button type="button" onClick={() => { setStatus('loading'); setAttempt((n) => n + 1); }} className="rounded-full bg-pink-600 px-4 py-2 font-bold text-white">Tentar novamente</button></div>}
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            <button type="button" disabled={status !== 'ready'} aria-pressed={rotating} onClick={() => setRotating(!rotating)} className="rounded-full border border-pink-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">{rotating ? 'Pausar giro' : 'Girar automaticamente'}</button>
            <button type="button" disabled={status !== 'ready'} onClick={() => { const viewer = viewerRef.current; if (viewer) { viewer.setAttribute('camera-orbit', '0deg 75deg auto'); viewer.setAttribute('camera-target', 'auto auto auto'); viewer.resetTurntableRotation(0); viewer.jumpCameraToGoal(); } }} className="rounded-full border border-pink-200 px-3 py-2 text-xs font-semibold disabled:opacity-50">Restaurar visão</button>
          </div>
          <p className="px-4 pb-3 text-[11px] text-gray-500">A cor da prévia é aproximada e pode variar conforme a tela e o filamento.</p>
        </>
      )}
    </section>
  );
}
