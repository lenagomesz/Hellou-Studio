import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

interface PedidoConfirmadoEmailProps {
  nome: string | null;
  pedidoId: string;
  total: number;
  itens: Array<{ nome: string; quantidade: number; precoUnitario: number }>;
  baseUrl: string;
}

export function PedidoConfirmadoEmail({
  nome,
  pedidoId,
  total,
  itens,
  baseUrl,
}: PedidoConfirmadoEmailProps) {
  const shortId = pedidoId.slice(0, 8).toUpperCase();
  const greeting = nome ? `Olá, ${nome}!` : 'Olá!';

  return (
    <Html>
      <Head />
      <Preview>Pedido #{shortId} confirmado — helloustudio</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={brand}>helloustudio</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{greeting}</Heading>
            <Text style={paragraph}>
              Seu pedido <strong>#{shortId}</strong> foi confirmado! Já estamos preparando tudo com carinho.
            </Text>

            <Section style={tableContainer}>
              <Row style={tableHeader}>
                <Column style={colItem}>Item</Column>
                <Column style={colQty}>Qtd</Column>
                <Column style={colPrice}>Preço</Column>
              </Row>
              {itens.map((item, i) => (
                <Row key={i} style={tableRow}>
                  <Column style={colItem}>
                    <Text style={itemName}>{item.nome}</Text>
                  </Column>
                  <Column style={colQty}>
                    <Text style={itemText}>{item.quantidade}</Text>
                  </Column>
                  <Column style={colPrice}>
                    <Text style={itemText}>
                      {formatBRL(item.precoUnitario * item.quantidade)}
                    </Text>
                  </Column>
                </Row>
              ))}
              <Hr style={tableHr} />
              <Row>
                <Column style={colItem}>
                  <Text style={totalLabel}>Total</Text>
                </Column>
                <Column style={colQty} />
                <Column style={colPrice}>
                  <Text style={totalValue}>{formatBRL(total)}</Text>
                </Column>
              </Row>
            </Section>

            <Section style={buttonSection}>
              <Button style={button} href={`${baseUrl}/account/orders/${pedidoId}`}>
                Ver meu pedido
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            helloustudio — Produtos 3D únicos, feitos sob demanda.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const headerSection = {
  textAlign: 'center' as const,
  padding: '32px 0 24px',
};

const brand = {
  fontSize: '28px',
  fontWeight: '700',
  background: 'linear-gradient(to right, #ec4899, #f97316)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  margin: '0',
};

const content = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '32px',
  border: '1px solid #e5e7eb',
};

const heading = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#4b5563',
  margin: '0 0 20px',
};

const tableContainer = {
  margin: '16px 0',
};

const tableHeader = {
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: '8px',
  marginBottom: '8px',
};

const tableRow = {
  borderBottom: '1px solid #f3f4f6',
};

const colItem = { width: '60%' };
const colQty = { width: '15%', textAlign: 'center' as const };
const colPrice = { width: '25%', textAlign: 'right' as const };

const itemName = {
  fontSize: '14px',
  color: '#374151',
  margin: '8px 0',
};

const itemText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '8px 0',
};

const tableHr = {
  borderColor: '#e5e7eb',
  margin: '8px 0',
};

const totalLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  margin: '8px 0',
};

const totalValue = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  margin: '8px 0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '28px 0 8px',
};

const button = {
  backgroundColor: '#ec4899',
  borderRadius: '9999px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 28px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0 16px',
};

const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  textAlign: 'center' as const,
};
