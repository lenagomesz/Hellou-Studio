import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Peça uma impressão 3D personalizada',
  description: 'Envie uma imagem, arquivo STL ou link de referência para receber análise de viabilidade, licença e orçamento de impressão 3D.',
  alternates: { canonical: '/request-print' },
};

export default function RequestPrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
