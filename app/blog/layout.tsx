import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Hellou Studio',
  description: 'Descobra ideias de decoração, design e organização com Hellou Studio',
  openGraph: {
    title: 'Blog | Hellou Studio',
    description: 'Descubra ideias de decoração, design e organização com Hellou Studio',
    url: 'https://helloustudio.com.br/blog',
    siteName: 'Hellou Studio',
    type: 'website',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
