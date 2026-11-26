import Image from 'next/image';

type ShopImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Largura renderizada, para o navegador escolher o tamanho certo. */
  sizes: string;
  loading?: 'eager' | 'lazy';
};

// Origens que next.config.ts autoriza para o otimizador de imagens.
// Qualquer outra URL (ex.: link colado no admin) continua como <img> comum
// para nunca quebrar um card por causa de domínio não liberado.
function canOptimize(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return !src.endsWith('.svg');
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && /\.supabase\.(co|in)$/.test(url.hostname) && !url.pathname.endsWith('.svg');
  } catch {
    return false;
  }
}

/**
 * Imagem que preenche o contêiner pai (que deve ser `relative`).
 * Entrega WebP redimensionado em vez do PNG original de ~2 MB.
 */
export function ShopImage({ src, alt, className, sizes, loading = 'lazy' }: ShopImageProps) {
  if (canOptimize(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} loading={loading} decoding="async" className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={loading} decoding="async" className={className} />
  );
}
