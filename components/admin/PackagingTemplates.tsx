'use client';

import { useMemo, useState } from 'react';
import { Box, Check, PackageOpen, Printer, Scissors } from 'lucide-react';
import {
  getPackagingNetSize,
  getPackagingPlacements,
  getPackagingSheetSize,
  PACKAGING_TEMPLATES,
  type PackagingTemplate,
  type PackagingTemplateId,
} from '@/lib/packaging-templates';
import styles from '@/app/dashboard/packaging/packaging.module.css';

const BRAND_PINK = '#FF378C';
const CREAM = '#FFFAF7';

function points(values: Array<[number, number]>) {
  return values.map(([x, y]) => `${x},${y}`).join(' ');
}

function BoxNet({ template, x, y }: { template: PackagingTemplate; x: number; y: number }) {
  const { width: face, depth, height, glueTab, topDepth, bottomDepth } = template;
  const bodyY = topDepth;
  const bottomY = bodyY + height;
  const xs = [0, depth, depth + face, depth * 2 + face, depth * 2 + face * 2];
  const totalBodyWidth = xs[4];
  const frontX = xs[1];
  const backX = xs[3];
  const dustInset = Math.min(4, depth * 0.12);
  const topFlaps = [
    [[0, bodyY], [depth, bodyY], [depth - dustInset, 0], [dustInset, 0]],
    [[frontX, bodyY], [frontX + face, bodyY], [frontX + face - 4, 0], [frontX + 4, 0]],
    [[xs[2], bodyY], [xs[3], bodyY], [xs[3] - dustInset, 0], [xs[2] + dustInset, 0]],
    [[backX, bodyY], [backX + face, bodyY], [backX + face - 4, 0], [backX + 4, 0]],
  ] as Array<Array<[number, number]>>;

  const bottomFlaps = [
    [[0, bottomY], [depth, bottomY], [depth - dustInset, bottomY + bottomDepth * 0.72], [dustInset, bottomY + bottomDepth]],
    [[frontX, bottomY], [frontX + face, bottomY], [frontX + face - 4, bottomY + bottomDepth], [frontX + 4, bottomY + bottomDepth]],
    [[xs[2], bottomY], [xs[3], bottomY], [xs[3] - dustInset, bottomY + bottomDepth], [xs[2] + dustInset, bottomY + bottomDepth * 0.72]],
    [[backX, bottomY], [backX + face, bottomY], [backX + face - 4, bottomY + bottomDepth], [backX + 4, bottomY + bottomDepth]],
  ] as Array<Array<[number, number]>>;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y={bodyY} width={totalBodyWidth} height={height} fill={CREAM} />
      <image href="/images/packaging/panel-side-left-clean.png" x="0" y={bodyY} width={depth} height={height} preserveAspectRatio="none" />
      <image href="/images/packaging/panel-front-clean.png" x={frontX} y={bodyY} width={face} height={height} preserveAspectRatio="none" />
      <image href="/images/packaging/panel-side-right-clean.png" x={xs[2]} y={bodyY} width={depth} height={height} preserveAspectRatio="none" />
      <image href="/images/packaging/panel-back-clean.png" x={backX} y={bodyY} width={face} height={height} preserveAspectRatio="none" />
      <rect x={totalBodyWidth} y={bodyY + 4} width={glueTab} height={height - 8} fill={CREAM} />

      {topFlaps.map((shape, index) => <polygon key={`top-${index}`} points={points(shape)} fill={BRAND_PINK} />)}
      {bottomFlaps.map((shape, index) => <polygon key={`bottom-${index}`} points={points(shape)} fill={BRAND_PINK} />)}

      <image
        href="/images/packaging/hellou-logo-transparent.png"
        x={frontX + face * 0.18}
        y={bodyY + height * 0.37}
        width={face * 0.64}
        height={height * 0.26}
        preserveAspectRatio="xMidYMid meet"
      />

    </g>
  );
}

function PrintSheet({ template }: { template: PackagingTemplate }) {
  const sheet = getPackagingSheetSize(template);
  const placements = getPackagingPlacements(template);

  return (
    <svg
      className={styles.sheet}
      viewBox={`0 0 ${sheet.width} ${sheet.height}`}
      width={`${sheet.width}mm`}
      height={`${sheet.height}mm`}
      role="img"
      aria-label={`Molde ${template.name} em folha A4`}
    >
      <rect width={sheet.width} height={sheet.height} fill="white" />
      {placements.map((placement, index) => (
        <BoxNet key={index} template={template} x={placement.x} y={placement.y} />
      ))}
    </svg>
  );
}

function AssemblyDrawing({ step }: { step: 1 | 2 | 3 | 4 }) {
  const shared = { fill: '#FFF7F2', stroke: '#334155', strokeWidth: 2 };

  return (
    <svg viewBox="0 0 180 120" className="h-auto w-full" aria-hidden="true">
      <defs>
        <marker id={`arrow-${step}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#F97316" />
        </marker>
      </defs>
      {step === 1 && (
        <>
          <path d="M27 33h22V14h37v19h22V14h37v19h12v54h-12v20h-37V87H86v20H49V87H27z" {...shared} fill="#FFF1F5" />
          <path d="M27 33h22V14h37v19h22V14h37v19h12v54h-12v20h-37V87H86v20H49V87H27z" fill="none" stroke="#DB2777" strokeWidth="3" />
          <path d="M13 79c8-8 13-16 18-25" fill="none" stroke="#DB2777" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="13" cy="83" r="5" fill="none" stroke="#DB2777" strokeWidth="2" />
          <circle cx="21" cy="88" r="5" fill="none" stroke="#DB2777" strokeWidth="2" />
        </>
      )}
      {step === 2 && (
        <>
          <rect x="34" y="25" width="112" height="70" rx="2" {...shared} />
          {[62, 90, 118].map((x) => <path key={x} d={`M${x} 25v70`} stroke="#94A3B8" strokeWidth="1.5" />)}
          <path d="M34 43h112M34 77h112" stroke="#94A3B8" strokeWidth="1.5" />
          <path d="M49 15v15M76 105V90M104 15v15M132 105V90" stroke="#F97316" strokeWidth="2.5" markerEnd={`url(#arrow-${step})`} />
        </>
      )}
      {step === 3 && (
        <>
          <path d="M46 43l44-20 44 20v44l-44 21-44-21z" {...shared} />
          <path d="M46 43l44 21 44-21M90 64v44" fill="none" stroke="#334155" strokeWidth="2" />
          <path d="M57 78l33 16 33-16" fill="none" stroke="#FF4090" strokeWidth="7" strokeLinecap="round" />
          <path d="M90 115v-19" fill="none" stroke="#F97316" strokeWidth="3" markerEnd={`url(#arrow-${step})`} />
          <path d="M78 91h24" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {step === 4 && (
        <>
          <path d="M47 48l43 19 43-19v43l-43 19-43-19z" {...shared} />
          <path d="M47 48l43-20 43 20-43 19z" fill="#FF4090" stroke="#334155" strokeWidth="2" />
          <path d="M90 27v34M54 26l29 31M126 26L97 57" fill="none" stroke="#F97316" strokeWidth="3" markerEnd={`url(#arrow-${step})`} />
          <path d="M90 67v43" stroke="#334155" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function AssemblyGuide({ template }: { template: PackagingTemplate }) {
  const steps = [
    ['Recorte a forma', 'Siga somente a borda externa do papel.'],
    ['Marque as dobras', 'Use as mudanças entre os painéis como referência para vincar e dobrar para dentro.'],
    ['Cole o fundo', 'Feche as abas laterais, sobreponha as abas maiores e fixe bem com cola ou fita.'],
    ['Feche a tampa', 'Dobre as abas laterais primeiro e finalize com as duas abas maiores.'],
  ] as const;

  return (
    <section className={styles.assemblyGuide} aria-labelledby="assembly-title">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pink-600">Guia somente na tela</p>
        <h2 id="assembly-title" className="mt-1 text-xl font-black text-slate-950">Como montar a {template.name}</h2>
        <p className="mt-1 text-sm text-slate-500">As ilustrações abaixo servem de orientação e não são incluídas ao imprimir.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map(([title, description], index) => (
          <article key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 p-4"><AssemblyDrawing step={(index + 1) as 1 | 2 | 3 | 4} /></div>
            <div className="p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-xs font-black text-white">{index + 1}</span>
              <h3 className="mt-3 font-black text-slate-950">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PackagingTemplates() {
  const [selectedId, setSelectedId] = useState<PackagingTemplateId>('keychain');
  const selected = useMemo(
    () => PACKAGING_TEMPLATES.find((template) => template.id === selectedId) ?? PACKAGING_TEMPLATES[0],
    [selectedId],
  );
  const net = getPackagingNetSize(selected);

  return (
    <div className={`${styles.workspace} space-y-6`}>
      <style>{`@page { size: A4 ${selected.orientation}; margin: 0; }`}</style>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-pink-700">
            <PackageOpen className="h-3.5 w-3.5" /> Fundo para colagem
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Box className="h-6 w-6 text-pink-600" /> Embalagens A4
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Escolha o tamanho, confira a prévia e imprima o molde. O fundo tem abas lisas para fechar com fita ou cola.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-pink-600">
          <Printer className="h-4 w-4" /> Imprimir {selected.name}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {PACKAGING_TEMPLATES.map((template) => {
          const active = template.id === selected.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${active ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-100' : 'border-slate-200 bg-white hover:border-pink-300'}`}
            >
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${active ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {template.copies} {template.copies === 1 ? 'caixa por A4' : 'caixas por A4'}
              </span>
              <h2 className="mt-3 text-lg font-black text-slate-950">{template.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{template.useCase}</p>
              <p className="mt-4 font-mono text-sm font-bold text-pink-700">{template.width} × {template.depth} × {template.height} mm</p>
            </button>
          );
        })}
      </section>

      <section className={`${styles.printSection} grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_260px] lg:p-5`}>
        <div className={styles.previewScroller}>
          <div className={styles.printStage}>
            <PrintSheet template={selected} />
          </div>
        </div>
        <aside className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Modelo selecionado</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{selected.name}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Molde aberto: {net.width} × {net.height} mm · A4 {selected.orientation === 'portrait' ? 'retrato' : 'paisagem'}.</p>
          </div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> Fundo liso para fita ou cola</p>
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-pink-500" /> Arte limpa em alta qualidade</p>
            <p className="flex gap-2"><Scissors className="h-4 w-4 shrink-0 text-pink-500" /> Sem contorno de recorte impresso</p>
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-pink-500" /> Sem pontilhados laranja impressos</p>
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-pink-500" /> Sem abertura ou fenda no fundo</p>
            <p className="flex gap-2"><Printer className="h-4 w-4 shrink-0 text-blue-500" /> Escala real em milímetros</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            Na impressão selecione <strong>A4</strong>, <strong>escala 100%</strong>, ative gráficos de fundo e desative cabeçalhos, rodapés e “Ajustar à página”.
          </div>
        </aside>
      </section>

      <AssemblyGuide template={selected} />
    </div>
  );
}
