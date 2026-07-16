import { describe, expect, it } from 'vitest';
import { buildUniqueE2EEmail } from '@/e2e/support/env';

describe('e-mail único dos testes E2E', () => {
  it('usa alias quando recebe um Gmail completo', () => {
    expect(buildUniqueE2EEmail('helena.gomes103200@gmail.com', 1234))
      .toBe('helena.gomes103200+e2e-1234@gmail.com');
  });

  it('mantém compatibilidade com domínio catch-all', () => {
    expect(buildUniqueE2EEmail('testes.helloustudio.com.br', 1234))
      .toBe('e2e+1234@testes.helloustudio.com.br');
  });
});
