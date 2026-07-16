'use client';

import { useState, useRef, type FormEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function RequestPrintPage() {
  const router = useRouter();
  const { status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [makerLink, setMakerLink] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.toLowerCase().endsWith('.stl')) {
      setFile(dropped);
    } else {
      setError('Apenas arquivos .stl são aceitos');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.stl')) {
        setError('Apenas arquivos .stl são aceitos');
        return;
      }
      setFile(selected);
      setError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/request-print');
      return;
    }

    setError(null);

    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }

    const hasFile = file !== null;
    const hasLink = makerLink.trim().length > 0;

    if (!hasFile && !hasLink) {
      setError('Envie um arquivo STL ou um link do Makerworld');
      return;
    }

    if (hasFile && hasLink) {
      setError('Escolha uma opção: arquivo ou link (não ambos)');
      return;
    }

    // Validate Makerworld link format
    if (hasLink) {
      const linkTrim = makerLink.trim().toLowerCase();
      if (!linkTrim.includes('makerworld') && !linkTrim.includes('printables')) {
        setError('Link inválido. Use um link do Makerworld ou Printables');
        return;
      }
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.set('title', title.trim());
    if (description.trim()) formData.set('description', description.trim());
    if (notes.trim()) formData.set('notes', notes.trim());

    if (hasFile) {
      formData.set('file', file);
    }
    if (hasLink) {
      formData.set('makerworld_link', makerLink.trim());
    }

    const res = await fetch('/api/print-requests', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error?.includes('STL')) {
        setError('Arquivo STL é obrigatório quando não há link Makerworld');
      } else {
        setError(data.error ?? 'Erro ao enviar solicitação');
      }
      setSubmitting(false);
      return;
    }

    router.push('/account/requests');
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <section className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-6 py-4 text-center sm:h-44 sm:px-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-orange-200/25 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Sua ideia pode virar realidade</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">Envie seu arquivo STL ou compartilhe um modelo. Analisamos material, acabamento, prazo e valor antes de iniciar a produção.</p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title - Common to both options */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Título do projeto *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Suporte para celular personalizado"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Two Options Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Option 1: STL File */}
            <div className={`rounded-2xl border-2 transition ${
              makerLink.trim() ? 'border-gray-200 dark:border-gray-800 opacity-50' : 'border-pink-200 dark:border-pink-800'
            } bg-white dark:bg-gray-900 p-6 shadow-sm`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📁</span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Opção 1: Arquivo STL</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Você tem um arquivo STL que criou ou tem direitos autorais para usar? Envie direto para mim!
              </p>

              {/* Dropzone */}
              <div
                onDragOver={(e) => { if (!makerLink.trim()) { e.preventDefault(); setDragOver(true); } }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { if (!makerLink.trim()) handleDrop(e); }}
                onClick={() => !makerLink.trim() && fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                  makerLink.trim()
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                    : dragOver
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30'
                      : file
                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30'
                        : 'border-pink-300 dark:border-pink-700 bg-pink-50/30 dark:bg-pink-950/20 hover:border-pink-500 hover:bg-pink-50/50'
                }`}
              >
                {file ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                    {!makerLink.trim() && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remover arquivo
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-pink-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {makerLink.trim() ? 'Desabilitado' : 'Arraste seu arquivo .stl aqui'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{makerLink.trim() ? '' : 'ou clique para selecionar (máx. 100MB)'}</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl"
                  onChange={handleFileChange}
                  disabled={makerLink.trim().length > 0}
                  className="hidden"
                />
              </div>
            </div>

            {/* Option 2: Makerworld Link */}
            <div className={`rounded-2xl border-2 transition ${
              file ? 'border-gray-200 dark:border-gray-800 opacity-50' : 'border-blue-200 dark:border-blue-800'
            } bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔗</span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Opção 2: Link Makerworld</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Encontrou algo legal no{' '}
                <a
                  href="https://makerworld.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  MakerWorld
                </a>
                ? Cole o link e vou avaliar a licença para você.
              </p>

              <a
                href="https://makerworld.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex w-fit items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                Acessar o MakerWorld ↗
              </a>

              <label htmlFor="makerworld-link" className="block text-xs font-semibold text-gray-900 dark:text-white mb-2">
                Link do projeto
              </label>
              <input
                id="makerworld-link"
                type="url"
                value={makerLink}
                onChange={(e) => setMakerLink(e.target.value)}
                placeholder="https://makerworld.com/pt/models/..."
                disabled={file !== null}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mb-3 ${
                  file
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50 text-gray-500'
                    : 'border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              />

              {/* Copyright Warning for Makerworld Option */}
              <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-auto">
                <p className="text-xs font-semibold text-red-900 dark:text-red-200 mb-1">
                  ⚠️ Direitos Autorais
                </p>
                <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                  Muitos modelos têm restrições. Analisaremos a licença e deixaremos claro se podemos prosseguir.
                </p>
              </div>
            </div>
          </div>

          {/* Description and Notes */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-5">
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que você gostaria (cor, material, acabamento, especificações...)"
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Observações adicionais
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quantidade, prazo, uso pretendido, cores específicas..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
          </button>
        </form>
      </div>
    </div>
  );
}
