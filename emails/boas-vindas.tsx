export const BoasVindasEmail = ({ nome, baseUrl }: { nome: string | null; baseUrl: string }) => {
  const greeting = nome ? `Olá, ${nome}!` : 'Olá!';

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ color: '#111', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
          Bem-vindo(a)! 🎉
        </h1>
        <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
          Sua conta foi criada com sucesso
        </p>
      </div>

      {/* Personal greeting */}
      <p style={{ color: '#555', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        {greeting} Agora você faz parte da comunidade HellouStudio! Estamos muito felizes em ter você conosco. ✨
      </p>

      {/* Welcome message */}
      <div style={{ margin: '24px 0', padding: '20px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#166534' }}>
          O que você encontrará aqui:
        </p>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#15803D', lineHeight: '1.8' }}>
          <li>Chaveiros personalizados impressos em 3D</li>
          <li>Itens de escritório exclusivos</li>
          <li>Criaturas e figuras únicas</li>
          <li>Arquivos STL para impressão própria</li>
        </ul>
      </div>

      {/* Features */}
      <div style={{ margin: '24px 0' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Por que nos escolher?
        </p>
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {[
            { icon: '🖨️', title: 'Impressão sob demanda', desc: 'Cada peça é produzida especialmente para você' },
            { icon: '💎', title: 'Qualidade premium', desc: 'Materiais de alta qualidade e acabamento impecável' },
            { icon: '🚀', title: 'Entrega rápida', desc: 'Produção em até 3 dias úteis' },
            { icon: '💬', title: 'Suporte dedicado', desc: 'Estamos sempre prontos para ajudar' },
          ].map((feature, idx) => (
            <div key={idx} style={{ marginBottom: idx < 3 ? '20px' : '0', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-32px', top: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#F3E8FF', color: '#9333EA', fontWeight: '600', fontSize: '12px' }}>
                {feature.icon}
              </div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{feature.title}</p>
              <p style={{ margin: '0', fontSize: '13px', color: '#888' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <a
        href={`${baseUrl}/products`}
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
        Explorar Catálogo
      </a>

      {/* Support links */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 12px 0', color: '#555', fontSize: '13px' }}>
          Dúvidas? Entre em contato pelo WhatsApp, estamos à disposição!
        </p>
        <p style={{ margin: '0', color: '#999', fontSize: '12px' }}>
          © helloustudio • Feito com ❤️ em 3D
        </p>
      </div>
    </div>
  );
};
