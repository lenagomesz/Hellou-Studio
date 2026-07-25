import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/store-settings-schema';
export { DEFAULT_STORE_SETTINGS, getWhatsAppUrl, storeThemeStyle, type StoreSettings } from '@/lib/store-settings-schema';

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown, fallback: string, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || fallback : fallback;
}

function optionalText(value: unknown, fallback: string, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function colorValue(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

function urlValue(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed.slice(0, 500);
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().slice(0, 500) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeStoreSettings(input: unknown): StoreSettings {
  const root = objectValue(input);
  const identity = objectValue(root.identity);
  const theme = objectValue(root.theme);
  const contact = objectValue(root.contact);
  const commerce = objectValue(root.commerce);
  const seo = objectValue(root.seo);
  const home = objectValue(root.home);
  const rawSlides = Array.isArray(home.heroSlides) ? home.heroSlides.slice(0, 8) : DEFAULT_STORE_SETTINGS.home.heroSlides;

  return {
    identity: {
      name: textValue(identity.name, DEFAULT_STORE_SETTINGS.identity.name, 80),
      shortName: textValue(identity.shortName, DEFAULT_STORE_SETTINGS.identity.shortName, 40),
      tagline: textValue(identity.tagline, DEFAULT_STORE_SETTINGS.identity.tagline, 180),
      description: textValue(identity.description, DEFAULT_STORE_SETTINGS.identity.description, 500),
      logoUrl: urlValue(identity.logoUrl, DEFAULT_STORE_SETTINGS.identity.logoUrl),
      logoDarkUrl: urlValue(identity.logoDarkUrl, DEFAULT_STORE_SETTINGS.identity.logoDarkUrl),
      faviconUrl: urlValue(identity.faviconUrl, DEFAULT_STORE_SETTINGS.identity.faviconUrl),
      socialImageUrl: urlValue(identity.socialImageUrl, DEFAULT_STORE_SETTINGS.identity.socialImageUrl),
    },
    theme: {
      primary: colorValue(theme.primary, DEFAULT_STORE_SETTINGS.theme.primary),
      secondary: colorValue(theme.secondary, DEFAULT_STORE_SETTINGS.theme.secondary),
      accent: colorValue(theme.accent, DEFAULT_STORE_SETTINGS.theme.accent),
      background: colorValue(theme.background, DEFAULT_STORE_SETTINGS.theme.background),
      foreground: colorValue(theme.foreground, DEFAULT_STORE_SETTINGS.theme.foreground),
      radius: numberValue(theme.radius, DEFAULT_STORE_SETTINGS.theme.radius, 4, 32),
    },
    contact: {
      email: optionalText(contact.email, DEFAULT_STORE_SETTINGS.contact.email, 160),
      phone: optionalText(contact.phone, DEFAULT_STORE_SETTINGS.contact.phone, 30),
      whatsapp: optionalText(contact.whatsapp, DEFAULT_STORE_SETTINGS.contact.whatsapp, 20).replace(/\D/g, ''),
      whatsappMessage: textValue(contact.whatsappMessage, DEFAULT_STORE_SETTINGS.contact.whatsappMessage, 500),
      instagram: urlValue(contact.instagram, DEFAULT_STORE_SETTINGS.contact.instagram),
      tiktok: urlValue(contact.tiktok, DEFAULT_STORE_SETTINGS.contact.tiktok),
    },
    commerce: {
      currency: textValue(commerce.currency, DEFAULT_STORE_SETTINGS.commerce.currency, 3).toUpperCase(),
      locale: textValue(commerce.locale, DEFAULT_STORE_SETTINGS.commerce.locale, 15),
      timezone: textValue(commerce.timezone, DEFAULT_STORE_SETTINGS.commerce.timezone, 60),
      freeShippingThreshold: numberValue(commerce.freeShippingThreshold, DEFAULT_STORE_SETTINGS.commerce.freeShippingThreshold, 0, 100000),
      firstOrderDiscount: numberValue(commerce.firstOrderDiscount, DEFAULT_STORE_SETTINGS.commerce.firstOrderDiscount, 0, 100),
    },
    seo: {
      title: textValue(seo.title, DEFAULT_STORE_SETTINGS.seo.title, 70),
      description: textValue(seo.description, DEFAULT_STORE_SETTINGS.seo.description, 180),
    },
    home: {
      heroAutoplaySeconds: numberValue(home.heroAutoplaySeconds, DEFAULT_STORE_SETTINGS.home.heroAutoplaySeconds, 3, 20),
      heroSlides: rawSlides.map((rawSlide, index) => {
        const slide = objectValue(rawSlide);
        const fallback = DEFAULT_STORE_SETTINGS.home.heroSlides[index] ?? DEFAULT_STORE_SETTINGS.home.heroSlides[0];
        const rawTrust = Array.isArray(slide.trust) ? slide.trust : fallback.trust;
        const href = optionalText(slide.href, fallback.href, 300);
        return {
          id: optionalText(slide.id, `slide-${index + 1}`, 60).replace(/[^a-zA-Z0-9_-]/g, '-') || `slide-${index + 1}`,
          badge: textValue(slide.badge, fallback.badge, 100),
          accent: textValue(slide.accent, fallback.accent, 80),
          title: textValue(slide.title, fallback.title, 100),
          description: textValue(slide.description, fallback.description, 350),
          action: textValue(slide.action, fallback.action, 60),
          href: href.startsWith('/') ? href : fallback.href,
          trust: rawTrust.slice(0, 3).map((item, trustIndex) => textValue(item, fallback.trust[trustIndex] ?? 'Compra segura', 80)),
          active: typeof slide.active === 'boolean' ? slide.active : true,
        };
      }),
    },
  };
}

async function loadStoreSettings() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('store_settings')
      .select('settings')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return DEFAULT_STORE_SETTINGS;
    return normalizeStoreSettings(data.settings);
  } catch {
    // Keeps older installations working until the migration is applied.
    return DEFAULT_STORE_SETTINGS;
  }
}

export const getStoreSettings = unstable_cache(
  loadStoreSettings,
  ['store-settings'],
  { tags: ['store-settings'], revalidate: 300 },
);
