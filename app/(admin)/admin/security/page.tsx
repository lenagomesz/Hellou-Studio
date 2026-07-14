'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Setup2FADialog } from '@/components/admin/2fa-setup-dialog';

interface User2FA {
  two_fa_enabled: boolean;
  two_fa_backup_codes_generated_at?: string;
  two_fa_last_verified_at?: string;
}

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user2FA, setUser2FA] = useState<User2FA | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUser2FAStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/profile', { method: 'GET' });
      if (!response.ok) throw new Error('Erro ao buscar dados');

      const data = await response.json();
      setUser2FA({
        two_fa_enabled: data.two_fa_enabled,
        two_fa_backup_codes_generated_at: data.two_fa_backup_codes_generated_at,
        two_fa_last_verified_at: data.two_fa_last_verified_at,
      });
    } catch (err) {
      console.error('Erro:', err);
      setMessage({ type: 'error', text: 'Erro ao carregar dados de segurança' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchUser2FAStatus();
    }
  }, [fetchUser2FAStatus, router, session, status]);

  const handleDisable2FA = async () => {
    if (!disableCode) {
      setMessage({ type: 'error', text: 'Insira o código TOTP' });
      return;
    }

    setDisableLoading(true);
    try {
      const response = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao desabilitar 2FA' });
        return;
      }

      setMessage({ type: 'success', text: '2FA desabilitado com sucesso' });
      setDisableCode('');
      setShowDisableForm(false);
      fetchUser2FAStatus();
    } catch (_err) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      const response = await fetch('/api/admin/2fa/regenerate-backup-codes', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao regenerar códigos' });
        return;
      }

      setMessage({
        type: 'success',
        text: `${data.backupCodes.length} novos códigos gerados. Faça download em segurança.`,
      });
      // Show backup codes dialog
      const codesText = data.backupCodes.join('\n');
      const blob = new Blob([codesText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '2fa-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      setMessage({ type: 'error', text: 'Erro ao regenerar códigos' });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-pink-600" />
            Configurações de Segurança
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gerencie a autenticação de dois fatores e outras configurações de segurança
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 flex gap-3 items-start ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                message.type === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* 2FA Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Autenticação de Dois Fatores (2FA)
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Adicione uma camada extra de segurança à sua conta
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                user2FA?.two_fa_enabled
                  ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
              }`}
            >
              {user2FA?.two_fa_enabled ? '✓ Habilitado' : '○ Desabilitado'}
            </div>
          </div>

          {user2FA?.two_fa_enabled ? (
            <div className="space-y-4">
              {/* Status info */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Sua conta está protegida com 2FA. Você precisará inseri um código de verificação quando fizer login.
                </p>
              </div>

              {/* Last verified */}
              {user2FA.two_fa_last_verified_at && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Última verificação bem-sucedida:{' '}
                  {new Date(user2FA.two_fa_last_verified_at).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRegenerateCodes}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 font-medium flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerar Backup Codes
                </button>
                <button
                  onClick={() => setShowDisableForm(true)}
                  className="flex-1 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 py-2.5 font-medium transition"
                >
                  Desabilitar 2FA
                </button>
              </div>

              {/* Disable form */}
              {showDisableForm && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
                  <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-3 rounded-lg">
                    <p className="text-xs text-orange-800 dark:text-orange-300">
                      ⚠️ Insira seu código TOTP para confirmar a desativação de 2FA
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-center font-mono text-gray-900 dark:text-gray-100 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    />
                    <button
                      onClick={handleDisable2FA}
                      disabled={disableLoading || disableCode.length !== 6}
                      className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 font-medium transition flex items-center gap-2"
                    >
                      {disableLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Desabilitar
                        </>
                      ) : (
                        'Desabilitar'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisableCode('');
                      }}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-2 font-medium transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Proteja sua conta ativando a autenticação de dois fatores. Você precisará de um autenticador como Google Authenticator, Authy ou Microsoft Authenticator.
                </p>
              </div>
              <button
                onClick={() => setSetupDialogOpen(true)}
                className="w-full rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 font-medium transition"
              >
                Ativar 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Setup Dialog */}
      <Setup2FADialog
        isOpen={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onSuccess={() => {
          setSetupDialogOpen(false);
          fetchUser2FAStatus();
          setMessage({
            type: 'success',
            text: '2FA ativado com sucesso! Sua conta está mais segura.',
          });
        }}
      />
    </div>
  );
}
