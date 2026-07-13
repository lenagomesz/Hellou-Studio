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
  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ color: '#111', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
          Arquivo Disponível! 🎉
        </h1>
        <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
          Pedido #{orderId.slice(0, 8).toUpperCase()} • {formattedDate}
        </p>
      </div>

      {/* Personal greeting */}
      <p style={{ color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Olá{nome ? `, ${nome}` : ''}! Seu arquivo STL está pronto para download imediato! 🚀
      </p>

      {/* File info */}
      <div style={{ margin: '24px 0', padding: '20px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Arquivo adquirido
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#1E40AF' }}>
          📦 {fileName}
        </p>
        <p style={{ margin: '0', fontSize: '16px', color: '#3B82F6', fontWeight: '600' }}>
          {formattedPrice}
        </p>
      </div>

      {/* What you can do */}
      <div style={{ margin: '24px 0' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          O que você pode fazer:
        </p>
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {[
            { icon: '📥', title: 'Baixar agora', desc: 'Seu arquivo está disponível imediatamente' },
            { icon: '🖨️', title: 'Imprimir em casa', desc: 'Use sua impressora 3D ou serviço local' },
            { icon: '💾', title: 'Re-baixar sempre', desc: 'Acesse sua conta para baixar novamente' },
            { icon: '💬', title: 'Suporte', desc: 'Precisa de ajuda? Estamos à disposição' },
          ].map((step, idx) => (
            <div key={idx} style={{ marginBottom: idx < 3 ? '20px' : '0', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-32px', top: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: '600', fontSize: '12px' }}>
                {step.icon}
              </div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{step.title}</p>
              <p style={{ margin: '0', fontSize: '13px', color: '#888' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <a
        href={`${baseUrl}/account/orders/${orderId}`}
        style={{
          display: 'inline-block',
          margin: '32px 0 24px 0',
          padding: '14px 28px',
          background: 'linear-gradient(to right, #ec4899, #f97316)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Baixar meu arquivo
      </a>

      {/* Support links */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 12px 0', color: '#555', fontSize: '13px' }}>
          Dúvidas sobre o arquivo? Entre em contato pelo WhatsApp!
        </p>
        <p style={{ margin: '0', color: '#999', fontSize: '12px' }}>
          © helloustudio • Feito com ❤️ em 3D
        </p>
      </div>
    </div>
  );
};
