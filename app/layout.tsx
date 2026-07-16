import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { UserActivityTracker } from '@/components/analytics/UserActivityTracker';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { absoluteUrl, safeJsonLd, SITE_NAME, SITE_URL } from '@/lib/seo';
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Hellou Studio',
    template: '%s | Hellou Studio',
  },
  description: 'Produtos personalizados impressos em 3D, peças feitas sob demanda e arquivos STL prontos para imprimir.',
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Impressão 3D',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: SITE_NAME,
    title: 'Hellou Studio | Impressão 3D e arquivos STL',
    description: 'Produtos personalizados impressos em 3D, peças feitas sob demanda e arquivos STL prontos para imprimir.',
    images: [{ url: '/icon', width: 512, height: 512, alt: 'Hellou Studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hellou Studio | Impressão 3D e arquivos STL',
    description: 'Produtos personalizados impressos em 3D, peças feitas sob demanda e arquivos STL prontos para imprimir.',
    images: ['/icon'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon'),
    sameAs: ['https://instagram.com/helloustudio_', 'https://www.tiktok.com/@helloustudio_'],
  };

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sora.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans antialiased bg-[var(--color-background)] text-[var(--color-foreground)]">
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
