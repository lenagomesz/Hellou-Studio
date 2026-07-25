import type { CSSProperties } from 'react';

export interface StoreSettings {
  identity: {
    name: string;
    shortName: string;
    tagline: string;
    description: string;
    logoUrl: string;
    logoDarkUrl: string;
    faviconUrl: string;
    socialImageUrl: string;
  };
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    radius: number;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    whatsappMessage: string;
    instagram: string;
    tiktok: string;
  };
  commerce: {
    currency: string;
    locale: string;
    timezone: string;
    freeShippingThreshold: number;
    firstOrderDiscount: number;
  };
  seo: {
    title: string;
    description: string;
  };
  home: {
    heroAutoplaySeconds: number;
    heroSlides: Array<{
      id: string;
      badge: string;
      accent: string;
      title: string;
      description: string;
      action: string;
      href: string;
      trust: string[];
      active: boolean;
    }>;
  };
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  identity: {
    name: 'Hellou Studio',
    shortName: 'helloustudio',
    tagline: 'Objetos cheios de personalidade, feitos camada por camada.',
    description: 'Produtos e arquivos para impressão 3D, criados com carinho, personalidade e cuidado em cada camada.',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '/favicon-512.png',
    socialImageUrl: '/favicon-512.png',
  },
  theme: {
    primary: '#EC4899',
    secondary: '#F97316',
    accent: '#DB2777',
    background: '#FFFFFF',
    foreground: '#211D25',
    radius: 16,
  },
  contact: {
    email: 'studiohellou@gmail.com',
    phone: '',
    whatsapp: '5547988450461',
    whatsappMessage: 'Olá, Hellou Studio! 👋 Vim pelo site e gostaria de tirar uma dúvida. Podem me ajudar?',
    instagram: 'https://instagram.com/helloustudio_',
    tiktok: 'https://www.tiktok.com/@helloustudio_',
  },
  commerce: {
    currency: 'BRL',
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    freeShippingThreshold: 99,
    firstOrderDiscount: 10,
  },
  seo: {
    title: 'Hellou Studio | Impressão 3D e arquivos STL',
    description: 'Produtos personalizados impressos em 3D, peças feitas sob demanda e arquivos STL prontos para imprimir.',
  },
  home: {
    heroAutoplaySeconds: 6,
    heroSlides: [
      { id: 'catalogo', badge: 'Novidades toda semana', accent: 'Produtos Únicos', title: 'Fabricados em 3D', description: 'Descubra uma coleção exclusiva de chaveiros, itens de escritório e criaturas fofas, todos impressos sob demanda com a sua cara.', action: 'Explorar Catálogo', href: '/products', trust: ['Atendimento humanizado', 'Bom acabamento', 'Pagamento seguro'], active: true },
      { id: 'personalizaveis', badge: 'Feito especialmente para você', accent: 'Do Seu Jeito', title: 'Em Cada Detalhe', description: 'Escolha cores, tamanhos e acabamentos para criar uma peça que combine com você, com seu espaço ou com aquela pessoa especial.', action: 'Explorar personalizáveis', href: '/products?category=personalizaveis', trust: ['Cores à sua escolha', 'Produção sob demanda', 'Presente com personalidade'], active: true },
      { id: 'stl', badge: 'Arquivos digitais para impressão 3D', accent: 'Sua Próxima Ideia', title: 'Começa Aqui', description: 'Encontre modelos STL originais e prontos para imprimir, criados para quem quer produzir peças bonitas com praticidade.', action: 'Explorar arquivos STL', href: '/stl', trust: ['Download após a compra', 'Modelos exclusivos', 'Prontos para imprimir'], active: true },
      { id: 'encomenda', badge: 'Transformamos sua ideia em objeto', accent: 'Imagine.', title: 'A Gente Faz em 3D.', description: 'Envie seu arquivo, referência ou ideia. Nós analisamos o projeto e preparamos uma impressão personalizada para você.', action: 'Faça sua encomenda', href: '/request-print', trust: ['Orçamento personalizado', 'Acompanhamento próximo', 'Produção com cuidado'], active: true },
    ],
  },
};

export function getWhatsAppUrl(settings: StoreSettings) {
  if (!settings.contact.whatsapp) return '';
  return `https://wa.me/${settings.contact.whatsapp}?text=${encodeURIComponent(settings.contact.whatsappMessage)}`;
}

export function storeThemeStyle(settings: StoreSettings): CSSProperties {
  return {
    '--store-primary': settings.theme.primary,
    '--store-secondary': settings.theme.secondary,
    '--store-accent': settings.theme.accent,
    '--store-background': settings.theme.background,
    '--store-foreground': settings.theme.foreground,
    '--store-radius': `${settings.theme.radius}px`,
  } as CSSProperties;
}
