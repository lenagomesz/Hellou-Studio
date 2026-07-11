export const PedidoConfirmadoEmail = ({
  nome,
  pedidoId,
  total,
  itens,
  baseUrl,
}: {
  nome: string | null;
  pedidoId: string;
  total: number;
  itens: Array<{ nome: string; quantidade: number; precoUnitario: number }>;
  baseUrl: string;
}) => {
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ color: '#111', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
          Pedido Confirmado! 🎉
        </h1>
        <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
          Pedido #{pedidoId.slice(0, 8).toUpperCase()} • {formattedDate}
        </p>
      </div>

      {/* Personal greeting */}
      <p style={{ color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Olá{nome ? `, ${nome}` : ''}! Seu pedido foi confirmado e está sendo preparado com muito carinho. ✨
      </p>

      {/* Items */}
      <div style={{ margin: '24px 0', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Itens do pedido
        </p>
        {itens.map((item, idx) => (
          <div key={idx} style={{ marginBottom: idx < itens.length - 1 ? '16px' : '0', paddingBottom: idx < itens.length - 1 ? '16px' : '0', borderBottom: idx < itens.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <p style={{ color: '#1f2937', fontWeight: '600', margin: '0', flex: '1' }}>{item.nome}</p>
              <p style={{ color: '#1f2937', fontWeight: '600', margin: '0 0 0 12px', whiteSpace: 'nowrap' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario * item.quantidade)}
              </p>
            </div>
            <p style={{ color: '#888', margin: '0', fontSize: '13px' }}>
              Quantidade: {item.quantidade} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ margin: '24px 0', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#666', marginBottom: '8px' }}>TOTAL DO PEDIDO</p>
        <p style={{ margin: '0', fontSize: '20px', fontWeight: '700', color: '#15803d' }}>
          {formattedTotal}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ margin: '24px 0' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Próximas etapas
        </p>
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {[
            { icon: '✓', title: 'Pagamento confirmado', desc: 'Seu pagamento foi processado com sucesso.' },
            { icon: '🖨️', title: 'Produção', desc: 'Sua peça será impressa em até 3 dias úteis.' },
            { icon: '📦', title: 'Envio', desc: 'Você receberá o código de rastreamento por email.' },
            { icon: '✅', title: 'Entrega', desc: 'Sua peça chegará com segurança.' },
          ].map((step, idx) => (
            <div key={idx} style={{ marginBottom: idx < 3 ? '24px' : '0', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-32px', top: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: idx === 0 ? '#15803d' : '#e5e7eb', color: idx === 0 ? '#fff' : '#666', fontWeight: '600', fontSize: '12px' }}>
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
        href={`${baseUrl}/account/orders/${pedidoId}`}
        style={{
          display: 'inline-block',
          margin: '32px 0 24px 0',
          padding: '12px 24px',
          background: 'linear-gradient(to right, #ec4899, #f97316)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Acompanhe seu pedido
      </a>

      {/* Support links */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 12px 0', color: '#555', fontSize: '13px' }}>
          Dúvidas? Acesse sua conta em <a href={`${baseUrl}/account/orders`} style={{ color: '#ec4899', textDecoration: 'none' }}>helloustudio</a> para mais detalhes.
        </p>
        <p style={{ margin: '0', color: '#999', fontSize: '12px' }}>
          © helloustudio • Feito com ❤️ em 3D
        </p>
      </div>
    </div>
  );
};
