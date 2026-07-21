export type SiteAnalyticsEvent = {
  visitor_hash: string;
  session_hash: string;
  event_type: 'session_start' | 'page_view';
  path: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'other';
  created_at: string;
};

export type TrafficSummary = {
  pageViews: number;
  visitors: number;
  sessions: number;
  activeNow: number;
  returningVisitors: number;
  pagesPerSession: number;
  bounceRate: number;
  growth: { pageViews: number; visitors: number };
  topPages: Array<{ path: string; views: number; visitors: number }>;
  sources: Array<{ source: string; sessions: number }>;
  devices: Array<{ device: string; sessions: number }>;
  daily: Array<{ date: string; views: number; visitors: number }>;
  campaigns: Array<{ campaign: string; sessions: number }>;
  funnel: {
    productSessions: number;
    cartSessions: number;
    checkoutSessions: number;
    printRequestSessions: number;
    productToCartRate: number;
    cartToCheckoutRate: number;
  };
};

function growth(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function aggregateTraffic(
  currentEvents: SiteAnalyticsEvent[],
  previousEvents: SiteAnalyticsEvent[],
  now = new Date(),
): TrafficSummary {
  const pageViews = currentEvents.filter((event) => event.event_type === 'page_view');
  const previousPageViews = previousEvents.filter((event) => event.event_type === 'page_view');
  const visitors = new Set(pageViews.map((event) => event.visitor_hash));
  const sessions = new Set(pageViews.map((event) => event.session_hash));
  const previousVisitors = new Set(previousPageViews.map((event) => event.visitor_hash));
  const activeCutoff = now.getTime() - 15 * 60_000;
  const activeNow = new Set(pageViews
    .filter((event) => new Date(event.created_at).getTime() >= activeCutoff)
    .map((event) => event.session_hash)).size;

  const sessionsByVisitor = new Map<string, Set<string>>();
  const viewsBySession = new Map<string, number>();
  const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
  const sourceMap = new Map<string, Set<string>>();
  const deviceMap = new Map<string, Set<string>>();
  const dailyMap = new Map<string, { views: number; visitors: Set<string> }>();
  const campaignMap = new Map<string, Set<string>>();
  const productSessions = new Set<string>();
  const cartSessions = new Set<string>();
  const checkoutSessions = new Set<string>();
  const printRequestSessions = new Set<string>();

  for (const event of pageViews) {
    const visitorSessions = sessionsByVisitor.get(event.visitor_hash) ?? new Set<string>();
    visitorSessions.add(event.session_hash);
    sessionsByVisitor.set(event.visitor_hash, visitorSessions);
    viewsBySession.set(event.session_hash, (viewsBySession.get(event.session_hash) ?? 0) + 1);

    const page = pageMap.get(event.path) ?? { views: 0, visitors: new Set<string>() };
    page.views += 1;
    page.visitors.add(event.visitor_hash);
    pageMap.set(event.path, page);

    const source = event.utm_source || event.referrer_host || 'Direto';
    const sourceSessions = sourceMap.get(source) ?? new Set<string>();
    sourceSessions.add(event.session_hash);
    sourceMap.set(source, sourceSessions);

    const deviceSessions = deviceMap.get(event.device_type) ?? new Set<string>();
    deviceSessions.add(event.session_hash);
    deviceMap.set(event.device_type, deviceSessions);

    const date = event.created_at.slice(0, 10);
    const daily = dailyMap.get(date) ?? { views: 0, visitors: new Set<string>() };
    daily.views += 1;
    daily.visitors.add(event.visitor_hash);
    dailyMap.set(date, daily);

    if (event.utm_campaign) {
      const campaignSessions = campaignMap.get(event.utm_campaign) ?? new Set<string>();
      campaignSessions.add(event.session_hash);
      campaignMap.set(event.utm_campaign, campaignSessions);
    }
    if (/^\/(products|stl)\/[^/]+$/.test(event.path)) productSessions.add(event.session_hash);
    if (event.path === '/cart') cartSessions.add(event.session_hash);
    if (event.path === '/checkout/success') checkoutSessions.add(event.session_hash);
    if (event.path === '/request-print') printRequestSessions.add(event.session_hash);
  }

  const returningVisitors = [...sessionsByVisitor.values()].filter((visitorSessions) => visitorSessions.size > 1).length;
  const bouncedSessions = [...viewsBySession.values()].filter((views) => views === 1).length;
  const productToCartSessions = [...cartSessions].filter((session) => productSessions.has(session)).length;
  const cartToCheckoutSessions = [...checkoutSessions].filter((session) => cartSessions.has(session)).length;

  return {
    pageViews: pageViews.length,
    visitors: visitors.size,
    sessions: sessions.size,
    activeNow,
    returningVisitors,
    pagesPerSession: sessions.size ? round2(pageViews.length / sessions.size) : 0,
    bounceRate: sessions.size ? round2(bouncedSessions / sessions.size * 100) : 0,
    growth: {
      pageViews: growth(pageViews.length, previousPageViews.length),
      visitors: growth(visitors.size, previousVisitors.size),
    },
    topPages: [...pageMap.entries()]
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 10)
      .map(([path, value]) => ({ path, views: value.views, visitors: value.visitors.size })),
    sources: [...sourceMap.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([source, value]) => ({ source, sessions: value.size })),
    devices: [...deviceMap.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .map(([device, value]) => ({ device, sessions: value.size })),
    daily: [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, views: value.views, visitors: value.visitors.size })),
    campaigns: [...campaignMap.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([campaign, value]) => ({ campaign, sessions: value.size })),
    funnel: {
      productSessions: productSessions.size,
      cartSessions: cartSessions.size,
      checkoutSessions: checkoutSessions.size,
      printRequestSessions: printRequestSessions.size,
      productToCartRate: productSessions.size ? round2(productToCartSessions / productSessions.size * 100) : 0,
      cartToCheckoutRate: cartSessions.size ? round2(cartToCheckoutSessions / cartSessions.size * 100) : 0,
    },
  };
}

export function classifyDevice(userAgent: string) {
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return 'tablet' as const;
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return 'mobile' as const;
  if (userAgent) return 'desktop' as const;
  return 'other' as const;
}
