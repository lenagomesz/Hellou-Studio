import type { Metadata, Viewport } from 'next';
import { Inter, Sora } from 'next/font/google';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { PWAInstaller } from '@/components/PWAInstaller';
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
  title: 'Hellou Studio',
  description:
    'Marketplace de produtos impressos em 3D. Chaveiros, escritório e criaturas feitas sob demanda.',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sora.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans antialiased bg-[var(--color-background)] text-[var(--color-foreground)]">
        <ThemeProvider>
          <SessionProvider>
            <PWAInstaller />
            {children}
            <ToastProvider />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
