export type AdminAccessLevel = 'owner' | 'partner';

export type AdminPermission =
  | 'dashboard.view'
  | 'orders.manage'
  | 'orders.status.manage'
  | 'requests.manage'
  | 'products.manage'
  | 'products.status.manage'
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
  customPermissions?: AdminPermission[] | null,
) {
  return normalizeAdminAccessLevel(level) === 'owner'
    || (customPermissions?.length ? customPermissions.includes(permission) : PARTNER_PERMISSIONS.has(permission));
}

export const ADMIN_PERMISSION_OPTIONS: { key: AdminPermission; label: string }[] = [
  { key: 'dashboard.view', label: 'Visualizar painel' },
  { key: 'orders.manage', label: 'Gerenciar pedidos e devoluções' },
  { key: 'orders.status.manage', label: 'Alterar status de pedidos' },
  { key: 'requests.manage', label: 'Gerenciar encomendas 3D' },
  { key: 'products.manage', label: 'Gerenciar catálogo' },
  { key: 'products.delete', label: 'Excluir produtos' },
  { key: 'inventory.manage', label: 'Gerenciar estoque' },
  { key: 'customers.view', label: 'Visualizar clientes' },
  { key: 'customers.manage', label: 'Editar clientes' },
  { key: 'reviews.manage', label: 'Moderar avaliações' },
  { key: 'finance.view', label: 'Visualizar financeiro e fiscal' },
  { key: 'analytics.view', label: 'Visualizar análises' },
  { key: 'marketing.manage', label: 'Gerenciar marketing' },
  { key: 'team.manage', label: 'Gerenciar equipe' },
  { key: 'audit.view', label: 'Visualizar auditoria' },
  { key: 'settings.manage', label: 'Alterar configurações e páginas' },
];

export function isRestrictedAdminPath(pathname: string, level: AdminAccessLevel) {
  if (level === 'owner') return false;

  return [
    '/dashboard/financeiro',
    '/dashboard/analytics',
    '/dashboard/campaigns',
    '/dashboard/coupons',
    '/dashboard/calculadora',
    '/dashboard/orders/bulk-actions',
    '/dashboard/settings',
    '/dashboard/users/access',
    '/dashboard/users/activity',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
