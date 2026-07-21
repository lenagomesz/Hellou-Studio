import {
  Activity,
  AlertCircle,
  BarChart3,
  Box,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  Mail,
  Package,
  PackageSearch,
  Palette,
  Printer,
  ReceiptText,
  Settings2,
  Shield,
  Star,
  Tag,
  Tags,
  TrendingUp,
  UserRoundSearch,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { hasAdminPermission, type AdminAccessLevel, type AdminPermission } from '@/lib/admin-permissions';

export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeKey?: 'alerts';
  permission: AdminPermission;
  keywords?: string;
};

export type AdminNavigationSection = {
  label: string;
  items: AdminNavigationItem[];
};

export const ADMIN_NAVIGATION: AdminNavigationSection[] = [
  {
    label: 'Hoje',
    items: [
      { href: '/dashboard', label: 'Visão geral', description: 'Resumo da operação e prioridades do dia', icon: LayoutDashboard, exact: true, permission: 'dashboard.view', keywords: 'início home resumo' },
      { href: '/dashboard/admin-alerts', label: 'Central de alertas', description: 'Pendências e lembretes operacionais', icon: AlertCircle, badgeKey: 'alerts', permission: 'dashboard.view', keywords: 'avisos urgentes tarefas' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/dashboard/orders', label: 'Pedidos', description: 'Produção, pagamentos, envio e histórico', icon: Package, permission: 'orders.manage', keywords: 'vendas clientes rastreio' },
      { href: '/dashboard/requests', label: 'Solicitações 3D', description: 'Orçamentos de impressão personalizada', icon: Printer, permission: 'requests.manage', keywords: 'encomendas stl orçamento' },
      { href: '/dashboard/products', label: 'Produtos', description: 'Catálogo, variações e arquivos STL', icon: Box, permission: 'products.manage', keywords: 'cadastro imagens preço' },
      { href: '/dashboard/inventory', label: 'Estoque', description: 'Materiais, capacidade e reposição', icon: Warehouse, permission: 'inventory.manage', keywords: 'filamento insumos' },
      { href: '/dashboard/users', label: 'Clientes', description: 'Perfis, histórico e relacionamento', icon: Users, permission: 'customers.view', keywords: 'usuários vip' },
      { href: '/dashboard/order-ratings', label: 'Avaliações', description: 'Experiência e satisfação dos clientes', icon: Star, permission: 'reviews.manage', keywords: 'notas feedback nps' },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { href: '/dashboard/financeiro', label: 'Financeiro', description: 'Receitas, ticket e conciliação', icon: CircleDollarSign, permission: 'finance.view', keywords: 'dinheiro faturamento' },
      { href: '/dashboard/analytics', label: 'Análises', description: 'Tráfego, vendas e comportamento', icon: BarChart3, permission: 'analytics.view', keywords: 'analytics insights métricas acessos' },
      { href: '/dashboard/campaigns', label: 'Campanhas', description: 'E-mails, públicos e automações', icon: Mail, permission: 'marketing.manage', keywords: 'marketing mensagens' },
      { href: '/dashboard/coupons', label: 'Cupons', description: 'Descontos, bônus e promoções', icon: Tag, permission: 'marketing.manage', keywords: 'ofertas códigos' },
      { href: '/dashboard/calculadora', label: 'Calculadora', description: 'Custos, preços e análise de mercado', icon: Calculator, permission: 'settings.manage', keywords: 'margem lucro ia' },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { href: '/admin/security', label: 'Segurança (2FA)', description: 'Proteção da conta administrativa', icon: Shield, permission: 'dashboard.view', keywords: 'autenticação senha' },
      { href: '/dashboard/settings/features', label: 'Recursos da loja', description: 'Ative e configure funcionalidades', icon: Settings2, permission: 'settings.manage', keywords: 'configurações funcionalidades' },
      { href: '/dashboard/settings/health', label: 'Saúde dos serviços', description: 'APIs, integrações e disponibilidade', icon: Activity, permission: 'settings.manage', keywords: 'status diagnóstico sentry' },
    ],
  },
];

const DEEP_COMMANDS: AdminNavigationItem[] = [
  { href: '/dashboard/orders/bulk-actions', label: 'Pedidos em lote', description: 'Atualize vários pedidos de uma vez', icon: ClipboardList, permission: 'orders.status.manage', keywords: 'massa status' },
  { href: '/dashboard/products/new', label: 'Cadastrar produto', description: 'Crie um produto físico com imagens e variações', icon: Palette, permission: 'products.manage', keywords: 'novo adicionar upload' },
  { href: '/dashboard/products/stl', label: 'Cadastrar arquivo STL', description: 'Publique um novo produto digital', icon: FileUp, permission: 'products.manage', keywords: 'novo digital arquivo' },
  { href: '/dashboard/products/import', label: 'Importar produtos', description: 'Cadastre vários produtos por planilha', icon: FileUp, permission: 'products.manage', keywords: 'csv planilha lote' },
  { href: '/dashboard/products/bulk-edit', label: 'Editar produtos em lote', description: 'Altere preços, categorias e status', icon: PackageSearch, permission: 'products.manage', keywords: 'massa catálogo' },
  { href: '/dashboard/products/categories', label: 'Categorias e tags', description: 'Organize a descoberta dos produtos', icon: Tags, permission: 'products.manage', keywords: 'etiquetas coleção' },
  { href: '/dashboard/inventory/materials', label: 'Filamentos', description: 'Controle peso, custo, cor e reposição', icon: Warehouse, permission: 'inventory.manage', keywords: 'materiais bobinas' },
  { href: '/dashboard/inventory/costs', label: 'Gastos do estoque', description: 'Registre custos operacionais', icon: ReceiptText, permission: 'inventory.manage', keywords: 'despesas compras' },
  { href: '/dashboard/inventory/forecast', label: 'Previsão de demanda', description: 'Antecipe consumo e reposição', icon: TrendingUp, permission: 'inventory.manage', keywords: 'projeção' },
  { href: '/dashboard/inventory/suppliers', label: 'Fornecedores', description: 'Gerencie contatos e fornecimento', icon: Users, permission: 'inventory.manage', keywords: 'compras parceiros' },
  { href: '/dashboard/analytics/traffic', label: 'Tráfego do site', description: 'Visitantes, acessos, origem e páginas', icon: Activity, permission: 'analytics.view', keywords: 'anônimos audiência visitas' },
  { href: '/dashboard/analytics/segments', label: 'Segmentos de clientes', description: 'Públicos e comportamento de compra', icon: UserRoundSearch, permission: 'analytics.view', keywords: 'rfm perfis' },
  { href: '/dashboard/users/activity', label: 'Atividade dos clientes', description: 'Linha do tempo de usuários autenticados', icon: Activity, permission: 'audit.view', keywords: 'acessos logados eventos' },
  { href: '/dashboard/users/access', label: 'Equipe e acessos', description: 'Permissões da equipe administrativa', icon: Shield, permission: 'team.manage', keywords: 'sócia administradores' },
  { href: '/dashboard/settings/audit-log', label: 'Log de auditoria', description: 'Histórico de alterações administrativas', icon: ClipboardList, permission: 'audit.view', keywords: 'segurança ações' },
];

export const ADMIN_COMMANDS = [...ADMIN_NAVIGATION.flatMap((section) => section.items), ...DEEP_COMMANDS];

export function canAccessAdminItem(item: AdminNavigationItem, accessLevel: AdminAccessLevel) {
  return hasAdminPermission(accessLevel, item.permission);
}

export function getAdminRouteTitle(pathname: string) {
  return [...ADMIN_COMMANDS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? 'Admin';
}
