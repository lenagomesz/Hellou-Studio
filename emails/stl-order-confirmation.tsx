export const STLOrderConfirmationEmail = ({
  nome,
  orderId,
  fileName,
  price,
  baseUrl,
}: {
  nome: string | null;
  orderId: string;
  fileName: string;
  price: number;
  baseUrl: string;
}) => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ color: '#111' }}>Seu arquivo STL está pronto! 🎉</h2>
      <p style={{ color: '#555', lineHeight: '1.6' }}>
        Olá{nome ? `, ${nome}` : ''}! Seu pedido foi confirmado e seu arquivo está pronto para download.
      </p>

      <div style={{ margin: '20px 0', padding: '16px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
        <p style={{ margin: '0', fontWeight: '600', color: '#1E40AF' }}>
          📦 {fileName}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#3B82F6' }}>
          {formattedPrice}
        </p>
      </div>

      <a
        href={`${baseUrl}/account/orders/${orderId}`}
        style={{
          display: 'inline-block',
          margin: '24px 0',
          padding: '12px 24px',
          background: 'linear-gradient(to right, #ec4899, #f97316)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
        }}
      >
        Baixar meu arquivo
      </a>

      <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.5', marginTop: '20px' }}>
        Acesse sua conta a qualquer momento em <a href={`${baseUrl}/account/orders`} style={{ color: '#ec4899' }}>helloustudio</a> para re-baixar o arquivo.
      </p>
    </div>
  );
};
