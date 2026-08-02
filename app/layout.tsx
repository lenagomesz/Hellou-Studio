import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { UserActivityTracker } from '@/components/analytics/UserActivityTracker';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { absoluteUrl, safeJsonLd, SITE_URL } from '@/lib/seo';
import { getStoreSettings, storeThemeStyle } from '@/lib/store-settings';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const sora = Sora({
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.identity.name,
      template: `%s | ${settings.identity.name}`,
    },
    description: settings.seo.description,
    applicationName: settings.identity.name,
    authors: [{ name: settings.identity.name, url: SITE_URL }],
    creator: settings.identity.name,
    publisher: settings.identity.name,
    category: 'E-commerce',
    alternates: { canonical: '/' },
    icons: settings.identity.faviconUrl
      ? { icon: settings.identity.faviconUrl, apple: settings.identity.faviconUrl }
      : undefined,
    openGraph: {
      type: 'website',
      locale: settings.commerce.locale.replace('-', '_'),
      url: '/',
      siteName: settings.identity.name,
      title: settings.seo.title,
      description: settings.seo.description,
      images: settings.identity.socialImageUrl
        ? [{ url: settings.identity.socialImageUrl, alt: `Logo ${settings.identity.name}` }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seo.title,
      description: settings.seo.description,
      images: settings.identity.socialImageUrl ? [settings.identity.socialImageUrl] : [],
    },
    other: {
      lomadee: '2324685',
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getStoreSettings();
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.identity.name,
    url: SITE_URL,
    logo: absoluteUrl(settings.identity.faviconUrl || '/favicon-512.png'),
    sameAs: [settings.contact.instagram, settings.contact.tiktok].filter(Boolean),
  };

  return (
    <html
      lang={settings.commerce.locale}
      className={`${inter.variable} ${sora.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        style={storeThemeStyle(settings)}
        className="min-h-full flex flex-col font-sans antialiased bg-[var(--color-background)] text-[var(--color-foreground)]"
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }} />
        <ThemeProvider>
          <SessionProvider>
            <UserActivityTracker />
            {children}
            <CookieConsentBanner />
            <ToastProvider />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
