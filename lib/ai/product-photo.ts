export const PRODUCT_PHOTO_ANGLES = {
  front: 'vista frontal reta',
  'three-quarter-left': 'ângulo de 45 graus pela esquerda',
  'three-quarter-right': 'ângulo de 45 graus pela direita',
  side: 'vista lateral',
  back: 'vista traseira',
  top: 'vista superior',
  detail: 'close-up dos detalhes e acabamento',
} as const;

export type ProductPhotoAngle = keyof typeof PRODUCT_PHOTO_ANGLES;
export type ProductPhotoFraming = 'same' | 'closer' | 'wider';
export type ProductPhotoLighting = 'preserve' | 'soft' | 'bright';

export const MAX_PRODUCT_IMAGES = 10;
export const MAX_GENERATIONS_PER_BATCH = 4;

export function isProductPhotoAngle(value: unknown): value is ProductPhotoAngle {
  return typeof value === 'string' && value in PRODUCT_PHOTO_ANGLES;
}

export function buildProductPhotoPrompt(input: {
  productName: string;
  productDescription?: string | null;
  angle: ProductPhotoAngle;
  framing: ProductPhotoFraming;
  lighting: ProductPhotoLighting;
  instructions?: string;
}) {
  const framing = {
    same: 'mantenha exatamente a mesma distância aparente e o mesmo enquadramento',
    closer: 'aproxime moderadamente a câmera, sem cortar nenhuma parte importante do produto',
    wider: 'afaste moderadamente a câmera, mantendo o produto como assunto principal',
  }[input.framing];
  const lighting = {
    preserve: 'preserve exatamente a direção, intensidade e temperatura da iluminação original',
    soft: 'mantenha a mesma iluminação, apenas suavizando sombras duras de forma natural',
    bright: 'mantenha a mesma iluminação e aumente discretamente a exposição sem estourar os brancos',
  }[input.lighting];

  return `Edite a fotografia de referência como uma fotografia comercial real do MESMO produto físico.

Produto cadastrado: ${input.productName}
Descrição factual: ${(input.productDescription ?? '').slice(0, 1200) || 'não informada'}
Nova câmera: ${PRODUCT_PHOTO_ANGLES[input.angle]}.
Enquadramento: ${framing}.
Luz: ${lighting}.
Orientação adicional: ${(input.instructions ?? '').trim().slice(0, 600) || 'nenhuma'}.

REGRAS OBRIGATÓRIAS:
1. Preserve com máxima fidelidade forma, proporções, material, textura, cores, acabamento, defeitos reais, quantidade de peças, personalização, logotipo e qualquer texto visível do produto.
2. Preserve o MESMO fundo, superfície, paleta, objetos de cenário, iluminação e identidade visual da imagem de referência. Reconstrua apenas as partes naturalmente reveladas pela nova câmera.
3. Não invente acessórios, funções, embalagens, peças, estampas, textos ou detalhes que não estejam comprovados na referência.
4. Não embeleze a ponto de alterar o produto real. Mantenha pequenas marcas e características reais.
5. Aparência de fotografia de produto feita com câmera, óptica e sombras fisicamente coerentes. Evite plástico artificial, superfícies derretidas, simetria falsa, halos, texto deformado e aparência de render 3D.
6. Mostre apenas um produto, salvo quando a referência comprovar que o anúncio é um kit.
7. Não acrescente texto promocional, moldura, selo, marca d'água ou elementos gráficos.

Entregue uma única imagem final, sem explicações dentro da imagem.`;
}

export function productGallery(product: {
  image_url?: string | null;
  image_url_2?: string | null;
  images?: string[] | null;
}) {
  return [...new Set([
    product.image_url,
    ...(product.images ?? []),
    product.image_url_2,
  ].filter((value): value is string => Boolean(value?.trim())))];
}
