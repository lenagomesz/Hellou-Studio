'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { PROFILE_AVATARS, profileAvatarImageUrl } from '@/lib/profile-avatars';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
  avatar_url: string | null;
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
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
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

  async function selectAvatar(avatarUrl: string | null) {
    setAvatarSaving(true);
    setError('');
    setSuccess(false);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
    const data = await res.json().catch(() => null) as ProfileData | { error?: string } | null;

    if (res.ok && data && 'id' in data) {
      setProfile(data);
      setAvatarVersion(Date.now());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await updateSession();
    } else {
      setError(data && 'error' in data && data.error ? data.error : 'Não foi possível alterar a foto de perfil.');
    }
    setAvatarSaving(false);
  }

  async function uploadAvatar(file: File) {
    setAvatarSaving(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
    const data = await res.json().catch(() => null) as { avatar_url?: string; error?: string } | null;

    if (res.ok && data?.avatar_url) {
      setProfile((current) => current ? { ...current, avatar_url: data.avatar_url! } : current);
      setAvatarVersion(Date.now());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await updateSession();
    } else {
      setError(data?.error || 'Não foi possível enviar a foto.');
    }
    setAvatarSaving(false);
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
  const avatarImageUrl = profileAvatarImageUrl(profile.avatar_url);
  const displayedAvatarUrl = profile.avatar_url === 'uploaded'
    ? `${avatarImageUrl}?v=${avatarVersion}`
    : avatarImageUrl;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-xl font-bold text-white shadow-lg shadow-pink-200/40 dark:shadow-pink-900/30">
          {displayedAvatarUrl ? (
            <Image
              src={displayedAvatarUrl}
              alt="Foto de perfil"
              width={64}
              height={64}
              unoptimized={profile.avatar_url === 'uploaded'}
              className="h-full w-full object-cover"
            />
          ) : (
            (profile.name ?? profile.email).charAt(0).toUpperCase()
          )}
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

      <section className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/70 to-orange-50/50 p-4 dark:border-pink-900/50 dark:from-pink-950/20 dark:to-orange-950/10 sm:p-5">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Foto de perfil</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Continue com sua inicial, escolha um axolote ou envie uma foto sua.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-7">
          <button
            type="button"
            onClick={() => void selectAvatar(null)}
            disabled={avatarSaving}
            aria-label="Usar a inicial do nome"
            aria-pressed={profile.avatar_url === null}
            className={`flex aspect-square items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-base font-black text-white shadow-sm transition disabled:opacity-50 ${
              profile.avatar_url === null ? 'ring-4 ring-pink-300 ring-offset-2 dark:ring-pink-700 dark:ring-offset-gray-900' : 'hover:scale-105'
            }`}
          >
            {(profile.name ?? profile.email).charAt(0).toUpperCase()}
          </button>

          {PROFILE_AVATARS.map((avatar, index) => (
            <button
              key={avatar}
              type="button"
              onClick={() => void selectAvatar(avatar)}
              disabled={avatarSaving}
              aria-label={`Usar axolote ${index + 1}`}
              aria-pressed={profile.avatar_url === avatar}
              className={`aspect-square overflow-hidden rounded-full bg-white shadow-sm transition disabled:opacity-50 dark:bg-gray-800 ${
                profile.avatar_url === avatar ? 'ring-4 ring-pink-300 ring-offset-2 dark:ring-pink-700 dark:ring-offset-gray-900' : 'hover:scale-105'
              }`}
            >
              <Image src={avatar} alt="" width={96} height={96} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-pink-200 bg-white px-4 py-2 text-xs font-bold text-pink-700 shadow-sm transition hover:border-pink-300 hover:bg-pink-50 dark:border-pink-800 dark:bg-gray-900 dark:text-pink-300 dark:hover:bg-gray-800 ${avatarSaving ? 'pointer-events-none opacity-50' : ''}`}>
            {avatarSaving ? 'Salvando...' : 'Enviar minha foto'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={avatarSaving}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">JPG, PNG ou WebP — máximo 4 MB</span>
        </div>
      </section>

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
