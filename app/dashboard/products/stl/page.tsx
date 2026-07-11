'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileUp, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'encomenda', label: 'Encomenda' },
  { value: 'chaveiros', label: 'Chaveiros' },
  { value: 'escritorio', label: 'Escritorio' },
  { value: 'criaturas', label: 'Criaturas' },
];

export default function STLUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('encomenda');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setError('');

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.stl')) {
        setError('Apenas arquivos .stl sao aceitos');
        return;
      }
      if (droppedFile.size > 50 * 1024 * 1024) {
        setError('Arquivo deve ter menos de 50MB');
        return;
      }
      setFile(droppedFile);
      if (!name) {
        setName(droppedFile.name.replace(/\.stl$/i, '').replace(/[_-]/g, ' '));
      }
    }
  }, [name]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.stl')) {
        setError('Apenas arquivos .stl sao aceitos');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('Arquivo deve ter menos de 50MB');
        return;
      }
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.stl$/i, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Selecione um arquivo STL');
      return;
    }
    if (!name.trim()) {
      setError('Nome do produto e obrigatorio');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Preco deve ser maior que zero');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('stl', file);
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      formData.append('category', category);

      const res = await fetch('/api/upload/stl', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar produto');
        setLoading(false);
        return;
      }

      setSuccess('Produto STL criado com sucesso! Redirecionando...');
      setTimeout(() => {
        router.push(`/dashboard/products/${data.product.id}/edit`);
      }, 1500);
    } catch {
      setError('Erro de conexao. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <Link
          href="/dashboard/products"
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          &larr; Voltar para produtos
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
          Upload de Arquivo STL
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Faca upload de um arquivo .stl para criar um novo produto digital automaticamente.
        </p>
      </header>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Card */}
        <div
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
            ${dragOver
              ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
              : file
                ? 'border-green-400 bg-green-50 dark:bg-green-900/10 dark:border-green-600'
                : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50/50 dark:border-gray-600 dark:hover:border-pink-500 dark:hover:bg-pink-900/10'
            }`}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center justify-center gap-4">
              <FileUp className="w-10 h-10 text-green-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                className="ml-4 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Arraste o arquivo STL aqui
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ou clique para selecionar (max 50MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome do Produto *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vaso Geometrico, Miniatura Dragao..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descricao (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descricao do produto..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition resize-none"
            />
          </div>

          {/* Price and Category - side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preco Base (R$) *
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file || !name.trim() || !price}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Criando produto...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Criar Produto STL
            </>
          )}
        </button>
      </form>
    </div>
  );
}
