'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState, type FormEvent, type ChangeEvent } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader2, Check, ShieldCheck, ChevronLeft, Sun, Moon, FileText } from 'lucide-react';
import { formatCpf, isValidCpf, cleanCpf } from '@/lib/cpf';
import { useTheme } from 'next-themes';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Média', color: 'bg-yellow-500' };
  return { score, label: 'Forte', color: 'bg-green-500' };
}

export default function RegisterPage() {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhone(e.target.value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe seu nome completo.');
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Informe um telefone válido com DDD.');
      return;
    }

    const cpfDigits = cleanCpf(cpf);
    if (cpfDigits.length > 0 && !isValidCpf(cpfDigits)) {
      setError('CPF inválido. Verifique os números informados.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!acceptTerms) {
      setError('Você precisa aceitar os termos de uso para continuar.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, phone, password, cpf: cleanCpf(cpf) || undefined }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Não foi possível criar a conta');
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError('Conta criada, mas falha ao entrar. Tente fazer login.');
        return;
      }

      window.location.href = '/';
    } finally {
      setLoading(false);
    }
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
            Transforme suas ideias em realidade
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Crie sua conta e descubra produtos únicos feitos com impressão 3D de alta qualidade.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-white" />
              <span>Entrega rápida</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-white" />
              <span>Produtos exclusivos</span>
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
            <Link href="/login" className="flex items-center gap-1 text-white/90 text-sm font-medium hover:text-white transition">
              <ChevronLeft className="h-4 w-4" />
              Login
            </Link>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
          <h1 className="text-xl font-bold text-white font-display">Criar sua conta</h1>
          <p className="mt-0.5 text-sm text-white/80">
            Preencha os dados para começar
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 w-full lg:w-1/2 items-center justify-center bg-gray-50/50 dark:bg-gray-950">
        <div className="w-full max-w-md mx-auto px-5 lg:px-8 py-8 lg:py-0">
          {/* Card mobile */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-gray-950/60 p-5 lg:p-8 lg:bg-white lg:dark:bg-gray-900 lg:shadow-lg lg:shadow-gray-200/40 lg:dark:shadow-gray-950/40">
            {/* Título desktop */}
            <div className="hidden lg:flex lg:items-start lg:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Criar sua conta</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Preencha os dados abaixo para começar
                </p>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  CPF <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Necessário para emissão de nota fiscal</p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
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
                {/* Indicador de força */}
                {password.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score
                            ? strength.score <= 2 ? 'bg-red-400' : strength.score <= 3 ? 'bg-yellow-400' : 'bg-green-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                    <span className={`ml-1 text-xs font-medium ${
                      strength.score <= 2 ? 'text-red-600' : strength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`block w-full rounded-xl border bg-gray-50/50 dark:bg-gray-800 pl-11 pr-11 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-300 dark:border-red-700 focus:bg-white dark:focus:bg-gray-800 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:ring-pink-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-0.5"
                    aria-label={showConfirmPassword ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1.5 text-xs text-red-600">As senhas não coincidem</p>
                )}
                {confirmPassword && confirmPassword === password && confirmPassword.length >= 8 && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Senhas coincidem
                  </p>
                )}
              </div>

              {/* Termos */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="terms" className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Aceito os{' '}
                  <Link href="/terms" className="text-pink-600 dark:text-pink-400 hover:underline font-medium">termos de uso e política de privacidade</Link>
                </label>
              </div>

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
                    Criando conta...
                  </>
                ) : (
                  'Criar minha conta'
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-gray-900 px-3 text-gray-400">ou</span>
              </div>
            </div>

            {/* Link para login */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition">
                Fazer login
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
