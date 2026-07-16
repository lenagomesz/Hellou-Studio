import { describe, expect, it } from 'vitest';
import { getStorageCandidates, normalizeProductRelation } from '@/lib/stl-download';

const product = {
  id: '972c4ff5-9c10-4194-9dfb-edeb77fd0af4',
  name: 'Chaveiro',
  file_path: 'good_things_ahead_heart_keychain.stl',
  type: 'digital',
};

describe('download de STL', () => {
  it('aceita a relação do Supabase como objeto ou lista', () => {
    expect(normalizeProductRelation(product)).toEqual(product);
    expect(normalizeProductRelation([product])).toEqual(product);
  });

  it('extrai bucket e caminho de uma URL assinada nova', () => {
    const candidates = getStorageCandidates(
      'https://example.supabase.co/storage/v1/object/sign/stl-uploads/good_things_ahead_heart_keychain.stl?token=secret',
    );

    expect(candidates[0]).toEqual({
      bucket: 'stl-uploads',
      path: 'good_things_ahead_heart_keychain.stl',
    });
  });

  it('mantém compatibilidade com uploads antigos no bucket products', () => {
    const candidates = getStorageCandidates('stl-files/product-id/modelo.stl');

    expect(candidates).toContainEqual({
      bucket: 'products',
      path: 'stl-files/product-id/modelo.stl',
    });
  });
});
