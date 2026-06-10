'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao enviar email.');
      } else {
        setSent(true);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Painel desktop */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 items-center justify-center p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-20 right-20 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />
          </div>
          <div className="relative z-10 text-center text-white max-w-md">
            <h2 className="text-4xl font-bold font-display leading-tight">
              Verifique seu email
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Enviamos as instruções para redefinir sua senha. Fique de olho na caixa de entrada.
            </p>
          </div>
        </div>

        {/* Header mobile */}
        <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 px-6 pb-6 pt-10">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-orange-300/30 blur-2xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-sm font-bold">H</span>
              </div>
              <span className="text-lg font-bold font-display text-white">helloustudio</span>
            </div>
            <h1 className="text-xl font-bold text-white font-display">Email enviado!</h1>
            <p className="mt-1 text-sm text-white/80">
              Verifique sua caixa de entrada
            </p>
          </div>
        </div>

        {/* Conteúdo sucesso */}
        <div className="flex flex-1 w-full lg:w-1/2 items-start lg:items-center justify-center bg-gray-50/50">
          <div className="w-full max-w-md mx-auto px-5 lg:px-8 mt-4 lg:mt-0 pb-8 lg:pb-0">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 lg:p-0 lg:bg-transparent lg:shadow-none lg:rounded-none text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-gray-900 font-display hidden lg:block">Email enviado!</h2>
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                Se existe uma conta com o email <strong className="text-gray-900">{email}</strong>, você receberá um link para redefinir sua senha.
              </p>
              <p className="mt-3 text-xs text-gray-400">Verifique também a pasta de spam.</p>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel decorativo desktop */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-pink-300/10 blur-3xl" />
        </div>
        <div className="relative z-10 text-center text-white max-w-md">
          <h2 className="text-4xl font-bold font-display leading-tight">
            Não se preocupe
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Acontece com todo mundo. Vamos te ajudar a recuperar o acesso à sua conta rapidamente.
          </p>
        </div>
      </div>

      {/* Header mobile com gradiente */}
      <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 px-6 pb-6 pt-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-orange-300/30 blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-sm font-bold">H</span>
            </div>
            <span className="text-lg font-bold font-display text-white">helloustudio</span>
          </div>
          <h1 className="text-xl font-bold text-white font-display">Esqueceu a senha?</h1>
          <p className="mt-1 text-sm text-white/80">
            Vamos te ajudar a recuperar
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 w-full lg:w-1/2 items-start lg:items-center justify-center bg-gray-50/50">
        <div className="w-full max-w-md mx-auto px-5 lg:px-8 mt-4 lg:mt-0 pb-8 lg:pb-0">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-5 lg:p-0 lg:bg-transparent lg:shadow-none lg:rounded-none">
            {/* Título desktop */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold text-gray-900 font-display">Esqueceu a senha?</h1>
              <p className="mt-2 text-sm text-gray-500">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            {/* Subtítulo mobile */}
            <p className="lg:hidden text-sm text-gray-500 mb-5">
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2.5">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600">!</span>
                  </div>
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de redefinição'
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white lg:bg-gray-50/50 px-3 text-gray-400">ou</span>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500">
              Lembrou a senha?{' '}
              <Link href="/login" className="font-semibold text-pink-600 hover:text-pink-700 transition">
                Entrar
              </Link>
            </p>
          </div>

          {/* Badge segurança mobile */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-400 lg:hidden">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Seus dados estão protegidos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
