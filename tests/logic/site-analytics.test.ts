import { describe, expect, it } from 'vitest';
import { aggregateTraffic, classifyDevice, type SiteAnalyticsEvent } from '@/lib/site-analytics';

function event(overrides: Partial<SiteAnalyticsEvent> = {}): SiteAnalyticsEvent {
  return {
    visitor_hash: 'visitor-1',
    session_hash: 'session-1',
    event_type: 'page_view',
    path: '/',
    referrer_host: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    device_type: 'desktop',
    created_at: '2026-07-20T12:00:00.000Z',
    ...overrides,
  };
}

describe('analytics anônimo do site', () => {
  it('conta visitantes e sessões sem duplicar visualizações', () => {
    const summary = aggregateTraffic([
      event(),
      event({ path: '/products' }),
      event({ visitor_hash: 'visitor-2', session_hash: 'session-2', device_type: 'mobile' }),
    ], [], new Date('2026-07-20T12:05:00.000Z'));

    expect(summary.pageViews).toBe(3);
    expect(summary.visitors).toBe(2);
    expect(summary.sessions).toBe(2);
    expect(summary.activeNow).toBe(2);
    expect(summary.pagesPerSession).toBe(1.5);
    expect(summary.bounceRate).toBe(50);
  });

  it('atribui origem, campanha e dispositivo por sessão', () => {
    const summary = aggregateTraffic([
      event({ utm_source: 'instagram', utm_campaign: 'lancamento', device_type: 'mobile' }),
      event({ path: '/products', utm_source: 'instagram', utm_campaign: 'lancamento', device_type: 'mobile' }),
      event({ visitor_hash: 'visitor-2', session_hash: 'session-2', referrer_host: 'google.com' }),
    ], []);

    expect(summary.sources).toEqual([
      { source: 'instagram', sessions: 1 },
      { source: 'google.com', sessions: 1 },
    ]);
    expect(summary.campaigns).toEqual([{ campaign: 'lancamento', sessions: 1 }]);
    expect(summary.devices).toContainEqual({ device: 'mobile', sessions: 1 });
  });

  it('calcula o funil apenas quando as etapas pertencem à mesma sessão', () => {
    const summary = aggregateTraffic([
      event({ path: '/products/vaso' }),
      event({ path: '/cart' }),
      event({ path: '/checkout/success' }),
      event({ visitor_hash: 'visitor-2', session_hash: 'session-2', path: '/cart' }),
      event({ visitor_hash: 'visitor-3', session_hash: 'session-3', path: '/checkout/success' }),
    ], []);

    expect(summary.funnel).toMatchObject({
      productSessions: 1,
      cartSessions: 2,
      checkoutSessions: 2,
      productToCartRate: 100,
      cartToCheckoutRate: 50,
    });
  });

  it('calcula crescimento contra o período anterior', () => {
    const summary = aggregateTraffic(
      [event(), event({ visitor_hash: 'visitor-2', session_hash: 'session-2' })],
      [event({ created_at: '2026-07-01T12:00:00.000Z' })],
    );
    expect(summary.growth).toEqual({ pageViews: 100, visitors: 100 });
  });

  it('classifica os dispositivos sem guardar o user-agent', () => {
    expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile')).toBe('mobile');
    expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS)')).toBe('tablet');
    expect(classifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(classifyDevice('')).toBe('other');
  });
});
