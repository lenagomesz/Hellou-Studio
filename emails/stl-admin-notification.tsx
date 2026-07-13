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
  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ color: '#111', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
          🎯 Novo pedido STL!
        </h1>
        <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
          {formattedDate}
        </p>
      </div>

      {/* Order info */}
      <div style={{ margin: '16px 0', padding: '20px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ margin: '0', fontWeight: '600', color: '#166534', fontSize: '16px' }}>
            Pedido #{orderId.slice(0, 8).toUpperCase()}
          </p>
          <span style={{ display: 'inline-block', padding: '4px 12px', background: '#DBEAFE', color: '#1E40AF', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
            📁 Arquivo STL
          </span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '18px', color: '#15803D', fontWeight: '700' }}>
          {formattedPrice}
        </p>
      </div>

      {/* Customer info */}
      <div style={{ margin: '20px 0', padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Dados do cliente
        </p>
        <p style={{ color: '#374151', fontSize: '14px', margin: '4px 0' }}>
          <strong>Nome:</strong> {customerName ?? 'N/A'}
        </p>
        <p style={{ color: '#374151', fontSize: '14px', margin: '4px 0' }}>
          <strong>Email:</strong> {customerEmail}
        </p>
        <p style={{ color: '#374151', fontSize: '14px', margin: '4px 0' }}>
          <strong>Arquivo:</strong> {fileName}
        </p>
      </div>

      {/* Auto-processed notice */}
      <div style={{ margin: '20px 0', padding: '12px', background: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
        <p style={{ margin: '0', fontSize: '13px', color: '#065F46', fontWeight: '600' }}>
          ⚡ Este pedido foi processado automaticamente
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#047857' }}>
          O arquivo já foi entregue ao cliente. Nenhuma ação necessária.
        </p>
      </div>

      {/* CTA */}
      <a
        href={`${baseUrl}/dashboard/orders/${orderId}`}
        style={{
          display: 'inline-block',
          margin: '24px 0 16px',
          padding: '14px 28px',
          background: 'linear-gradient(to right, #ec4899, #f97316)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Ver no painel
      </a>

      {/* Footer */}
      <p style={{ color: '#9CA3AF', fontSize: '12px', margin: '16px 0 0' }}>
        Sistema de pedidos HellouStudio • Pedido automático
      </p>
    </div>
  );
};
