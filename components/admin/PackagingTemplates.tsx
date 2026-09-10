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

const FOLD = '#F97316';
const BRAND_PINK = '#FF4090';
const CREAM = '#FFFAF7';

function points(values: Array<[number, number]>) {
  return values.map(([x, y]) => `${x},${y}`).join(' ');
}

function BoxNet({ template, x, y, instance }: { template: PackagingTemplate; x: number; y: number; instance: number }) {
  const { width: face, depth, height, glueTab, topDepth, bottomDepth } = template;
  const bodyY = topDepth;
  const bottomY = bodyY + height;
  const xs = [0, depth, depth + face, depth * 2 + face, depth * 2 + face * 2];
  const totalBodyWidth = xs[4];
  const frontX = xs[1];
  const backX = xs[3];
  const dustInset = Math.min(4, depth * 0.12);
  const tongueWidth = face * 0.34;
  const tongueStart = frontX + (face - tongueWidth) / 2;
  const slotWidth = face * 0.38;
  const slotStart = backX + (face - slotWidth) / 2;
  const id = `${template.id}-${instance}`;

  const topFlaps = [
    [[0, bodyY], [depth, bodyY], [depth - dustInset, 0], [dustInset, 0]],
    [[frontX, bodyY], [frontX + face, bodyY], [frontX + face - 4, 0], [frontX + 4, 0]],
    [[xs[2], bodyY], [xs[3], bodyY], [xs[3] - dustInset, 0], [xs[2] + dustInset, 0]],
    [[backX, bodyY], [backX + face, bodyY], [backX + face - 4, 0], [backX + 4, 0]],
  ] as Array<Array<[number, number]>>;

  const bottomFlaps = [
    [[0, bottomY], [depth, bottomY], [depth - dustInset, bottomY + bottomDepth * 0.72], [dustInset, bottomY + bottomDepth]],
    [
      [frontX, bottomY], [frontX + face, bottomY], [frontX + face - 4, bottomY + bottomDepth - 3],
      [tongueStart + tongueWidth, bottomY + bottomDepth - 3],
      [tongueStart + tongueWidth - 2.5, bottomY + bottomDepth],
      [tongueStart + 2.5, bottomY + bottomDepth],
      [tongueStart, bottomY + bottomDepth - 3], [frontX + 4, bottomY + bottomDepth - 3],
    ],
    [[xs[2], bottomY], [xs[3], bottomY], [xs[3] - dustInset, bottomY + bottomDepth], [xs[2] + dustInset, bottomY + bottomDepth * 0.72]],
    [[backX, bottomY], [backX + face, bottomY], [backX + face - 4, bottomY + bottomDepth - 3], [backX + 4, bottomY + bottomDepth - 3]],
  ] as Array<Array<[number, number]>>;

  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={`brand-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF2F91" />
          <stop offset="0.55" stopColor="#FF5F68" />
          <stop offset="1" stopColor="#FF982B" />
        </linearGradient>
        <linearGradient id={`wave-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FF4090" stopOpacity="0.74" />
          <stop offset="0.52" stopColor="#FB7185" stopOpacity="0.57" />
          <stop offset="1" stopColor="#F97316" stopOpacity="0.52" />
        </linearGradient>
        <clipPath id={`body-${id}`}>
          <rect width={totalBodyWidth} height={height} x="0" y={bodyY} />
        </clipPath>
      </defs>

      <rect x="0" y={bodyY} width={totalBodyWidth} height={height} fill={CREAM} />
      <rect x={totalBodyWidth} y={bodyY + 4} width={glueTab} height={height - 8} fill="#FFF1F5" />

      <g clipPath={`url(#body-${id})`}>
        <path d={`M -4 ${bodyY + 25} C ${totalBodyWidth * 0.18} ${bodyY + 4}, ${totalBodyWidth * 0.3} ${bodyY + 42}, ${totalBodyWidth * 0.48} ${bodyY + 21} S ${totalBodyWidth * 0.8} ${bodyY + 4}, ${totalBodyWidth + 5} ${bodyY + 28} L ${totalBodyWidth + 5} ${bodyY + 43} C ${totalBodyWidth * 0.78} ${bodyY + 22}, ${totalBodyWidth * 0.66} ${bodyY + 48}, ${totalBodyWidth * 0.46} ${bodyY + 34} S ${totalBodyWidth * 0.18} ${bodyY + 47}, -4 ${bodyY + 39} Z`} fill={`url(#wave-${id})`} />
        <path d={`M -4 ${bottomY - 22} C ${totalBodyWidth * 0.18} ${bottomY - 42}, ${totalBodyWidth * 0.35} ${bottomY - 7}, ${totalBodyWidth * 0.53} ${bottomY - 27} S ${totalBodyWidth * 0.82} ${bottomY - 39}, ${totalBodyWidth + 5} ${bottomY - 16} L ${totalBodyWidth + 5} ${bottomY + 4} L -4 ${bottomY + 4} Z`} fill={`url(#wave-${id})`} opacity="0.78" />
        <path d={`M -2 ${bodyY + 30} C ${totalBodyWidth * 0.2} ${bodyY + 9}, ${totalBodyWidth * 0.35} ${bodyY + 44}, ${totalBodyWidth * 0.52} ${bodyY + 24} S ${totalBodyWidth * 0.82} ${bodyY + 10}, ${totalBodyWidth + 2} ${bodyY + 33}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="0.8" />
        {[
          [depth * 0.38, bodyY + 16, 2.2],
          [xs[2] + depth * 0.64, bodyY + 18, 2.8],
          [backX + face * 0.78, bodyY + 46, 2.3],
          [depth * 0.74, bottomY - 18, 2.5],
          [xs[2] + depth * 0.38, bottomY - 14, 2.1],
        ].map(([cx, cy, r], index) => (
          <g key={index}>
            <circle cx={cx} cy={cy} r={r + 0.8} fill="#FB7185" opacity="0.18" />
            <circle cx={cx} cy={cy} r={r} fill={index % 2 ? '#F97316' : '#FB7185'} opacity="0.68" />
            <circle cx={cx - r * 0.28} cy={cy - r * 0.28} r={r * 0.24} fill="white" opacity="0.8" />
          </g>
        ))}
      </g>

      {topFlaps.map((shape, index) => <polygon key={`top-${index}`} points={points(shape)} fill={BRAND_PINK} />)}
      {bottomFlaps.map((shape, index) => <polygon key={`bottom-${index}`} points={points(shape)} fill={BRAND_PINK} />)}

      <svg x={frontX + face * 0.14} y={bodyY + height * 0.36} width={face * 0.72} height={height * 0.28} viewBox="499 723 1001 545" preserveAspectRatio="xMidYMid meet">
        <image href="/logo.png" width="2000" height="2000" />
      </svg>

      <g fill="#DB2777" textAnchor="middle" fontFamily="Sora, Arial, sans-serif" fontWeight="800">
        <text x={depth / 2} y={bodyY + height * 0.55} fontSize={Math.max(3.2, depth * 0.14)}>feito com</text>
        <text x={depth / 2} y={bodyY + height * 0.61} fontSize={Math.max(3.2, depth * 0.14)}>carinho</text>
        <text x={depth / 2} y={bodyY + height * 0.69} fontSize={depth * 0.23}>♥</text>
        <text x={backX + face / 2} y={bodyY + height * 0.58} fontSize={Math.max(4, face * 0.085)}>feito com carinho</text>
        <text x={backX + face / 2} y={bodyY + height * 0.66} fontSize={face * 0.12}>♥</text>
      </g>

      <g fill="#F97316">
        <path d={`M ${xs[2] + depth * 0.5} ${bodyY + height * 0.27 - 3} L ${xs[2] + depth * 0.5 + 1} ${bodyY + height * 0.27 - 1} L ${xs[2] + depth * 0.5 + 3} ${bodyY + height * 0.27} L ${xs[2] + depth * 0.5 + 1} ${bodyY + height * 0.27 + 1} L ${xs[2] + depth * 0.5} ${bodyY + height * 0.27 + 3} L ${xs[2] + depth * 0.5 - 1} ${bodyY + height * 0.27 + 1} L ${xs[2] + depth * 0.5 - 3} ${bodyY + height * 0.27} L ${xs[2] + depth * 0.5 - 1} ${bodyY + height * 0.27 - 1} Z`} />
      </g>

      <g fill="none" stroke={FOLD} strokeWidth="0.3" strokeDasharray="2 1.4">
        {xs.slice(1).map((panelX) => <path key={panelX} d={`M ${panelX} ${bodyY} V ${bottomY}`} />)}
        <path d={`M 0 ${bodyY} H ${totalBodyWidth}`} />
        <path d={`M 0 ${bottomY} H ${totalBodyWidth}`} />
      </g>

      <path d={`M ${slotStart} ${bottomY + bottomDepth * 0.62} h ${slotWidth}`} fill="none" stroke="#FFFFFF" strokeWidth="0.75" strokeLinecap="round" />
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
        <BoxNet key={index} template={template} x={placement.x} y={placement.y} instance={index} />
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
          {[62, 90, 118].map((x) => <path key={x} d={`M${x} 25v70`} stroke="#F97316" strokeWidth="2" strokeDasharray="5 4" />)}
          <path d="M34 43h112M34 77h112" stroke="#F97316" strokeWidth="2" strokeDasharray="5 4" />
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
    ['Recorte a forma', 'Siga somente a borda externa do papel. Não corte as linhas tracejadas.'],
    ['Marque as dobras', 'Vinque e dobre todas as divisões tracejadas para dentro.'],
    ['Trave o fundo', 'Feche as abas laterais, sobreponha as abas maiores e passe a lingueta pela fenda branca.'],
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
            <PackageOpen className="h-3.5 w-3.5" /> Fundo com encaixe
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <Box className="h-6 w-6 text-pink-600" /> Embalagens A4
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Escolha o tamanho, confira a prévia e imprima o molde. O fundo fecha por lingueta e fenda, sem fita ou cola.
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
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> Fundo com encaixe, sem fita</p>
            <p className="flex gap-2"><Scissors className="h-4 w-4 shrink-0 text-pink-500" /> Sem contorno de recorte impresso</p>
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-orange-500" /> Dobra tracejada em laranja</p>
            <p className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-pink-500" /> Fenda branca de encaixe preservada</p>
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
