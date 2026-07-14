import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/api';
import {
  getAllFeatureFlags,
  getFeatureHealth,
  CATEGORY_META,
  RECOMMENDED_SETUP_PATH,
  type FeatureCategory,
} from '@/lib/feature-flags';

export async function GET() {
  const auth = await requirePermission('settings.manage');
  if (auth.response) return auth.response;

  try {
    const flags = await getAllFeatureFlags();

    // Group by category
    const grouped: Record<string, typeof flags> = {};
    for (const flag of flags) {
      if (!grouped[flag.category]) {
        grouped[flag.category] = [];
      }
      grouped[flag.category].push(flag);
    }

    // Add health status to each flag
    const flagsWithHealth = flags.map((flag) => ({
      ...flag,
      health: getFeatureHealth(flag),
    }));

    // Category summaries
    const categories = Object.entries(grouped).map(([category, categoryFlags]) => ({
      category: category as FeatureCategory,
      meta: CATEGORY_META[category as FeatureCategory],
      flags: categoryFlags.map((f) => ({
        ...f,
        health: getFeatureHealth(f),
      })),
      enabledCount: categoryFlags.filter((f) => f.enabled).length,
      totalCount: categoryFlags.length,
    }));

    // Stats
    const totalFlags = flags.length;
    const enabledFlags = flags.filter((f) => f.enabled).length;
    const setupRequired = flags.filter((f) => f.setup_required && f.enabled).length;

    // Onboarding progress
    const setupPath = RECOMMENDED_SETUP_PATH.map((step) => {
      const flag = flags.find((f) => f.key === step.key);
      return {
        ...step,
        enabled: flag?.enabled ?? false,
        completed: flag?.enabled ?? false,
      };
    });
    const setupProgress = setupPath.filter((s) => s.completed).length / setupPath.length;

    return NextResponse.json({
      flags: flagsWithHealth,
      categories,
      stats: {
        total: totalFlags,
        enabled: enabledFlags,
        disabled: totalFlags - enabledFlags,
        setupRequired,
      },
      setupPath,
      setupProgress,
    });
  } catch (err) {
    console.error('[api/admin/features] Error:', err);
    return serverError('Erro ao buscar feature flags');
  }
}
