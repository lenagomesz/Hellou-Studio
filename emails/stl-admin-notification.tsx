export const STLAdminNotificationEmail = ({
  orderId,
  customerName,
  customerEmail,
  fileName,
  price,
  baseUrl,
}: {
  orderId: string;
  customerName: string | null;
  customerEmail: string;
  fileName: string;
  price: number;
  baseUrl: string;
}) => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ color: '#111' }}>Novo pedido de arquivo STL! 🎯</h2>

      <div style={{ margin: '16px 0', padding: '16px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
        <p style={{ margin: '0', fontWeight: '600', color: '#166534' }}>
          Pedido #{orderId.slice(0, 8).toUpperCase()}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#15803D' }}>
          {formattedPrice} — Arquivo digital (auto-entregue)
        </p>
      </div>

      <p style={{ color: '#555', fontSize: '14px', marginTop: '16px' }}>
        <strong>Cliente:</strong> {customerName ?? 'N/A'}<br/>
        <strong>Email:</strong> {customerEmail}<br/>
        <strong>Arquivo:</strong> {fileName}
      </p>

      <p style={{ color: '#666', fontSize: '13px', marginTop: '16px', fontStyle: 'italic' }}>
        ✓ Este pedido foi processado automaticamente. Nenhuma ação necessária.
      </p>

      <a
        href={`${baseUrl}/dashboard/orders/${orderId}`}
        style={{
          display: 'inline-block',
          margin: '16px 0',
          padding: '12px 24px',
          background: 'linear-gradient(to right, #ec4899, #f97316)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
        }}
      >
        Ver no painel
      </a>
    </div>
  );
};
