import { describe, expect, it } from 'vitest';
import { validateKitContent } from './kit-content';

describe('conteúdo de kits com IA', () => {
  it('limpa HTML e respeita os limites salvos no painel', () => {
    const content = validateKitContent({
      title: `<b>${'K'.repeat(90)}</b>`,
      eyebrow: '  Um   presente especial  ',
      description: `<p>${'D'.repeat(400)}</p>`,
    });

    expect(content.title).toHaveLength(80);
    expect(content.eyebrow).toBe('Um presente especial');
    expect(content.description).toHaveLength(350);
    expect(JSON.stringify(content)).not.toContain('<');
  });

  it('recusa respostas incompletas', () => {
    expect(() => validateKitContent({ title: 'Kit', eyebrow: '', description: 'Descrição' })).toThrow('Resposta de IA vazia');
  });
});
