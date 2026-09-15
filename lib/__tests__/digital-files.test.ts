import { describe, expect, it } from 'vitest';
import {
  getDigitalDownloadFileName,
  getDigitalFileContentType,
  getDigitalFileExtension,
  isSupportedDigitalFile,
} from '@/lib/digital-files';

describe('arquivos digitais para impressão 3D', () => {
  it.each(['modelo.stl', 'MODELO.STL', 'projeto.3mf', 'PROJETO.3MF'])('aceita %s', (fileName) => {
    expect(isSupportedDigitalFile(fileName)).toBe(true);
  });

  it('recusa extensões não permitidas e nomes sem extensão', () => {
    expect(isSupportedDigitalFile('modelo.obj')).toBe(false);
    expect(isSupportedDigitalFile('modelo')).toBe(false);
  });

  it('preserva 3MF no nome e no tipo do download', () => {
    const path = 'stl-files/product-id/123-projeto.3mf?token=secret';
    expect(getDigitalFileExtension(path)).toBe('3mf');
    expect(getDigitalDownloadFileName('Projeto especial', path)).toBe('Projeto_especial.3mf');
    expect(getDigitalFileContentType(path)).toBe('model/3mf');
  });

  it('não duplica uma extensão que já esteja no nome comercial', () => {
    expect(getDigitalDownloadFileName('Dragão.stl', 'stl-files/dragao.stl')).toBe('Dragão.stl');
    expect(getDigitalDownloadFileName('Kit.3mf', 'stl-files/kit.3mf')).toBe('Kit.3mf');
  });
});
