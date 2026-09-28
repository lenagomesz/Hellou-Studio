'use client';

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { STLAnalysisPanel } from '@/components/shop/STLAnalysisPanel';

type ReferenceType = 'image' | 'stl' | 'link';

type RequestDraft = {
  referenceType: ReferenceType;
  title: string;
  description: string;
  quantity: string;
  color: string;
  size: string;
  deadline: string;
  referenceLink: string;
  licenseAcknowledged: boolean;
};

const REFERENCE_TYPES: Array<{ id: ReferenceType; icon: string; title: string; description: string }> = [
  { id: 'image', icon: '🖼️', title: 'Tenho uma imagem', description: 'Envie uma foto, desenho ou inspiração.' },
  { id: 'stl', icon: '🧩', title: 'Tenho um arquivo STL', description: 'Ideal se o modelo já está pronto para imprimir.' },
  { id: 'link', icon: '🔗', title: 'Vi algo online', description: 'Cole o link de qualquer site ou modelo.' },
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const REQUEST_DRAFT_KEY = 'hellou-request-print-draft';
const inputClass = 'mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none ring-pink-400 transition placeholder:text-gray-400 focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white';

function isImage(file: File) {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RequestPrintPage() {
  const router = useRouter();
  const { status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referenceType, setReferenceType] = useState<ReferenceType>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [deadline, setDeadline] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [referenceLink, setReferenceLink] = useState('');
  const [licenseAcknowledged, setLicenseAcknowledged] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);

  useEffect(() => {
    try {
      const storedDraft = window.sessionStorage.getItem(REQUEST_DRAFT_KEY);
      if (!storedDraft) return;
      const draft = JSON.parse(storedDraft) as Partial<RequestDraft>;
      if (!['image', 'stl', 'link'].includes(draft.referenceType ?? '')) return;
      setReferenceType(draft.referenceType as ReferenceType);
      setTitle(draft.title ?? '');
      setDescription(draft.description ?? '');
      setQuantity(draft.quantity ?? '1');
      setColor(draft.color ?? '');
      setSize(draft.size ?? '');
      setDeadline(draft.deadline ?? '');
      setReferenceLink(draft.referenceLink ?? '');
      setLicenseAcknowledged(Boolean(draft.licenseAcknowledged));
      setRestoredDraft(true);
      window.sessionStorage.removeItem(REQUEST_DRAFT_KEY);
    } catch {
      window.sessionStorage.removeItem(REQUEST_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!file || !isImage(file)) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function changeType(type: ReferenceType) {
    setReferenceType(type); setFile(null); setReferenceLink(''); setLicenseAcknowledged(false); setError(null);
  }

  function setSelectedFile(selected: File | undefined) {
    if (!selected) return;
    const wantsImage = referenceType === 'image';
    const correctKind = wantsImage ? isImage(selected) : selected.name.toLowerCase().endsWith('.stl');
    if (!correctKind) { setError(wantsImage ? 'Envie uma imagem JPG, PNG ou WEBP.' : 'Envie um arquivo .STL.'); return; }
    const maxBytes = wantsImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (selected.size > maxBytes) { setError(wantsImage ? 'A imagem deve ter no máximo 10 MB.' : 'O arquivo STL deve ter no máximo 100 MB.'); return; }
    setFile(selected); setError(null);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault(); setDragOver(false); setSelectedFile(event.dataTransfer.files[0]);
  }

  function saveDraftForLogin() {
    const draft: RequestDraft = { referenceType, title, description, quantity, color, size, deadline, referenceLink, licenseAcknowledged };
    window.sessionStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify(draft));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if ((referenceType === 'image' || referenceType === 'stl') && !file) { setError(referenceType === 'image' ? 'Escolha uma imagem de referência.' : 'Escolha o seu arquivo STL.'); return; }
    if (referenceType === 'link' && !referenceLink.trim()) { setError('Cole o link da referência que você encontrou.'); return; }
    if (referenceType === 'link' && !licenseAcknowledged) { setError('Confirme que entende a verificação de licença antes de enviar.'); return; }
    if (status !== 'authenticated') { saveDraftForLogin(); router.push('/login?callbackUrl=/request-print'); return; }

    setSubmitting(true);
    const formData = new FormData();
    formData.set('title', title.trim() || 'Encomenda personalizada');
    if (description.trim()) formData.set('description', description.trim());
    const preferences = [`Quantidade: ${Math.max(1, Number(quantity) || 1)}`, color.trim() && `Cor/acabamento: ${color.trim()}`, size.trim() && `Tamanho desejado: ${size.trim()}`, deadline && `Data desejada: ${deadline}`].filter(Boolean).join('\n');
    if (preferences) formData.set('notes', preferences);
    if (file) formData.set('file', file);
    if (referenceType === 'link') formData.set('reference_link', referenceLink.trim());
    try {
      const response = await fetch('/api/print-requests', { method: 'POST', body: formData });
      if (!response.ok) { const data = (await response.json().catch(() => ({}))) as { error?: string }; setError(data.error ?? 'Não foi possível enviar sua encomenda. Tente novamente.'); return; }
      window.sessionStorage.removeItem(REQUEST_DRAFT_KEY);
      router.push('/account/requests');
    } catch { setError('Não foi possível enviar sua encomenda. Verifique sua conexão e tente novamente.'); }
    finally { setSubmitting(false); }
  }

  const isFileReference = referenceType !== 'link';
  const selectedOption = REFERENCE_TYPES.find((option) => option.id === referenceType)!;

  return (
    <main className="overflow-x-hidden bg-[#fffaf8] dark:bg-gray-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-pink-500 to-orange-400 px-4 py-8 text-white sm:px-6 sm:py-11">
        <div className="pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full bg-white/15 blur-3xl" /><div className="pointer-events-none absolute -bottom-28 right-0 h-56 w-56 rounded-full bg-orange-100/30 blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center"><span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">Encomenda personalizada</span><h1 className="mx-auto mt-3 max-w-3xl text-2xl font-black tracking-tight sm:text-4xl">Sua ideia merece sair da tela.</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/90">Envie uma imagem, arquivo 3D ou link. Verificamos a viabilidade e a licença antes de enviar seu orçamento.</p>
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-3 gap-2 text-left sm:gap-3">{[['1', 'Envie'], ['2', 'Receba o orçamento'], ['3', 'Aprove']].map(([step, label]) => <div key={step} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm"><span className="text-[10px] font-black text-orange-100">{step}</span><p className="mt-0.5 text-xs font-bold leading-4">{label}</p></div>)}</div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="rounded-3xl border border-pink-100 bg-white p-5 shadow-[0_18px_55px_-35px_rgba(219,39,119,.45)] dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-600">Passo 1 de 2</p><h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white sm:text-2xl">Como você quer nos mostrar sua ideia?</h2></div><p className="text-xs text-gray-500 dark:text-gray-400">Escolha uma referência por vez.</p></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">{REFERENCE_TYPES.map((option) => { const active = referenceType === option.id; return <button key={option.id} type="button" onClick={() => changeType(option.id)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-orange-50 shadow-sm dark:border-pink-700 dark:from-pink-950/40 dark:to-orange-950/20' : 'border-gray-100 bg-white hover:border-pink-200 hover:bg-pink-50/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-pink-900'}`} aria-pressed={active}><span className="text-2xl" aria-hidden="true">{option.icon}</span><p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{option.title}</p><p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{option.description}</p></button>; })}</div>
          {isFileReference ? <div className="mt-6"><button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} className={`flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${dragOver ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30' : file ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-pink-200 bg-pink-50/35 hover:border-pink-400 hover:bg-pink-50 dark:border-pink-900 dark:bg-pink-950/20'}`}>{file ? <>{previewUrl ? <img src={previewUrl} alt="Prévia da imagem de referência" className="h-24 w-24 rounded-xl object-cover shadow-sm" /> : <span className="text-4xl">🧩</span>}<p className="mt-3 max-w-full truncate text-sm font-bold text-gray-900 dark:text-white">{file.name}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)} · {referenceType === 'image' ? 'Imagem de referência' : 'Arquivo STL'}</p><span className="mt-4 text-xs font-bold text-pink-600">Trocar arquivo</span></> : <><span className="text-4xl" aria-hidden="true">{selectedOption.icon}</span><p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{referenceType === 'image' ? 'Arraste uma imagem ou clique para escolher' : 'Arraste o seu STL ou clique para escolher'}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{referenceType === 'image' ? 'JPG, PNG ou WEBP · até 10 MB' : 'Arquivo .STL · até 100 MB'}</p></>}</button><input ref={fileInputRef} type="file" accept={referenceType === 'image' ? '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp' : '.stl'} className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0])} />{file && <button type="button" onClick={() => setFile(null)} className="mt-3 text-xs font-bold text-gray-500 underline underline-offset-4 hover:text-pink-600">Remover referência</button>}<p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">Envie apenas referências e modelos que você tem permissão para reproduzir. Confirmaremos a viabilidade e a licença antes do orçamento.</p>{referenceType === 'stl' && file && <STLAnalysisPanel key={`${file.name}-${file.lastModified}`} file={file} authenticated={status === 'authenticated'} />}</div> : <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/45 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:p-6"><label htmlFor="reference-link" className="text-sm font-bold text-gray-900 dark:text-white">Link da referência</label><p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">Pode ser de uma loja, rede social ou plataforma de modelos 3D. Não precisa ser MakerWorld.</p><input id="reference-link" type="url" value={referenceLink} onChange={(event) => setReferenceLink(event.target.value)} placeholder="https://..." className={inputClass} /><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><input type="checkbox" checked={licenseAcknowledged} onChange={(event) => setLicenseAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-pink-600" /><span><strong>Licença comercial vem primeiro.</strong> Entendo que a Hellou só produz modelos com permissão para impressão e venda. Vamos conferir a licença antes de aprovar o orçamento.</span></label></div>}
        </section>

        <section className="mt-6 rounded-3xl border border-pink-100 bg-white p-5 shadow-[0_18px_55px_-35px_rgba(219,39,119,.35)] dark:border-gray-800 dark:bg-gray-900 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-600">Passo 2 de 2</p><h2 className="mt-1 text-xl font-black text-gray-950 dark:text-white sm:text-2xl">Conte um pouco mais</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Quanto mais contexto você der, mais certeiro fica o orçamento.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-sm font-bold text-gray-800 dark:text-gray-100">Nome da ideia <span className="font-normal text-gray-400">(opcional)</span></span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Ex.: Luminária para meu quarto" className={inputClass} /></label><label className="sm:col-span-2"><span className="text-sm font-bold text-gray-800 dark:text-gray-100">Como você imagina a peça?</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} placeholder="Conte para que ela serve, onde vai ficar e quais detalhes são importantes para você." className={`${inputClass} resize-y leading-6`} /></label><label><span className="text-sm font-bold text-gray-800 dark:text-gray-100">Quantidade</span><input type="number" min="1" max="999" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputClass} /></label><label><span className="text-sm font-bold text-gray-800 dark:text-gray-100">Cor ou acabamento <span className="font-normal text-gray-400">(opcional)</span></span><input value={color} onChange={(event) => setColor(event.target.value)} maxLength={120} placeholder="Ex.: rosa claro, fosco" className={inputClass} /></label><label><span className="text-sm font-bold text-gray-800 dark:text-gray-100">Tamanho aproximado <span className="font-normal text-gray-400">(opcional)</span></span><input value={size} onChange={(event) => setSize(event.target.value)} maxLength={120} placeholder="Ex.: 15 cm de altura" className={inputClass} /></label><label><span className="text-sm font-bold text-gray-800 dark:text-gray-100">Precisa para quando? <span className="font-normal text-gray-400">(opcional)</span></span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} /></label></div>
        </section>
        {restoredDraft && <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">Seus dados foram recuperados. Se você havia escolhido uma imagem ou STL, selecione o arquivo novamente.</p>}
        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        <div className="mt-6 rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 to-pink-50 p-5 dark:border-gray-800 dark:from-gray-900 dark:to-gray-900 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6"><p className="max-w-2xl text-xs leading-5 text-gray-600 dark:text-gray-300"><strong className="text-gray-900 dark:text-white">O que acontece agora:</strong> sua solicitação entra para análise. Enviamos o orçamento em até <span className="font-semibold">2 dias úteis</span> e você acompanha todas as atualizações em <span className="font-semibold">Minhas solicitações</span>; nada é produzido ou cobrado antes da sua aprovação.</p><button type="submit" disabled={submitting} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 text-sm font-black text-white shadow-lg shadow-pink-200/60 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-55 sm:mt-0 sm:w-auto">{submitting ? 'Enviando sua ideia...' : status === 'authenticated' ? 'Pedir orçamento' : 'Entrar para pedir orçamento'} <span className="ml-2" aria-hidden="true">→</span></button></div>
      </form>
    </main>
  );
}
