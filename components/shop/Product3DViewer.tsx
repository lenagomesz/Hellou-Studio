'use client';

import { useEffect, useRef, useState } from 'react';

type Product3DViewerProps = {
  modelUrl: string;
  color?: string | null;
  productName: string;
  poster?: string | null;
};

type ModelMaterial = {
  pbrMetallicRoughness?: {
    setBaseColorFactor?: (color: [number, number, number, number]) => void;
  };
};

type ModelViewerElement = HTMLElement & {
  model?: { materials?: ModelMaterial[] };
};

const MODEL_VIEWER_SCRIPT = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';

function hexToRgba(hex: string) {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    1,
  ] as [number, number, number, number];
}

function applyColor(viewer: ModelViewerElement | null, color?: string | null) {
  const rgba = color ? hexToRgba(color) : null;
  if (!viewer || !rgba) return;
  for (const material of viewer.model?.materials ?? []) {
    material.pbrMetallicRoughness?.setBaseColorFactor?.(rgba);
  }
}

/** Browser-only GLB viewer. It does not add 3D code to catalog pages. */
export function Product3DViewer({ modelUrl, color, productName, poster }: Readonly<Product3DViewerProps>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-product-model-viewer]');
    if (existing?.dataset.ready === 'true') {
      setReady(true);
      return;
    }
    const script = existing ?? document.createElement('script');
    const markReady = () => {
      script.dataset.ready = 'true';
      setReady(true);
    };
    script.addEventListener('load', markReady, { once: true });
    if (!existing) {
      script.type = 'module';
      script.src = MODEL_VIEWER_SCRIPT;
      script.dataset.productModelViewer = 'true';
      document.head.appendChild(script);
    }
    return () => script.removeEventListener('load', markReady);
  }, []);

  useEffect(() => {
    if (!ready || !hostRef.current) return;
    const viewer = document.createElement('model-viewer') as ModelViewerElement;
    viewer.setAttribute('src', modelUrl);
    viewer.setAttribute('alt', `Modelo 3D de ${productName}`);
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('touch-action', 'pan-y');
    viewer.setAttribute('shadow-intensity', '1');
    viewer.setAttribute('interaction-prompt', 'auto');
    viewer.setAttribute('ar', '');
    viewer.className = 'h-full w-full bg-gradient-to-br from-violet-50 to-pink-50 dark:from-slate-900 dark:to-slate-800';
    if (poster) viewer.setAttribute('poster', poster);
    viewer.addEventListener('load', () => applyColor(viewer, color));
    hostRef.current.replaceChildren(viewer);
    viewerRef.current = viewer;
    return () => {
      viewerRef.current = null;
      viewer.remove();
    };
  }, [color, modelUrl, poster, productName, ready]);

  useEffect(() => applyColor(viewerRef.current, color), [color]);

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm dark:border-violet-900 dark:bg-slate-950" aria-label="Visualização 3D do produto">
      <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3 dark:border-violet-900/70">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Veja em 3D</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Arraste para girar · a cor acompanha sua escolha</p>
        </div>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">3D</span>
      </div>
      <div ref={hostRef} className="aspect-square" aria-busy={!ready}>
        {!ready && <div className="grid h-full place-items-center text-sm text-slate-500">Carregando visualização 3D…</div>}
      </div>
    </section>
  );
}
