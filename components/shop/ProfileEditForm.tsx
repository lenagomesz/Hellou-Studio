'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
  role: string;
  created_at: string;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ProfileEditForm() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const data: ProfileData = await res.json();
      setProfile(data);
      setName(data.name ?? '');
      setPhone(data.phone ? formatPhone(data.phone) : '');
      setCpf(data.cpf ? formatCPF(data.cpf) : '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim() || null,
        phone: phone.replace(/\D/g, '') || null,
        cpf: cpf.replace(/\D/g, '') || null,
      }),
    });

    if (res.ok) {
      const data: ProfileData = await res.json();
      setProfile(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Erro ao salvar alterações. Tente novamente.');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.created_at));

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-xl font-bold text-white shadow-lg shadow-pink-200/40 dark:shadow-pink-900/30">
          {(profile.name ?? profile.email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {profile.name ?? 'Usuário'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile.email}</p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Membro desde {memberSince}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="profile-name" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Nome completo
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition focus:border-pink-300 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/30"
          />
        </div>

        <div>
          <label htmlFor="profile-email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            E-mail
          </label>
          <input
            id="profile-email"
            type="email"
            value={profile.email}
            disabled
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">O e-mail não pode ser alterado</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-phone" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Telefone
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition focus:border-pink-300 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/30"
            />
          </div>
          <div>
            <label htmlFor="profile-cpf" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              CPF
            </label>
            <input
              id="profile-cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 transition focus:border-pink-300 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900/30"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 px-4 py-3">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              Perfil atualizado com sucesso!
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}
