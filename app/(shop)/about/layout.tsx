import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre a Hellou Studio',
  description: 'Conheça a Hellou Studio e nossa forma de transformar ideias em produtos por meio da impressão 3D.',
  alternates: { canonical: '/about' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
