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
      router.push('/login');
      return;
    }

    setError(null);

    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    if (!file) {
      setError('Selecione um arquivo .stl');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.set('title', title.trim());
    formData.set('description', description.trim());
    formData.set('notes', notes.trim());
    formData.set('file', file);

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
        <div className="rounded-2xl border border-pink-100 dark:border-pink-900/30 bg-pink-50/50 dark:bg-pink-950/20 p-5 sm:p-6">
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

      <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm sm:p-8">

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-white">
              Título do projeto *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Suporte para celular personalizado"
              className="mt-1.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">Arquivo STL *</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1.5 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragOver
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30'
                  : file
                    ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30'
                    : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-pink-300 hover:bg-pink-50/30 dark:hover:bg-pink-950/20'
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
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remover arquivo
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100 text-pink-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Arraste seu arquivo .stl aqui
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ou clique para selecionar (máx. 50MB)</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".stl"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-white">
              Descrição
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que você gostaria (cor, material, acabamento...)"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-900 dark:text-white">
              Observações adicionais
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quantidade, prazo, uso pretendido..."
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

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
    </div>
  );
}
