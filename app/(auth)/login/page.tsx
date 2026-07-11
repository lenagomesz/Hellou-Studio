'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, Check, ShieldCheck, ChevronLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      twoFACode: requires2FA ? twoFACode : undefined,
      redirect: false,
    });

    if (!result) {
      setLoading(false);
      setError('Erro ao fazer login. Tente novamente.');
      return;
    }

    if (result.error === '2FA_REQUIRED') {
      setLoading(false);
      setRequires2FA(true);
      setError(null);
      return;
    }

    if (result.error) {
      setLoading(false);
      if (requires2FA) {
        setError('Código 2FA inválido. Tente novamente.');
      } else {
        setError('Email ou senha inválidos. Verifique suas credenciais e tente novamente.');
      }
      return;
    }

    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);

    const dest = callbackUrl;
    globalThis.location.href = dest;
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
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-medium">Impressão 3D sob demanda</span>
          </div>
          <h2 className="text-4xl font-bold font-display leading-tight">
            Bem-vindo(a)
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Acesse sua conta para acompanhar pedidos, favoritos e descobrir produtos exclusivos.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-white" />
              <span>Rastreio de pedidos</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-white" />
              <span>Ofertas exclusivas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header mobile com gradiente */}
      <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 px-5 pb-6 pt-5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-orange-300/30 blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="flex items-center gap-1 text-white/90 text-sm font-medium hover:text-white transition">
              <ChevronLeft className="h-4 w-4" />
              Início
            </Link>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition"
              aria-label="Alternar tema"
            >
              {mounted && (theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />)}
            </button>
          </div>
          <h1 className="text-xl font-bold text-white font-display">Bem-vindo(a)</h1>
          <p className="mt-0.5 text-sm text-white/80">
            Entre para acessar sua conta
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 w-full lg:w-1/2 items-center justify-center bg-gray-50/50 dark:bg-gray-950">
        <div className="w-full max-w-md mx-auto px-6 lg:px-8 py-8 lg:py-0">
          {/* Card mobile */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 p-6 lg:p-8 lg:bg-white lg:dark:bg-gray-900 lg:shadow-lg lg:shadow-gray-200/40 lg:dark:shadow-gray-950/40">
            {/* Título desktop */}
            <div className="hidden lg:flex lg:items-start lg:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Entrar na sua conta</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Insira seus dados para acessar
                </p>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                aria-label="Alternar tema"
              >
                {mounted && (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
              </button>
            </div>

            {callbackUrl && callbackUrl !== '/' && (
              <div className="mb-6 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4 flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                    Conta necessária para comprar
                  </p>
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    Para realizar compras ou encomendas, você precisa ter uma conta. Isso nos permite rastrear seus pedidos e manter contato com você sobre suas solicitações.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!requires2FA ? (
                <>
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                      />
                    </div>
                  </div>

                  {/* Senha */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Senha
                      </label>
                      <Link href="/forgot-password" className="text-xs font-medium text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition">
                        Esqueceu?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 pl-11 pr-11 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-0.5"
                        aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Lembrar de mim */}
                  <div className="flex items-center gap-2.5">
                    <input
                      id="remember"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-500 dark:text-gray-400">
                      Lembrar de mim
                    </label>
                  </div>
                </>
              ) : (
                <>
                  {/* 2FA Header */}
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                        Autenticação de dois fatores
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Insira o código de 6 dígitos do seu autenticador ou um backup code.
                      </p>
                    </div>
                  </div>

                  {/* 2FA Code */}
                  <div>
                    <label htmlFor="2fa-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Código 2FA
                    </label>
                    <input
                      id="2fa-code"
                      type="text"
                      required
                      maxLength={12}
                      placeholder="000000 ou XXXXXX"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.toUpperCase())}
                      autoComplete="off"
                      className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-4 py-3 text-center text-lg font-mono tracking-widest text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Código TOTP de 6 dígitos ou Backup Code de 12 caracteres
                    </p>
                  </div>

                  {/* Voltar */}
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setTwoFACode('');
                      setError(null);
                    }}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
                  >
                    ← Voltar
                  </button>
                </>
              )}

              {/* Erro */}
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2.5">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600">!</span>
                  </div>
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-gray-900 px-3 text-gray-400">ou</span>
              </div>
            </div>

            {/* Link para registro */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Não tem uma conta?{' '}
              <Link href="/register" className="font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition">
                Criar agora
              </Link>
            </p>
          </div>

          {/* Badge segurança mobile */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400 lg:hidden">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Seus dados estão protegidos</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
