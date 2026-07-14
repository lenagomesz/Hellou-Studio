'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif', background: '#f8fafc', color: '#0f172a' }}>
          <section style={{ width: '100%', maxWidth: 480, padding: 32, border: '1px solid #e2e8f0', borderRadius: 24, background: '#fff', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#db2777', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>Hellou Studio</p>
            <h1 style={{ margin: '14px 0 8px', fontSize: 26 }}>Algo deu errado</h1>
            <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>O erro já foi registrado. Tente carregar a página novamente.</p>
            <button type="button" onClick={reset} style={{ marginTop: 24, border: 0, borderRadius: 12, padding: '12px 20px', background: 'linear-gradient(90deg,#ec4899,#f97316)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Tentar novamente</button>
          </section>
        </main>
      </body>
    </html>
  );
}
