import { getSupabaseAdmin } from '@/lib/supabase';

// Types
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  category: FeatureCategory;
  icon: string | null;
  route: string | null;
  dependencies: string[];
  setup_required: boolean;
  setup_steps: SetupStep[] | null;
  documentation_url: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SetupStep {
  title: string;
  description: string;
  completed: boolean;
}

export interface FeatureUsageStat {
  id: string;
  feature_key: string;
  metric_name: string;
  metric_value: number;
  period: string;
  recorded_at: string;
}

interface FeatureDependency {
  key: string;
  name: string;
  enabled: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type FeatureCategory =
  | 'Products'
  | 'Orders'
  | 'Users'
  | 'Analytics'
  | 'Automation'
  | 'Inventory'
  | 'Integrations';

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  'Products',
  'Orders',
  'Users',
  'Analytics',
  'Automation',
  'Inventory',
  'Integrations',
];

export type FeatureHealthStatus = 'healthy' | 'warning' | 'error';

export interface FeatureHealth {
  status: FeatureHealthStatus;
  message: string;
  lastChecked: string;
}

// Category metadata
export const CATEGORY_META: Record<
  FeatureCategory,
  { label: string; description: string; color: string }
> = {
  Products: {
    label: 'Produtos',
    description: 'Gerenciamento avancado de produtos',
    color: 'blue',
  },
  Orders: {
    label: 'Pedidos',
    description: 'Automacao e gestao de pedidos',
    color: 'green',
  },
  Users: {
    label: 'Usuarios',
    description: 'Analise e segmentacao de clientes',
    color: 'purple',
  },
  Analytics: {
    label: 'Analiticos',
    description: 'Metricas e previsoes avancadas',
    color: 'orange',
  },
  Automation: {
    label: 'Automacao',
    description: 'Campanhas e triggers automaticos',
    color: 'pink',
  },
  Inventory: {
    label: 'Estoque',
    description: 'Controle e previsao de inventario',
    color: 'teal',
  },
  Integrations: {
    label: 'Integracoes',
    description: 'Conexoes com servicos externos',
    color: 'indigo',
  },
};

// Recommended setup path for onboarding
export const RECOMMENDED_SETUP_PATH = [
  {
    key: 'slack_integration',
    title: 'Configurar integracao Slack',
    description: 'Receba notificacoes em tempo real no Slack',
  },
  {
    key: 'rfm_analysis',
    title: 'Configurar segmentos RFM',
    description: 'Entenda seus clientes com analise RFM',
  },
  {
    key: 'email_campaigns',
    title: 'Criar primeira campanha de email',
    description: 'Engaje seus clientes com email marketing',
  },
  {
    key: 'stock_alerts',
    title: 'Configurar alertas de estoque',
    description: 'Nunca fique sem estoque novamente',
  },
  {
    key: 'anomaly_detection',
    title: 'Ativar deteccao de anomalias',
    description: 'Seja notificado sobre metricas fora do padrao',
  },
];

// Server-side functions

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[feature-flags] Error fetching flags:', error);
    return [];
  }
  return (data ?? []) as FeatureFlag[];
}

export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('[feature-flags] Error fetching flag:', key, error);
    return null;
  }
  return data as FeatureFlag | null;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await getFeatureFlag(key);
  return flag?.enabled ?? false;
}

export async function toggleFeatureFlag(
  key: string,
  enabled: boolean,
  userId: string,
  userEmail: string,
): Promise<{ success: boolean; error?: string; flag?: FeatureFlag }> {
  const supabase = getSupabaseAdmin();

  // Check dependencies if enabling
  if (enabled) {
    const flag = await getFeatureFlag(key);
    if (flag?.dependencies && flag.dependencies.length > 0) {
      const { data: deps } = await supabase
        .from('feature_flags')
        .select('key, name, enabled')
        .in('key', flag.dependencies);

      const disabledDeps = ((deps ?? []) as FeatureDependency[]).filter((dependency) => !dependency.enabled);
      if (disabledDeps.length > 0) {
        // Auto-enable dependencies
        for (const dep of disabledDeps) {
          await supabase
            .from('feature_flags')
            .update({ enabled: true, updated_at: new Date().toISOString(), updated_by: userEmail })
            .eq('key', dep.key);

          await createAuditLog({
            user_id: userId,
            user_email: userEmail,
            action: 'feature_auto_enabled',
            entity_type: 'feature_flag',
            entity_id: dep.key,
            entity_name: dep.name,
            details: { reason: `Auto-enabled as dependency of ${key}` },
          });
        }
      }
    }
  }

  // Toggle the flag
  const { data, error } = await supabase
    .from('feature_flags')
    .update({
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: userEmail,
    })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    console.error('[feature-flags] Error toggling flag:', key, error);
    return { success: false, error: error.message };
  }

  // Create audit log
  await createAuditLog({
    user_id: userId,
    user_email: userEmail,
    action: enabled ? 'feature_enabled' : 'feature_disabled',
    entity_type: 'feature_flag',
    entity_id: key,
    entity_name: data?.name,
    details: { enabled },
  });

  return { success: true, flag: data as FeatureFlag };
}

export async function createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('audit_logs').insert(log);
  if (error) {
    console.error('[audit] Error creating log:', error);
  }
}

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  entity_type?: string;
  user_email?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.entity_type) {
    query = query.eq('entity_type', params.entity_type);
  }
  if (params.user_email) {
    query = query.eq('user_email', params.user_email);
  }
  if (params.action) {
    query = query.eq('action', params.action);
  }
  if (params.from_date) {
    query = query.gte('created_at', params.from_date);
  }
  if (params.to_date) {
    query = query.lte('created_at', params.to_date);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[audit] Error fetching logs:', error);
    return { logs: [], total: 0 };
  }

  return { logs: (data ?? []) as AuditLog[], total: count ?? 0 };
}

export async function getFeatureUsageStats(featureKey: string): Promise<FeatureUsageStat[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('feature_usage_stats')
    .select('*')
    .eq('feature_key', featureKey)
    .order('recorded_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[feature-flags] Error fetching stats:', error);
    return [];
  }
  return (data ?? []) as FeatureUsageStat[];
}

// Get health status for features (simulated based on available data)
export function getFeatureHealth(flag: FeatureFlag): FeatureHealth {
  // Default healthy
  if (!flag.enabled) {
    return { status: 'healthy', message: 'Feature desativada', lastChecked: new Date().toISOString() };
  }

  if (flag.setup_required && !flag.setup_steps?.every((s) => s.completed)) {
    return {
      status: 'warning',
      message: 'Setup incompleto',
      lastChecked: new Date().toISOString(),
    };
  }

  return { status: 'healthy', message: 'Operando normalmente', lastChecked: new Date().toISOString() };
}
