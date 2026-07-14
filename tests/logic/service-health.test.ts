import { describe, expect, it } from 'vitest';
import { getCronHealth, getIntegrationHealth } from '@/lib/service-health';

describe('service health', () => {
  it('uses the Mercado Pago environment names used by the payment integration', () => {
    const services = getIntegrationHealth({
      MERCADO_PAGO_ACCESS_TOKEN: 'token',
      NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: 'public',
      MERCADO_PAGO_WEBHOOK_SECRET: 'secret',
    });
    expect(services.find((service) => service.service === 'mercado_pago')).toMatchObject({ status: 'healthy', configured: true });
  });

  it('explains when Resend can send but cannot receive delivery events', () => {
    const services = getIntegrationHealth({ RESEND_API_KEY: 'key' });
    expect(services.find((service) => service.service === 'resend')).toMatchObject({
      status: 'degraded',
      missing: ['RESEND_WEBHOOK_SECRET'],
    });
  });

  it('identifies routines that have never executed', () => {
    const health = getCronHealth({ runs: [], hasSecret: true, now: Date.parse('2026-07-14T12:00:00Z') });
    expect(health.status).toBe('degraded');
    expect(health.missing).toContain('recover-abandoned-carts');
    expect(health.summary).toContain('Aguardando primeira execução');
  });
});
