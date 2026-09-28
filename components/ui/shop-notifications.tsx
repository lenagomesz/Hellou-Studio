'use client';

import { Check, Heart, Info, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

type NotificationTone = 'success' | 'error' | 'info' | 'favorite';

type ShopNotificationInput = {
  tone: NotificationTone;
  title: string;
  message?: string;
  imageUrl?: string | null;
  action?: { label: string; href: string };
};

type FlashNotification = Omit<ShopNotificationInput, 'imageUrl' | 'action'>;
const FLASH_NOTIFICATION_KEY = 'hellou_flash_notification';

const toneStyle = {
  success: { icon: Check, iconClass: 'bg-emerald-100 text-emerald-700', label: 'Tudo certo' },
  error: { icon: XCircle, iconClass: 'bg-rose-100 text-rose-700', label: 'Atenção' },
  info: { icon: Info, iconClass: 'bg-sky-100 text-sky-700', label: 'Aviso' },
  favorite: { icon: Heart, iconClass: 'bg-pink-100 text-pink-700', label: 'Favoritos' },
} as const;

function NotificationCard({ closeToast, input }: { closeToast: () => void; input: ShopNotificationInput }) {
  const style = toneStyle[input.tone];
  const Icon = style.icon;

  return (
    <div className="flex min-w-0 items-center gap-3 pr-1">
      {input.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={input.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-white object-cover shadow-sm" />
      ) : (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${style.iconClass}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{style.label}</p>
        <p className="mt-0.5 truncate font-bold text-slate-900 dark:text-white">{input.title}</p>
        {input.message && <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-4 text-slate-500 dark:text-slate-300">{input.message}</p>}
        {input.action && <a href={input.action.href} onClick={() => closeToast()} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-pink-600 hover:text-orange-500">{input.action.label} <span aria-hidden="true">→</span></a>}
      </div>
    </div>
  );
}

function show(input: ShopNotificationInput) {
  const toastId = `${input.tone}:${input.title}:${input.message ?? ''}`;
  return toast((props) => <NotificationCard closeToast={props.closeToast} input={input} />, {
    toastId,
    type: input.tone === 'favorite' ? 'success' : input.tone,
    icon: false,
    closeButton: true,
    autoClose: input.tone === 'error' ? 6500 : 5200,
  });
}

export const shopNotify = {
  success: (title: string, message?: string) => show({ tone: 'success', title, message }),
  error: (title: string, message?: string) => show({ tone: 'error', title, message }),
  info: (title: string, message?: string) => show({ tone: 'info', title, message }),
  favorite: (title: string, message?: string) => show({ tone: 'favorite', title, message }),
  cartAdded: ({ name, imageUrl, quantity }: { name: string; imageUrl?: string | null; quantity: number }) => show({
    tone: 'success',
    title: 'Adicionado ao carrinho',
    message: `${quantity} ${quantity === 1 ? 'unidade de' : 'unidades de'} ${name}`,
    imageUrl,
    action: { label: 'Ver carrinho', href: '/cart' },
  }),
};

export function queueShopNotification(notification: FlashNotification) {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(FLASH_NOTIFICATION_KEY, JSON.stringify(notification)); } catch { /* storage may be unavailable */ }
}

export function consumeQueuedShopNotification() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(FLASH_NOTIFICATION_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(FLASH_NOTIFICATION_KEY);
    const notification = JSON.parse(raw) as FlashNotification;
    if (!notification?.tone || !notification?.title) return;
    show(notification);
  } catch { /* ignore malformed or unavailable session storage */ }
}

export type { ShopNotificationInput };
