'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Command,
  ExternalLink,
  PackagePlus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { SideNav } from '@/components/admin/SideNav';
import { ThemeToggle } from '@/components/admin/ThemeToggle';

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface AdminNotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  priority: NotificationPriority;
  read: boolean;
  related_order_id: string | null;
  related_product_id: string | null;
  related_print_request_id?: string | null;
  created_at: string;
}

const QUICK_LINKS = [
  { href: '/dashboard', label: 'Visão geral', description: 'Resumo da operação' },
  { href: '/dashboard/orders', label: 'Pedidos', description: 'Produção, envio e histórico' },
  { href: '/dashboard/requests', label: 'Solicitações 3D', description: 'Orçamentos de impressão' },
  { href: '/dashboard/products', label: 'Produtos', description: 'Catálogo e arquivos STL' },
  { href: '/dashboard/inventory', label: 'Estoque', description: 'Saldo, previsão e reposição' },
  { href: '/dashboard/users', label: 'Clientes', description: 'Perfis e relacionamento' },
  { href: '/dashboard/financeiro', label: 'Financeiro', description: 'Receitas e conciliação' },
  { href: '/dashboard/analytics', label: 'Analytics', description: 'Indicadores e tendências' },
  { href: '/dashboard/campaigns', label: 'Campanhas', description: 'Comunicação e automações' },
  { href: '/dashboard/admin-alerts', label: 'Central de alertas', description: 'Pendências e lembretes' },
];

const ROUTE_TITLES: Array<[string, string]> = [
  ['/dashboard/admin-alerts', 'Central de alertas'],
  ['/dashboard/order-ratings', 'Avaliações'],
  ['/dashboard/inventory', 'Estoque'],
  ['/dashboard/campaigns', 'Campanhas'],
  ['/dashboard/analytics', 'Analytics'],
  ['/dashboard/financeiro', 'Financeiro'],
  ['/dashboard/calculadora', 'Calculadora'],
  ['/dashboard/requests', 'Solicitações 3D'],
  ['/dashboard/products', 'Produtos'],
  ['/dashboard/orders', 'Pedidos'],
  ['/dashboard/users', 'Clientes'],
  ['/dashboard/coupons', 'Cupons'],
  ['/dashboard/settings', 'Configurações'],
  ['/dashboard', 'Visão geral'],
];

function getNotificationLink(notification: AdminNotificationItem) {
  if (notification.related_print_request_id) return `/dashboard/requests/${notification.related_print_request_id}`;
  if (notification.related_order_id) return `/dashboard/orders/${notification.related_order_id}`;
  if (notification.related_product_id) return `/dashboard/products/${notification.related_product_id}`;
  return '/dashboard/admin-alerts';
}

function getRouteTitle(pathname: string) {
  return ROUTE_TITLES.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] ?? 'Admin';
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export function AdminShell({ children, userEmail }: { children: ReactNode; userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [newAlert, setNewAlert] = useState<AdminNotificationItem | null>(null);
  const initializedRef = useRef(false);
  const latestTimestampRef = useRef(0);

  const showDesktopNotification = useCallback((item: AdminNotificationItem) => {
    if (!desktopEnabled || permission !== 'granted') return;

    const desktopNotification = new Notification(item.title, {
      body: item.body ?? 'Há uma nova atualização no painel administrativo.',
      icon: '/logo-192.png',
      badge: '/logo-32.png',
      tag: `hellou-admin-${item.id}`,
    });

    desktopNotification.onclick = () => {
      window.focus();
      router.push(getNotificationLink(item));
      desktopNotification.close();
    };
  }, [desktopEnabled, permission, router]);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications?limit=8&unread=true', {
        cache: 'no-store',
      });
      if (!response.ok) return;

      const data = await response.json() as {
        notifications?: AdminNotificationItem[];
        pagination?: { total?: number };
      };
      const nextNotifications = data.notifications ?? [];
      setNotifications(nextNotifications);
      setUnreadCount(data.pagination?.total ?? nextNotifications.length);

      const latestTimestamp = nextNotifications.reduce(
        (latest, item) => Math.max(latest, new Date(item.created_at).getTime()),
        0,
      );

      if (!initializedRef.current) {
        const savedTimestamp = Number(localStorage.getItem('hellou-admin-last-notification-at')) || latestTimestamp;
        latestTimestampRef.current = savedTimestamp;
        initializedRef.current = true;
      }

      const freshItems = nextNotifications
        .filter((item) => new Date(item.created_at).getTime() > latestTimestampRef.current)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (freshItems.length > 0) {
        const newest = freshItems.at(-1)!;
        setNewAlert(newest);
        window.setTimeout(() => setNewAlert((current) => current?.id === newest.id ? null : current), 8000);
        freshItems.slice(-3).forEach(showDesktopNotification);
      }

      if (latestTimestamp > latestTimestampRef.current) {
        latestTimestampRef.current = latestTimestamp;
        localStorage.setItem('hellou-admin-last-notification-at', String(latestTimestamp));
      }
    } catch {
      // The next focus/poll cycle retries automatically.
    }
  }, [showDesktopNotification]);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    setDesktopEnabled(localStorage.getItem('hellou-admin-desktop-notifications') === 'enabled');
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 20000);
    const handleFocus = () => refreshNotifications();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationOpen(false);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  async function enableDesktopNotifications() {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      localStorage.setItem('hellou-admin-desktop-notifications', 'enabled');
      setDesktopEnabled(true);
      new Notification('Notificações ativadas', {
        body: 'Você será avisada sobre novos pedidos e alertas enquanto o painel estiver aberto.',
        icon: '/logo-192.png',
        tag: 'hellou-admin-enabled',
      });
    }
  }

  function disableDesktopNotifications() {
    localStorage.removeItem('hellou-admin-desktop-notifications');
    setDesktopEnabled(false);
  }

  const filteredLinks = QUICK_LINKS.filter((item) =>
    `${item.label} ${item.description}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
  );

  return (
    <div className="admin-shell min-h-screen bg-[#f5f3ef] text-slate-950 dark:bg-[#090b10] dark:text-white md:flex">
      <SideNav userEmail={userEmail} alertCount={unreadCount} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f5f3ef]/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#090b10]/88 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Operação <ChevronRight className="h-3 w-3" />
              </div>
              <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
                {getRouteTitle(pathname)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden min-w-56 items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-slate-500 shadow-sm transition hover:border-pink-300 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-pink-500/50 dark:hover:text-white md:flex"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Buscar no painel</span>
              <kbd className="rounded-md border border-black/10 bg-slate-50 px-1.5 py-0.5 text-[10px] dark:border-white/10 dark:bg-white/5">
                Ctrl K
              </kbd>
            </button>

            <Link
              href="/dashboard/products/new"
              className="hidden items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-600 dark:bg-white dark:text-slate-950 dark:hover:bg-pink-400 sm:inline-flex"
            >
              <PackagePlus className="h-4 w-4" />
              Novo produto
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((open) => !open)}
                className="relative rounded-xl border border-black/10 bg-white/80 p-2.5 text-slate-600 shadow-sm transition hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                aria-label={`Alertas${unreadCount ? `: ${unreadCount} não lidos` : ''}`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-bold text-white ring-2 ring-[#f5f3ef] dark:ring-[#090b10]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-12 z-40 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#12151d]">
                  <div className="flex items-start justify-between border-b border-black/5 p-4 dark:border-white/10">
                    <div>
                      <p className="font-semibold">Alertas recentes</p>
                      <p className="mt-0.5 text-xs text-slate-500">Atualização automática a cada 20 segundos</p>
                    </div>
                    <span className="rounded-full bg-pink-50 px-2 py-1 text-xs font-bold text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">
                      {unreadCount} novos
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Check className="mx-auto h-7 w-7 text-emerald-500" />
                        <p className="mt-2 text-sm font-medium">Tudo em dia por aqui</p>
                      </div>
                    ) : notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={getNotificationLink(item)}
                        onClick={() => setNotificationOpen(false)}
                        className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.priority === 'urgent' ? 'bg-red-500' : item.priority === 'high' ? 'bg-orange-500' : 'bg-pink-500'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.title}</span>
                          {item.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500">{item.body}</span>}
                          <span className="mt-1 block text-[11px] font-medium text-slate-400">{relativeTime(item.created_at)}</span>
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="grid gap-2 border-t border-black/5 p-3 dark:border-white/10">
                    {permission === 'granted' && desktopEnabled ? (
                      <button onClick={disableDesktopNotifications} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <ShieldCheck className="h-4 w-4" /> Notificações no computador ativas
                      </button>
                    ) : (
                      <button onClick={enableDesktopNotifications} disabled={permission === 'denied' || permission === 'unsupported'} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950">
                        <BellRing className="h-4 w-4" />
                        {permission === 'denied' ? 'Permissão bloqueada no navegador' : permission === 'unsupported' ? 'Navegador sem suporte' : 'Ativar alertas no computador'}
                      </button>
                    )}
                    <Link href="/dashboard/admin-alerts" onClick={() => setNotificationOpen(false)} className="flex items-center justify-center gap-1 py-1 text-xs font-semibold text-pink-600">
                      Abrir central completa <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {permission !== 'granted' && permission !== 'unsupported' && (
            <div className="mb-6 flex flex-col gap-3 overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 via-white to-orange-50 p-4 shadow-sm dark:border-pink-500/20 dark:from-pink-500/10 dark:via-white/[0.03] dark:to-orange-500/10 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white shadow-lg shadow-pink-500/20">
                <BellRing className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Receba novos pedidos direto no computador</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">Ative uma vez e o navegador exibirá alertas nativos mesmo quando esta aba estiver em segundo plano.</p>
              </div>
              <button onClick={enableDesktopNotifications} disabled={permission === 'denied'} className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50 dark:bg-white dark:text-slate-950">
                {permission === 'denied' ? 'Permissão bloqueada' : 'Ativar notificações'}
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {newAlert && (
        <Link href={getNotificationLink(newAlert)} className="fixed bottom-5 right-5 z-50 flex w-[min(90vw,380px)] gap-3 rounded-2xl border border-pink-200 bg-white p-4 shadow-2xl shadow-pink-900/15 dark:border-pink-500/30 dark:bg-[#171922]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white"><BellRing className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-pink-600"><Sparkles className="h-3 w-3" /> Novo alerta</span>
            <span className="mt-1 block truncate text-sm font-bold">{newAlert.title}</span>
            <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{newAlert.body}</span>
          </span>
          <button type="button" onClick={(event) => { event.preventDefault(); setNewAlert(null); }} className="self-start rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Fechar alerta"><X className="h-4 w-4" /></button>
        </Link>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/55 p-4 pt-[10vh] backdrop-blur-sm" onMouseDown={() => setSearchOpen(false)}>
          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl dark:bg-[#12151d]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-black/5 px-4 dark:border-white/10">
              <Search className="h-5 w-5 text-pink-500" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite pedidos, estoque, clientes..." className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
              <button onClick={() => setSearchOpen(false)} className="rounded-lg border border-black/10 px-2 py-1 text-[10px] text-slate-500 dark:border-white/10">ESC</button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Ir para</p>
              {filteredLinks.map((item) => (
                <button key={item.href} onClick={() => { router.push(item.href); setSearchOpen(false); setQuery(''); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-500/10"><ShoppingBag className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-slate-500">{item.description}</span></span>
                  <Command className="h-4 w-4 text-slate-300" />
                </button>
              ))}
              {filteredLinks.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">Nenhuma área encontrada.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
