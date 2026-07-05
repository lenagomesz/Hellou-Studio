'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function STLUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [stlFile, setStlFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSTLSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.stl')) {
      setStlFile(file);
    } else {
      toast.error('Selecione um arquivo .stl válido');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stlFile) {
      toast.error('Arquivo STL é obrigatório');
      return;
    }

    if (images.length === 0) {
      toast.error('Adicione pelo menos uma imagem');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', (e.target as any).name.value);
      formData.append('description', (e.target as any).description.value);
      formData.append('price', (e.target as any).price.value);
      formData.append('stl', stlFile);
      images.forEach(img => formData.append('images', img));

      const res = await fetch('/api/admin/products/stl', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao enviar arquivo');
      }

      toast.success('Arquivo STL enviado com sucesso!');
      router.push('/dashboard/products');
    } catch (error) {
      console.error('[stl-upload-ui] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Upload de Arquivo STL</h1>

      {/* Educational Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">O que é arquivo STL?</h2>
        <p className="text-blue-800 text-sm mb-3">
          STL é um formato aberto de arquivo 3D usado em impressoras 3D e softwares de modelagem. Cada arquivo representa um modelo tridimensional que pode ser impresso ou editado em programas como Blender, Fusion 360 ou Tinkercad.
        </p>
        <a
          href="https://www.makerworld.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
        >
          → Confira modelos em makerworld.com.br
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block font-semibold mb-2">Nome do Arquivo *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="Ex: Miniatura Dragão 5cm"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold mb-2">Descrição *</label>
          <textarea
            name="description"
            required
            placeholder="Descreva o modelo, uso recomendado, tamanho, etc..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block font-semibold mb-2">Preço (R$) *</label>
          <input
            type="number"
            name="price"
            required
            min="0.01"
            step="0.01"
            placeholder="19.90"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Images */}
        <div>
          <label className="block font-semibold mb-2">Imagens do Modelo * (mínimo 1)</label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleImageSelect}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative bg-gray-100 rounded p-2 flex items-center justify-between">
                  <span className="text-xs truncate flex-1">{img.name}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="text-red-600 hover:text-red-800 ml-2 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STL File */}
        <div>
          <label className="block font-semibold mb-2">Arquivo STL * (máximo 50MB)</label>
          <input
            type="file"
            accept=".stl"
            onChange={handleSTLSelect}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {stlFile && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {stlFile.name} ({(stlFile.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar Arquivo STL'}
        </button>
      </form>
    </div>
  );
}
