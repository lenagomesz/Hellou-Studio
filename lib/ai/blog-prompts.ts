import { BrandVoice } from './brand-voice';

/**
 * Blog Generation Prompts System
 *
 * 10 distinct themes for automated blog post generation via Gemini AI.
 * All content is produced in Portuguese (pt-BR).
 */

export type BlogTheme =
  | 'decoracao_gamer'
  | 'organizacao_minimalista'
  | 'design_pop_culture'
  | 'ideias_pequenos_espacos'
  | 'tendencias_lifestyle'
  | 'colecionadores_organization'
  | 'home_office_setup'
  | 'dicas_feng_shui_moderno'
  | 'cores_trending_2026'
  | 'sustentabilidade_design';

export const BLOG_THEMES: BlogTheme[] = [
  'decoracao_gamer',
  'organizacao_minimalista',
  'design_pop_culture',
  'ideias_pequenos_espacos',
  'tendencias_lifestyle',
  'colecionadores_organization',
  'home_office_setup',
  'dicas_feng_shui_moderno',
  'cores_trending_2026',
  'sustentabilidade_design',
];

interface ThemeDescription {
  title: string;
  focus: string;
}

const THEME_DESCRIPTIONS: Record<BlogTheme, ThemeDescription> = {
  decoracao_gamer: {
    title: 'Decoracao Gamer',
    focus:
      'Setups de gaming, decoracao tematica de jogos, luminarias LED, organizadores de controle, posters e quadros geek, ambientes imersivos para gamers',
  },
  organizacao_minimalista: {
    title: 'Organizacao Minimalista',
    focus:
      'Tecnicas de organizacao com menos itens, armazenamento inteligente, estetica clean, desapego consciente, moveis multifuncionais e rotinas de ordem',
  },
  design_pop_culture: {
    title: 'Design & Pop Culture',
    focus:
      'Decoracao inspirada em filmes, series, animes e musica, pecas autorais com referencias culturais, ambientes tematicos e colecoes de arte pop',
  },
  ideias_pequenos_espacos: {
    title: 'Ideias para Pequenos Espacos',
    focus:
      'Solucoes criativas para apartamentos compactos, moveis planejados, aproveitamento vertical, ilusao de amplitude e decoracao funcional para kitinets e studios',
  },
  tendencias_lifestyle: {
    title: 'Tendencias & Lifestyle',
    focus:
      'Novidades em decoracao e design de interiores, estilos emergentes, cores do momento, materiais inovadores e habitos de vida que influenciam o lar',
  },
  colecionadores_organization: {
    title: 'Organizacao para Colecionadores',
    focus:
      'Expor e organizar colecoes (action figures, vinis, livros, quadrinhos), displays criativos, iluminacao para vitrines e preservacao de itens especiais',
  },
  home_office_setup: {
    title: 'Home Office Setup',
    focus:
      'Montagem de escritorio em casa, ergonomia, acessorios de produtividade, decoracao que inspira foco, organizacao de cabos e personalizacao do espaco de trabalho',
  },
  dicas_feng_shui_moderno: {
    title: 'Feng Shui Moderno',
    focus:
      'Principios de feng shui adaptados ao design contemporaneo, fluxo de energia, posicionamento de moveis, cores para harmonia e bem-estar no ambiente',
  },
  cores_trending_2026: {
    title: 'Cores em Alta 2026',
    focus:
      'Paletas de cores tendencia para 2026, combinacoes ousadas, tons terrosos, neons suaves, como aplicar cor em ambientes e psicologia das cores na decoracao',
  },
  sustentabilidade_design: {
    title: 'Sustentabilidade & Design',
    focus:
      'Decoracao eco-friendly, materiais reciclados, upcycling criativo, consumo consciente, pecas artesanais e marcas com proposito sustentavel',
  },
};

const FORBIDDEN_TERMS = [
  '3D printing',
  'impressao 3D',
  'filamento',
  'filament',
  'printer',
  'impressora',
  'resina',
  'bico',
  'camadas',
  'fatiador',
  'slicer',
  'nozzle',
  'extrusora',
];

function buildBrandVoiceBlock(brandVoice: BrandVoice): string {
  return `VOZ DA MARCA & REGRAS:
- Tom: ${brandVoice.tone}${brandVoice.toneDescription ? ` (${brandVoice.toneDescription})` : ''}
- Publico-alvo: ${brandVoice.targetAgeMin}-${brandVoice.targetAgeMax} anos
- Interesses: ${brandVoice.interests.join(', ')}
- Regras: ${brandVoice.brandRules}

RESTRICAO ABSOLUTA:
NUNCA mencione os seguintes termos ou conceitos relacionados: ${FORBIDDEN_TERMS.join(', ')}.
Foque exclusivamente no produto final, no design, na estetica e no valor para o cliente.`;
}

/**
 * Builds the system prompt for blog generation given a brand voice and theme.
 */
export function buildBlogSystemPrompt(brandVoice: BrandVoice, theme: BlogTheme): string {
  const themeInfo = THEME_DESCRIPTIONS[theme];

  return `Voce e um redator SEO especialista da Hellou Studio, uma marca brasileira de arte e design autoral.

Seu objetivo: Escrever um blog post completo, otimizado para SEO, sobre o tema "${themeInfo.title}".

${buildBrandVoiceBlock(brandVoice)}

TEMA: ${themeInfo.title}
FOCO DO TEMA: ${themeInfo.focus}

REQUISITOS DO CONTEUDO:
- Escreva entre 800 e 1200 palavras
- Formato HTML com tags semanticas (<h2>, <p>, <strong>, <em>, <ul>, <li>)
- Use pelo menos 3 subtitulos com tags <h2>
- Tom conversacional, informativo e envolvente
- Inclua dicas praticas e acionaveis para o leitor
- Integre naturalmente UMA recomendacao de produto da Hellou Studio dentro do conteudo
- A recomendacao deve parecer organica, como sugestao util, nao propaganda
- Inclua 2-3 oportunidades de link interno (use formato <a href="/blog/SLUG">texto</a>)
- Paragrafos curtos (maximo 3-4 linhas) para facilitar leitura mobile
- Use listas quando apropriado para melhor escaneabilidade

REQUISITOS SEO:
- Titulo atrativo com menos de 60 caracteres, otimizado para busca
- Meta description com menos de 160 caracteres que gere cliques
- Excerpt/resumo com 1-2 frases que capturem a essencia do post
- 5 a 10 keywords relevantes para o tema
- Conteudo deve responder a intencao de busca do usuario

IDIOMA: Todos os textos DEVEM ser em portugues (pt-BR).

FORMATO DE SAIDA - Responda EXCLUSIVAMENTE com um JSON valido nesta estrutura:
{
  "title": "Titulo do post (max 60 chars)",
  "excerpt": "Resumo curto do post em 1-2 frases",
  "meta_description": "Meta description para SEO (max 160 chars)",
  "content": "Conteudo HTML completo do post com tags <h2>, <p>, <strong>, <ul>, <li>",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "theme": "${theme}"
}`;
}

/**
 * Builds the user prompt for blog generation given a theme.
 * This triggers the generation with specific instructions for the theme context.
 */
export function buildBlogUserPrompt(theme: BlogTheme, productContext?: string): string {
  const themeInfo = THEME_DESCRIPTIONS[theme];

  const productSection = productContext
    ? `\n\nProdutos em nosso catalogo que podem ser mencionados:\n${productContext}`
    : '';

  return `Escreva agora um blog post completo sobre "${themeInfo.title}".

Contexto do tema: ${themeInfo.focus}${productSection}

Lembre-se:
- 800 a 1200 palavras
- HTML formatado com <h2>, <p>, <strong>, <ul>, <li>
- Integre uma recomendacao natural de produto Hellou Studio
- Foque em valor para o leitor: dicas praticas, inspiracao e solucoes
- Keywords relevantes para ranqueamento no Google Brasil
- Responda SOMENTE com o JSON no formato especificado, sem texto adicional`;
}

/**
 * Returns the theme description for a given theme.
 */
export function getThemeDescription(theme: BlogTheme): ThemeDescription {
  return THEME_DESCRIPTIONS[theme];
}

/**
 * Returns a random theme from the available themes.
 */
export function getRandomTheme(): BlogTheme {
  const index = Math.floor(Math.random() * BLOG_THEMES.length);
  return BLOG_THEMES[index];
}
