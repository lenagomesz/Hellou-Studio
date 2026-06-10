import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';
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

export const metadata: Metadata = {
  title: 'Hellou Studio',
  description:
    'Marketplace de produtos impressos em 3D. Chaveiros, escritório e criaturas feitas sob demanda.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <SessionProvider>
          {children}
          <ToastProvider />
        </SessionProvider>
      </body>
    </html>
  );
}
