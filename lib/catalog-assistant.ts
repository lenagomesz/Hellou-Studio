export const CATALOG_IMAGE_PROMPT = `Crie uma foto de produto em estúdio para loja online, mantendo o produto exatamente igual à imagem original, sem alterar formato, proporções, recortes, encaixes, detalhes, estrutura, acessórios ou textura da impressão 3D. Preserve a aparência real do item. Coloque o produto centralizado sobre uma superfície off-white levemente texturizada, em tom #E4D9D8, com variações suaves #F1EAE6 e #D8CBC7, simulando um chão claro de estúdio. O fundo deve ser uma parede lisa em tom bege quente/caramelo, com degradê suave e natural usando como base #C6843A, com variações #C27D2C e #D49755. Iluminação suave, uniforme e levemente quente, com sombra natural abaixo do produto. Sem elementos decorativos, plantas, vasos, textos ou objetos extras. Composição minimalista, comercial e elegante. Imagem vertical em proporção 2:3, com enquadramento limpo e margem confortável ao redor do produto. A identidade visual deve permanecer consistente entre todos os produtos, para que todas as imagens da loja pareçam parte da mesma coleção fotográfica.`;

export type CatalogCalculation = {
  peso_g: number;
  tempo_impressao: string;
  preco_filamento_kg: number;
  custo_filamento: number;
  custo_operacional: number;
  custo_embalagem: number;
  custo_total: number;
  multiplicador: number;
  valor_bruto: number;
  valor_sugerido: number;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function commercialPrice(value: number) {
  const candidate = Math.ceil(value / 5) * 5 - 0.1;
  return round2(candidate >= value ? candidate : candidate + 5);
}

export function calculateCatalogPrice(input: {
  weightGrams: number;
  hours: number;
  minutes: number;
  filamentPricePerKg?: number;
}): CatalogCalculation {
  const weightGrams = Math.max(0, input.weightGrams || 0);
  const hours = Math.max(0, input.hours || 0);
  const minutes = Math.min(59, Math.max(0, input.minutes || 0));
  const decimalHours = hours + minutes / 60;
  const filamentPricePerKg = input.filamentPricePerKg && input.filamentPricePerKg > 0
    ? input.filamentPricePerKg
    : 100;

  const filamentCost = (weightGrams / 1000) * filamentPricePerKg;
  const operationalCost = decimalHours * 1.2;
  const packagingCost = filamentCost * 0.1;
  const totalCost = filamentCost + operationalCost + packagingCost;
  const grossValue = totalCost * 2.1;

  return {
    peso_g: round2(weightGrams),
    tempo_impressao: `${Math.floor(hours)}h${String(Math.round(minutes)).padStart(2, '0')}m`,
    preco_filamento_kg: round2(filamentPricePerKg),
    custo_filamento: round2(filamentCost),
    custo_operacional: round2(operationalCost),
    custo_embalagem: round2(packagingCost),
    custo_total: round2(totalCost),
    multiplicador: 2.1,
    valor_bruto: round2(grossValue),
    valor_sugerido: commercialPrice(grossValue),
  };
}

export function buildCatalogImagePrompt(color?: string) {
  const normalizedColor = color?.trim();
  if (!normalizedColor) return CATALOG_IMAGE_PROMPT;
  return `${CATALOG_IMAGE_PROMPT}\n\nAltere somente a cor do produto para ${normalizedColor}, mantendo todo o restante exatamente igual.`;
}
