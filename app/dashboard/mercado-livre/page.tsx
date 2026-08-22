import { MercadoLivreSync } from '../components/MercadoLivreSync';

export const metadata = {
  title: 'Mercado Livre - Sincronização',
};

export default function MercadoLivrePage() {
  return (
    <div className="space-y-6">
      <MercadoLivreSync />
    </div>
  );
}
