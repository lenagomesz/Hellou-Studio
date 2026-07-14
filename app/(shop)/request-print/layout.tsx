import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solicite uma impressão 3D personalizada',
  description: 'Envie seu arquivo STL ou conte sua ideia para receber uma análise e um orçamento personalizado de impressão 3D.',
  alternates: { canonical: '/request-print' },
};

export default function RequestPrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
