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
  const shipping = objectValue(root.shipping);
  const payments = objectValue(root.payments);
  const email = objectValue(root.email);
  const fiscal = objectValue(root.fiscal);
  const navigation = objectValue(root.navigation);
  const rawSlides = Array.isArray(home.heroSlides) ? home.heroSlides.slice(0, 8) : DEFAULT_STORE_SETTINGS.home.heroSlides;
  const rawCollections = Array.isArray(home.collections) ? home.collections.slice(0, 12) : DEFAULT_STORE_SETTINGS.home.collections;

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
      collections: rawCollections.map((rawCollection, index) => {
        const collection = objectValue(rawCollection);
        const fallback = DEFAULT_STORE_SETTINGS.home.collections[index] ?? {
          id: `collection-${index + 1}`,
          name: 'Nova coleção',
          description: 'Conheça os produtos desta coleção.',
          emoji: '✨',
          imageUrl: '',
          imageOnly: false,
          productIds: [],
          active: true,
        };
        const productIds = Array.isArray(collection.productIds) ? collection.productIds : fallback.productIds;
        return {
          id: optionalText(collection.id, fallback.id, 60).replace(/[^a-zA-Z0-9_-]/g, '-') || `collection-${index + 1}`,
          name: textValue(collection.name, fallback.name, 60),
          description: textValue(collection.description, fallback.description, 180),
          emoji: textValue(collection.emoji, fallback.emoji, 12),
          imageUrl: urlValue(collection.imageUrl, fallback.imageUrl),
          imageOnly: typeof collection.imageOnly === 'boolean' ? collection.imageOnly : fallback.imageOnly,
          productIds: productIds.slice(0, 100).filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)),
          active: typeof collection.active === 'boolean' ? collection.active : true,
        };
      }),
    },
    shipping: {
      originCep: optionalText(shipping.originCep, DEFAULT_STORE_SETTINGS.shipping.originCep, 9).replace(/\D/g, '').slice(0, 8) || DEFAULT_STORE_SETTINGS.shipping.originCep,
      pacEnabled: typeof shipping.pacEnabled === 'boolean' ? shipping.pacEnabled : DEFAULT_STORE_SETTINGS.shipping.pacEnabled,
      sedexEnabled: typeof shipping.sedexEnabled === 'boolean' ? shipping.sedexEnabled : DEFAULT_STORE_SETTINGS.shipping.sedexEnabled,
      pickupEnabled: typeof shipping.pickupEnabled === 'boolean' ? shipping.pickupEnabled : DEFAULT_STORE_SETTINGS.shipping.pickupEnabled,
      pickupName: textValue(shipping.pickupName, DEFAULT_STORE_SETTINGS.shipping.pickupName, 80),
      pickupNotice: textValue(shipping.pickupNotice, DEFAULT_STORE_SETTINGS.shipping.pickupNotice, 400),
      defaultWeightGrams: numberValue(shipping.defaultWeightGrams, DEFAULT_STORE_SETTINGS.shipping.defaultWeightGrams, 1, 30000),
      defaultLengthCm: numberValue(shipping.defaultLengthCm, DEFAULT_STORE_SETTINGS.shipping.defaultLengthCm, 1, 100),
      defaultWidthCm: numberValue(shipping.defaultWidthCm, DEFAULT_STORE_SETTINGS.shipping.defaultWidthCm, 1, 100),
      defaultHeightCm: numberValue(shipping.defaultHeightCm, DEFAULT_STORE_SETTINGS.shipping.defaultHeightCm, 1, 100),
    },
    payments: {
      pixEnabled: typeof payments.pixEnabled === 'boolean' ? payments.pixEnabled : DEFAULT_STORE_SETTINGS.payments.pixEnabled,
      cardEnabled: typeof payments.cardEnabled === 'boolean' ? payments.cardEnabled : DEFAULT_STORE_SETTINGS.payments.cardEnabled,
      maxInstallments: numberValue(payments.maxInstallments, DEFAULT_STORE_SETTINGS.payments.maxInstallments, 1, 24),
      invoiceRequestEnabled: typeof payments.invoiceRequestEnabled === 'boolean' ? payments.invoiceRequestEnabled : DEFAULT_STORE_SETTINGS.payments.invoiceRequestEnabled,
    },
    email: {
      senderName: textValue(email.senderName, DEFAULT_STORE_SETTINGS.email.senderName, 80),
      senderEmail: optionalText(email.senderEmail, DEFAULT_STORE_SETTINGS.email.senderEmail, 160),
      replyTo: optionalText(email.replyTo, DEFAULT_STORE_SETTINGS.email.replyTo, 160),
      footerText: textValue(email.footerText, DEFAULT_STORE_SETTINGS.email.footerText, 300),
    },
    fiscal: {
      mode: fiscal.mode === 'provider' ? 'provider' : 'manual',
      provider: optionalText(fiscal.provider, DEFAULT_STORE_SETTINGS.fiscal.provider, 80),
      legalName: optionalText(fiscal.legalName, DEFAULT_STORE_SETTINGS.fiscal.legalName, 160),
      document: optionalText(fiscal.document, DEFAULT_STORE_SETTINGS.fiscal.document, 30),
      municipalRegistration: optionalText(fiscal.municipalRegistration, DEFAULT_STORE_SETTINGS.fiscal.municipalRegistration, 40),
      stateRegistration: optionalText(fiscal.stateRegistration, DEFAULT_STORE_SETTINGS.fiscal.stateRegistration, 40),
    },
    navigation: {
      links: (Array.isArray(navigation.links) ? navigation.links : DEFAULT_STORE_SETTINGS.navigation.links).slice(0, 12).map((rawLink, index) => {
        const link = objectValue(rawLink);
        const fallback = DEFAULT_STORE_SETTINGS.navigation.links[index] ?? { id: `link-${index + 1}`, label: 'Link', href: '/', active: true };
        const href = optionalText(link.href, fallback.href, 300);
        return {
          id: optionalText(link.id, fallback.id, 60).replace(/[^a-zA-Z0-9_-]/g, '-') || `link-${index + 1}`,
          label: textValue(link.label, fallback.label, 40),
          href: href.startsWith('/') ? href : fallback.href,
          active: typeof link.active === 'boolean' ? link.active : true,
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

const getCachedStoreSettings = unstable_cache(
  loadStoreSettings,
  ['store-settings-v2'],
  { tags: ['store-settings'], revalidate: 300 },
);

export async function getStoreSettings() {
  // `unstable_cache` depends on Next's request/cache runtime, which is not
  // available when route handlers are executed directly by Vitest.
  if (process.env.NODE_ENV === 'test') {
    return loadStoreSettings();
  }
  return getCachedStoreSettings();
}
