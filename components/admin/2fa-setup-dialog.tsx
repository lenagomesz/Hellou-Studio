'use client';

import { useState } from 'react';
import { Copy, Check, X, Loader2, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface Setup2FADialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function Setup2FADialog({ isOpen, onClose, onSuccess }: Setup2FADialogProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/2fa/setup', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao gerar setup');
        return;
      }

      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep('verify');
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code) {
      setError('Insira o código TOTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          code,
          backupCodes: Array.from(
            { length: 10 },
            (_, i) =>
              document
                .getElementById(`backup-code-${i}`)
                ?.textContent?.trim() || '',
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Código inválido');
        return;
      }

      setBackupCodes(data.backupCodes);
      setStep('backup');
    } catch (err) {
      setError('Erro ao confirmar código');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    resetDialog();
  };

  const resetDialog = () => {
    setStep('setup');
    setSecret('');
    setQrCode('');
    setBackupCodes([]);
    setCode('');
    setError(null);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const content = `Códigos de Backup 2FA - Hellou Studio\n\n${backupCodes.join('\n')}\n\nGuarde estes códigos em um local seguro!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 'setup' && 'Configurar 2FA'}
            {step === 'verify' && 'Verificar Código'}
            {step === 'backup' && 'Backup Codes'}
          </h2>
          <button
            onClick={resetDialog}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Escaneie o código QR abaixo com seu autenticador (Google Authenticator, Authy, etc).
            </p>
            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white py-2.5 font-medium flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Código QR'
              )}
            </button>
          </div>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <img
                  src={qrCode}
                  alt="QR Code 2FA"
                  className="h-48 w-48 rounded-lg border border-gray-200 dark:border-gray-700 p-2"
                />
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Ou insira manualmente:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                  {secret}
                </code>
                <button
                  onClick={() => copyToClipboard(secret)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Insira o código TOTP de 6 dígitos:
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-gray-100 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white py-2.5 font-medium flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar Código'
              )}
            </button>
          </div>
        )}

        {/* Backup Codes Step */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-2">
                ⚠️ Importante!
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-300">
                Guarde estes códigos em um local seguro. Você pode usá-los para acessar sua conta se perder o autenticador.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-64 overflow-y-auto space-y-2">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  id={`backup-code-${i}`}
                  className="font-mono text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 p-2 rounded"
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={downloadBackupCodes}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 font-medium flex items-center justify-center gap-2 transition"
              >
                <Download className="h-4 w-4" />
                Baixar
              </button>
              <button
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 font-medium flex items-center justify-center gap-2 transition"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </button>
            </div>

            <button
              onClick={handleComplete}
              className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 font-medium transition"
            >
              ✓ Concluído
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
