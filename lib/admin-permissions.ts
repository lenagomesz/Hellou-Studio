export type AdminAccessLevel = 'owner' | 'partner';

export type AdminPermission =
  | 'dashboard.view'
  | 'orders.manage'
  | 'requests.manage'
  | 'products.manage'
  | 'products.delete'
  | 'inventory.manage'
  | 'customers.view'
  | 'customers.manage'
  | 'customers.delete'
  | 'reviews.manage'
  | 'finance.view'
  | 'analytics.view'
  | 'marketing.manage'
  | 'team.manage'
  | 'audit.view'
  | 'settings.manage';

const PARTNER_PERMISSIONS = new Set<AdminPermission>([
  'dashboard.view',
  'orders.manage',
  'requests.manage',
  'products.manage',
  'inventory.manage',
  'customers.view',
  'reviews.manage',
]);

export function normalizeAdminAccessLevel(value: unknown): AdminAccessLevel {
  return value === 'partner' ? 'partner' : 'owner';
}

export function hasAdminPermission(
  level: AdminAccessLevel | null | undefined,
  permission: AdminPermission,
) {
  return normalizeAdminAccessLevel(level) === 'owner' || PARTNER_PERMISSIONS.has(permission);
}

export function isRestrictedAdminPath(pathname: string, level: AdminAccessLevel) {
  if (level === 'owner') return false;

  return [
    '/dashboard/financeiro',
    '/dashboard/analytics',
    '/dashboard/campaigns',
    '/dashboard/coupons',
    '/dashboard/calculadora',
    '/dashboard/settings',
    '/dashboard/users/access',
    '/dashboard/users/activity',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

