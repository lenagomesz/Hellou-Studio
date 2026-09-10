export type PackagingTemplateId = 'keychain' | 'medium' | 'large';

export type PackagingTemplate = {
  id: PackagingTemplateId;
  name: string;
  useCase: string;
  width: number;
  depth: number;
  height: number;
  glueTab: number;
  topDepth: number;
  bottomDepth: number;
  orientation: 'portrait' | 'landscape';
  copies: number;
};

export type PackagingPlacement = { x: number; y: number };

export const PACKAGING_TEMPLATES: PackagingTemplate[] = [
  {
    id: 'keychain',
    name: 'P - Chaveiros',
    useCase: 'Chaveiros, brindes e peças bem pequenas',
    width: 55,
    depth: 30,
    height: 90,
    glueTab: 10,
    topDepth: 22,
    bottomDepth: 22,
    orientation: 'portrait',
    copies: 2,
  },
  {
    id: 'medium',
    name: 'M - Acessórios',
    useCase: 'Acessórios, miniaturas e peças médias',
    width: 70,
    depth: 36,
    height: 105,
    glueTab: 10,
    topDepth: 27,
    bottomDepth: 29,
    orientation: 'landscape',
    copies: 1,
  },
  {
    id: 'large',
    name: 'G - Kits',
    useCase: 'Kits pequenos e peças 3D mais volumosas',
    width: 85,
    depth: 45,
    height: 120,
    glueTab: 10,
    topDepth: 32,
    bottomDepth: 34,
    orientation: 'landscape',
    copies: 1,
  },
];

export function getPackagingNetSize(template: PackagingTemplate) {
  return {
    width: template.depth * 2 + template.width * 2 + template.glueTab,
    height: template.topDepth + template.height + template.bottomDepth,
  };
}

export function getPackagingSheetSize(template: PackagingTemplate) {
  return template.orientation === 'portrait'
    ? { width: 210, height: 297 }
    : { width: 297, height: 210 };
}

export function getPackagingPlacements(template: PackagingTemplate): PackagingPlacement[] {
  const sheet = getPackagingSheetSize(template);
  const net = getPackagingNetSize(template);

  if (template.copies === 2) {
    const gap = 6;
    const totalHeight = net.height * 2 + gap;
    const startY = (sheet.height - totalHeight) / 2;
    return [
      { x: (sheet.width - net.width) / 2, y: startY },
      { x: (sheet.width - net.width) / 2, y: startY + net.height + gap },
    ];
  }

  return [{ x: (sheet.width - net.width) / 2, y: (sheet.height - net.height) / 2 }];
}

