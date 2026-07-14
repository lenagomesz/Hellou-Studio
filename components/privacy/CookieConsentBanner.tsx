'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cookie, Settings2, ShieldCheck, X } from 'lucide-react';
import { OPEN_PRIVACY_EVENT, PRIVACY_CHANGED_EVENT, type PrivacyConsent } from '@/lib/privacy';

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<PrivacyConsent | null | undefined>(undefined);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedConsentRef = useRef<PrivacyConsent | null>(null);

  const openSettings = useCallback(() => {
    setCustomizing(true);
    setConsent(null);
  }, []);

  useEffect(() => {
    void fetch('/api/privacy', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: { consent?: PrivacyConsent | null }) => {
        const current = payload.consent ?? null;
        savedConsentRef.current = current;
        setConsent(current);
        setAnalytics(current?.analytics ?? false);
        setMarketing(current?.marketing ?? false);
      })
      .catch(() => setConsent(null));

    window.addEventListener(OPEN_PRIVACY_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_PRIVACY_EVENT, openSettings);
  }, [openSettings]);

  async function save(nextAnalytics: boolean, nextMarketing: boolean) {
    setSaving(true);
    try {
      const response = await fetch('/api/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics: nextAnalytics, marketing: nextMarketing }),
      });
      if (!response.ok) return;
      const payload = await response.json() as { consent: PrivacyConsent };
      savedConsentRef.current = payload.consent;
      setConsent(payload.consent);
      setAnalytics(payload.consent.analytics);
      setMarketing(payload.consent.marketing);
      setCustomizing(false);
      window.dispatchEvent(new CustomEvent(PRIVACY_CHANGED_EVENT, { detail: payload.consent }));
    } finally {
      setSaving(false);
    }
  }

  if (consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-2xl shadow-gray-900/20 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex gap-3 p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300"><Cookie className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="privacy-title" className="font-display text-base font-bold text-gray-950 dark:text-white">Sua privacidade, suas escolhas</h2>
                <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">Usamos recursos necessários para a loja funcionar. Com sua permissão, também entendemos a navegação e personalizamos comunicações.</p>
              </div>
              {customizing && <button type="button" onClick={() => { setCustomizing(false); setConsent(savedConsentRef.current); }} aria-label="Fechar preferências" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>}
            </div>

            {customizing && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Preference label="Necessários" description="Login, segurança, tema e carrinho." checked disabled onChange={() => undefined} />
                <Preference label="Análise" description="Ajuda a melhorar páginas e produtos." checked={analytics} onChange={setAnalytics} />
                <Preference label="Personalização" description="Conteúdo e comunicações relevantes." checked={marketing} onChange={setMarketing} />
              </div>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Link href="/terms#privacidade" className="mr-auto inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-gray-500 hover:text-pink-600 dark:text-gray-400"><ShieldCheck className="h-3.5 w-3.5" />Política de privacidade</Link>
              {!customizing && <button type="button" onClick={() => setCustomizing(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-pink-200 dark:border-gray-700 dark:text-gray-200"><Settings2 className="h-4 w-4" />Personalizar</button>}
              <button type="button" disabled={saving} onClick={() => void save(customizing ? analytics : false, customizing ? marketing : false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-pink-200 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200">Somente necessários</button>
              <button type="button" disabled={saving} onClick={() => void save(customizing ? analytics : true, customizing ? marketing : true)} className="rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-60">{customizing ? 'Salvar escolhas' : 'Aceitar todos'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Preference({ label, description, checked, disabled = false, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/70">
      <span><span className="block text-xs font-bold text-gray-900 dark:text-white">{label}</span><span className="mt-0.5 block text-[11px] leading-4 text-gray-500 dark:text-gray-400">{description}</span></span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-pink-500" />
    </label>
  );
}
