'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';

type ImportMode = 'create' | 'update' | 'upsert';

type ImportResults = {
  created: number;
  updated: number;
  errors: number;
  error_details: string[];
};

type PreviewRow = {
  id?: string;
  name?: string;
  category?: string;
  base_price?: string;
  sale_price?: string;
  [key: string]: string | undefined;
};

export default function ImportPage() {
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  function parseCSVPreview(text: string) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setValidationErrors(['CSV deve ter pelo menos um cabecalho e uma linha de dados']);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());
    setPreviewHeaders(headers);

    // Validate required columns
    const errors: string[] = [];
    const requiredForCreate = ['name', 'base_price'];
    const hasId = headers.includes('id');

    if (mode === 'create' || mode === 'upsert') {
      for (const col of requiredForCreate) {
        if (!headers.includes(col)) {
          errors.push(`Coluna obrigatoria ausente: ${col}`);
        }
      }
    }

    if (mode === 'update' && !hasId) {
      errors.push('Coluna "id" e obrigatoria no modo update');
    }

    setValidationErrors(errors);

    // Parse preview rows (max 10)
    const rows: PreviewRow[] = [];
    for (let i = 1; i < Math.min(lines.length, 11); i++) {
      const values = parseCSVLine(lines[i]);
      const row: PreviewRow = {};
      headers.forEach((h, idx) => {
        row[h] = (values[idx] ?? '').trim();
      });
      rows.push(row);
    }
    setPreview(rows);
  }

  function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      showToast('Apenas arquivos CSV sao aceitos', 'error');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      parseCSVPreview(text);
      setResults(null);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  async function handleImport() {
    if (!csvContent) {
      showToast('Selecione um arquivo CSV', 'error');
      return;
    }
    if (validationErrors.length > 0) {
      showToast('Corrija os erros antes de importar', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvContent, mode }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults(data.results);
        if (data.success) {
          showToast('Importacao concluida com sucesso!', 'success');
        } else {
          showToast('Importacao concluida com alguns erros', 'error');
        }
      } else {
        if (data.errors) {
          setValidationErrors(data.errors);
        }
        showToast('Erro na validacao do CSV', 'error');
      }
    } catch {
      showToast('Erro de conexão', 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const template = 'id,name,category,type,base_price,sale_price,description,active,image_url\n,Produto Exemplo,chaveiros,physical,29.90,24.90,Descrição do produto,true,\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_produtos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Produtos</h1>
            <p className="text-sm text-gray-500">Upload de CSV para criar ou atualizar produtos em massa</p>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <Download className="h-4 w-4" />
          Baixar Template
        </button>
      </header>

      {/* Mode Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Modo de Importacao</h2>
        <div className="flex gap-3">
          {[
            { value: 'upsert' as const, label: 'Criar ou Atualizar', desc: 'Atualiza se tem ID, cria se não tem' },
            { value: 'create' as const, label: 'Apenas Criar', desc: 'Cria novos produtos (ignora ID)' },
            { value: 'update' as const, label: 'Apenas Atualizar', desc: 'Atualiza produtos existentes por ID' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setMode(opt.value); if (csvContent) parseCSVPreview(csvContent); }}
              className={`flex-1 rounded-xl border p-3 text-left transition ${
                mode === opt.value
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
          dragActive
            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/10'
            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {fileName ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{fileName}</p>
            <p className="text-xs text-gray-500">Clique para trocar arquivo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Arraste um arquivo CSV ou clique para selecionar
            </p>
            <p className="text-xs text-gray-500">
              Colunas esperadas: id, name, category, type, base_price, sale_price, description, active
            </p>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">Erros de Validacao</h3>
          </div>
          <ul className="space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i} className="text-xs text-red-700 dark:text-red-400">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {preview.length > 0 && validationErrors.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Preview ({preview.length} de {csvContent.trim().split('\n').length - 1} linhas)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {previewHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {previewHeaders.map((h) => (
                      <td key={h} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                        {row[h] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      {csvContent && validationErrors.length === 0 && !results && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importing}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-8 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {importing ? 'Importando...' : `Importar ${csvContent.trim().split('\n').length - 1} Produto(s)`}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Resultado da Importacao</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-green-50 p-4 text-center dark:bg-green-900/20">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
              <p className="mt-2 text-2xl font-bold text-green-700">{results.created}</p>
              <p className="text-xs text-green-600">Criados</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 text-center dark:bg-blue-900/20">
              <CheckCircle2 className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-2 text-2xl font-bold text-blue-700">{results.updated}</p>
              <p className="text-xs text-blue-600">Atualizados</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-900/20">
              <XCircle className="mx-auto h-8 w-8 text-red-600" />
              <p className="mt-2 text-2xl font-bold text-red-700">{results.errors}</p>
              <p className="text-xs text-red-600">Erros</p>
            </div>
          </div>
          {results.error_details.length > 0 && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">Detalhes dos erros:</p>
              <ul className="space-y-1">
                {results.error_details.map((err, i) => (
                  <li key={i} className="text-xs text-red-700 dark:text-red-400">{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
