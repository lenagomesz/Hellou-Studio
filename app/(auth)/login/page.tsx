'use client';

import { signIn, getSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, type FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, Check, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError('Email ou senha inválidos. Verifique suas credenciais e tente novamente.');
      return;
    }

    const session = await getSession();
    const dest = session?.user?.role === 'admin' ? '/dashboard' : callbackUrl;
    window.location.href = dest;
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
      <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-orange-400 px-6 pb-12 pt-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-orange-300/30 blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-sm font-bold">H</span>
            </div>
            <span className="text-lg font-bold font-display text-white">helloustudio</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Bem-vindo(a)</h1>
          <p className="mt-1 text-sm text-white/80">
            Entre para acessar sua conta
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 w-full lg:w-1/2 items-start lg:items-center justify-center bg-gray-50/50">
        <div className="w-full max-w-md mx-auto px-6 lg:px-8 mt-14 lg:mt-0 pb-8 lg:pb-0">
          {/* Card mobile */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-6 lg:p-0 lg:bg-transparent lg:shadow-none lg:rounded-none">
            {/* Título desktop */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold text-gray-900 font-display">Entrar na sua conta</h1>
              <p className="mt-2 text-sm text-gray-500">
                Insira seus dados para acessar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Senha
                  </label>
                  <Link href="/forgot-password" className="text-xs font-medium text-pink-600 hover:text-pink-700 transition">
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
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-11 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:bg-white focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
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
                <label htmlFor="remember" className="text-sm text-gray-500">
                  Lembrar de mim
                </label>
              </div>

              {/* Erro */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-start gap-2.5">
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
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white lg:bg-gray-50/50 px-3 text-gray-400">ou</span>
              </div>
            </div>

            {/* Link para registro */}
            <p className="text-center text-sm text-gray-500">
              Não tem uma conta?{' '}
              <Link href="/register" className="font-semibold text-pink-600 hover:text-pink-700 transition">
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
