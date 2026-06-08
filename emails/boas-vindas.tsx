import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BoasVindasEmailProps {
  nome: string | null;
  baseUrl: string;
}

export function BoasVindasEmail({ nome, baseUrl }: BoasVindasEmailProps) {
  const greeting = nome ? `Olá, ${nome}!` : 'Olá!';

  return (
    <Html>
      <Head />
      <Preview>Bem-vindo(a) à helloustudio — produtos 3D únicos feitos sob demanda</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Text style={brand}>helloustudio</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{greeting}</Heading>
            <Text style={paragraph}>
              Sua conta foi criada com sucesso. Agora você faz parte da nossa comunidade de produtos impressos em 3D, feitos sob demanda com carinho e qualidade premium.
            </Text>
            <Text style={paragraph}>
              Explore nosso catálogo de chaveiros, itens de escritório e criaturas únicas — cada peça é produzida especialmente para você.
            </Text>
            <Section style={buttonSection}>
              <Button style={button} href={`${baseUrl}/products`}>
                Explorar Catálogo
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
  margin: '0 0 16px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '24px 0 8px',
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
