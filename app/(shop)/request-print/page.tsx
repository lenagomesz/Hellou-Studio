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
    const hasDescription = description.trim().length > 0;
    const hasNotes = notes.trim().length > 0;

    if (!hasFile && !hasLink) {
      setError('Você precisa enviar um arquivo STL ou um link do Makerworld');
      return;
    }

    if (hasFile && hasLink) {
      setError('Escolha apenas uma opção: arquivo STL ou link do Makerworld');
      return;
    }

    if (!hasDescription) {
      setError('Descrição do projeto é obrigatória');
      return;
    }

    if (!hasNotes) {
      setError('Observações adicionais são obrigatórias');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('description', description.trim());
    formData.set('notes', notes.trim());

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
      setError(data.error ?? 'Erro ao enviar solicitação');
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
      {/* Full-width Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-pink-600 to-orange-400 px-6 py-10 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Encomendas personalizadas
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/90 sm:text-base">
          Transforme sua ideia em realidade! Envie seu arquivo .stl com o que precisa e nós cuidamos do resto.
        </p>
      </div>

      {/* Explicação do fluxo */}
      <div className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <div className="rounded-2xl border border-pink-100 dark:border-pink-900/30 bg-pink-50/50 dark:bg-pink-950/20 p-5 sm:p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Como funciona?</h3>
          <ol className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">1</span>
              <span>Você envia sua solicitação com o arquivo .stl e descreve o que precisa.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">2</span>
              <span>Eu verifico se tenho o material disponível e analiso o projeto.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">3</span>
              <span>Envio o valor do orçamento para você avaliar.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">4</span>
              <span>Se tiver qualquer dúvida, entro em contato para alinharmos tudo antes de começar.</span>
            </li>
          </ol>
        </div>

      </div>

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
                    <p className="text-xs text-gray-500 dark:text-gray-400">{makerLink.trim() ? '' : 'ou clique para selecionar (máx. 50MB)'}</p>
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
                Encontrou algo legal no Makerworld? Cole o link e vou avaliar a licença para você.
              </p>

              <label htmlFor="makerworld-link" className="block text-xs font-semibold text-gray-900 dark:text-white mb-2">
                Link do projeto
              </label>
              <input
                id="makerworld-link"
                type="url"
                value={makerLink}
                onChange={(e) => setMakerLink(e.target.value)}
                placeholder="https://www.makerworld.com.br/pt/models/..."
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
