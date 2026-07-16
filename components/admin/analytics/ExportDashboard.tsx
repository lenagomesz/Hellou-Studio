'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Mail, Send } from 'lucide-react';

export default function ExportDashboard() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [email, setEmail] = useState('studiohellou@gmail.com');
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        setEmailModalOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  function handleExportPDF() {
    window.open('/api/admin/analytics/export-pdf', '_blank');
    setDropdownOpen(false);
  }

  function handleExportCSV() {
    window.open('/api/admin/analytics/export?period=30d', '_blank');
    setDropdownOpen(false);
  }

  function handleEmailOption() {
    setEmailModalOpen(true);
    setDropdownOpen(false);
  }

  async function handleSendEmail() {
    if (!email.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/admin/analytics/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar relatório');
      }

      setNotification({
        type: 'success',
        message: 'Relatório enviado com sucesso!',
      });
      setEmailModalOpen(false);
    } catch {
      setNotification({
        type: 'error',
        message: 'Erro ao enviar relatório. Tente novamente.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setDropdownOpen(!dropdownOpen);
          setEmailModalOpen(false);
        }}
        className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar relatório
        </span>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={handleExportPDF}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <FileText className="h-4 w-4" />
            PDF Completo
          </button>
          <button
            onClick={handleExportCSV}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            CSV Resumo
          </button>
          <button
            onClick={handleEmailOption}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Mail className="h-4 w-4" />
            Enviar por Email
          </button>
        </div>
      )}

      {emailModalOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Enviar relatório por e-mail
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <button
            onClick={handleSendEmail}
            disabled={sending || !email.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}

      {notification && (
        <div
          className={`absolute right-0 mt-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}
