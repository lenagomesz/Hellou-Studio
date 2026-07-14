/**
 * Customer Analytics Library
 * Provides RFM scoring, LTV calculation, Churn risk detection, and Segmentation
 */

// ============================================================================
// TYPES
// ============================================================================

export type CustomerSegment = 'champion' | 'loyal' | 'potential' | 'at_risk' | 'lost';

export interface RFMScore {
  recency: number;    // 0-5 (5 = bought recently)
  frequency: number;  // 0-5 (5 = buys often)
  monetary: number;   // 0-5 (5 = spends a lot)
  score: number;      // average of R, F, M
  segment: CustomerSegment;
}

export interface CustomerMetrics {
  userId: string;
  email: string;
  name: string | null;
  isVip: boolean;
  // Purchase data
  totalOrders: number;
  totalSpent: number;
  averageTicket: number;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  daysSinceLastPurchase: number | null;
  // RFM
  rfm: RFMScore;
  // LTV
  ltv: number;
  ltvProjected12m: number;
  ltvLevel: 'high' | 'medium' | 'low';
  // Churn
  churnRisk: number; // 0-100
  churnFactors: string[];
  // Preferences
  topCategory: string | null;
  topCategoryCount: number;
}

export interface CohortData {
  cohortMonth: string; // YYYY-MM
  cohortSize: number;
  retention: Record<number, number>; // month offset -> percentage retained
}

export interface SegmentStats {
  segment: CustomerSegment;
  count: number;
  percentage: number;
  avgLtv: number;
  avgFrequency: number;
  totalRevenue: number;
}

// ============================================================================
// RFM SCORING
// ============================================================================

interface OrderData {
  total: number;
  created_at: string;
  status: string;
}

/**
 * Calculate RFM score for a customer based on their orders.
 * Uses quintile-based scoring (0-5 scale).
 */
export function calculateRFMScore(
  orders: OrderData[],
  allCustomerMetrics?: { maxRecency: number; maxFrequency: number; maxMonetary: number },
): RFMScore {
  // Filter valid orders (exclude canceled/refunded)
  const validOrders = orders.filter(
    o => o.status !== 'canceled' && o.status !== 'refunded'
  );

  if (validOrders.length === 0) {
    return { recency: 0, frequency: 0, monetary: 0, score: 0, segment: 'lost' };
  }

  const now = Date.now();
  const lastOrder = validOrders.reduce((latest, o) =>
    new Date(o.created_at).getTime() > new Date(latest.created_at).getTime() ? o : latest
  );
  const daysSinceLastPurchase = Math.floor(
    (now - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalSpent = validOrders.reduce((sum, o) => sum + o.total, 0);
  const frequency = validOrders.length;

  // Score using provided thresholds or defaults
  const maxR = allCustomerMetrics?.maxRecency ?? 365;
  const maxF = allCustomerMetrics?.maxFrequency ?? 20;
  const maxM = allCustomerMetrics?.maxMonetary ?? 5000;

  // Recency: lower days = higher score
  const recency = Math.max(0, Math.min(5, Math.round(5 * (1 - daysSinceLastPurchase / maxR))));
  // Frequency: more orders = higher score
  const freqScore = Math.max(0, Math.min(5, Math.round(5 * (frequency / maxF))));
  // Monetary: more spent = higher score
  const monScore = Math.max(0, Math.min(5, Math.round(5 * (totalSpent / maxM))));

  const avg = (recency + freqScore + monScore) / 3;
  const segment = determineSegment(recency, freqScore, monScore);

  return {
    recency,
    frequency: freqScore,
    monetary: monScore,
    score: Math.round(avg * 10) / 10,
    segment,
  };
}

function determineSegment(r: number, f: number, m: number): CustomerSegment {
  // Champions: high on all dimensions
  if (r >= 4 && f >= 4 && m >= 4) return 'champion';
  // Loyal: good frequency and monetary, decent recency
  if (f >= 3 && m >= 3 && r >= 3) return 'loyal';
  // Potential: good recency but low frequency (new promising customers)
  if (r >= 3 && f < 3) return 'potential';
  // At Risk: low recency but had good history
  if (r <= 2 && (f >= 2 || m >= 2)) return 'at_risk';
  // Lost: low on everything
  return 'lost';
}

// ============================================================================
// CUSTOMER LIFETIME VALUE (LTV)
// ============================================================================

/**
 * Calculate Customer Lifetime Value.
 * LTV = total spent + (avg ticket * purchase frequency per year * estimated remaining lifespan)
 */
export function calculateLTV(
  totalSpent: number,
  avgTicket: number,
  totalOrders: number,
  firstPurchaseDate: string | null,
  _lastPurchaseDate: string | null,
): { ltv: number; projected12m: number; level: 'high' | 'medium' | 'low' } {
  if (!firstPurchaseDate || totalOrders === 0) {
    return { ltv: 0, projected12m: 0, level: 'low' };
  }

  const now = Date.now();
  const firstDate = new Date(firstPurchaseDate).getTime();
  const customerLifespanDays = Math.max(1, (now - firstDate) / (1000 * 60 * 60 * 24));
  const customerLifespanYears = customerLifespanDays / 365;

  // Purchase frequency per year
  const purchaseFreqPerYear = totalOrders / customerLifespanYears;

  // Estimated remaining lifespan: assume customers stay for 3 years total
  const estimatedTotalLifespan = 3; // years
  const remainingLifespan = Math.max(0, estimatedTotalLifespan - customerLifespanYears);

  // LTV = actual spent + projected future value
  const projectedFutureValue = avgTicket * purchaseFreqPerYear * remainingLifespan;
  const ltv = totalSpent + projectedFutureValue;

  // 12-month projection
  const projected12m = avgTicket * purchaseFreqPerYear;

  // Level thresholds (in BRL)
  let level: 'high' | 'medium' | 'low' = 'low';
  if (ltv >= 1000) level = 'high';
  else if (ltv >= 300) level = 'medium';

  return { ltv: Math.round(ltv * 100) / 100, projected12m: Math.round(projected12m * 100) / 100, level };
}

// ============================================================================
// CHURN RISK
// ============================================================================

/**
 * Calculate churn risk score (0-100, where 100 = highest risk).
 * Factors:
 * - Days since last purchase vs average purchase interval
 * - Decreasing frequency trend
 * - Time as customer
 */
export function calculateChurnRisk(
  daysSinceLastPurchase: number | null,
  totalOrders: number,
  firstPurchaseDate: string | null,
  lastPurchaseDate: string | null,
  churnThresholdDays: number = 90,
): { risk: number; factors: string[] } {
  if (totalOrders === 0 || !firstPurchaseDate) {
    return { risk: 0, factors: ['Sem compras registradas'] };
  }

  const factors: string[] = [];
  let riskScore = 0;

  const days = daysSinceLastPurchase ?? 0;

  // Factor 1: Days since last purchase (0-40 points)
  if (days > churnThresholdDays * 2) {
    riskScore += 40;
    factors.push(`Sem compras ha ${days} dias (muito acima do limite de ${churnThresholdDays}d)`);
  } else if (days > churnThresholdDays) {
    riskScore += 25;
    factors.push(`Sem compras ha ${days} dias (acima do limite de ${churnThresholdDays}d)`);
  } else if (days > churnThresholdDays * 0.7) {
    riskScore += 15;
    factors.push(`Sem compras ha ${days} dias (se aproximando do limite)`);
  }

  // Factor 2: Purchase frequency declining (0-30 points)
  if (firstPurchaseDate && lastPurchaseDate) {
    const firstDate = new Date(firstPurchaseDate).getTime();
    const lastDate = new Date(lastPurchaseDate).getTime();
    const lifespanDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const expectedInterval = lifespanDays / Math.max(1, totalOrders - 1);

    if (days > expectedInterval * 3) {
      riskScore += 30;
      factors.push('Intervalo entre compras 3x maior que o habitual');
    } else if (days > expectedInterval * 2) {
      riskScore += 20;
      factors.push('Intervalo entre compras 2x maior que o habitual');
    } else if (days > expectedInterval * 1.5) {
      riskScore += 10;
      factors.push('Intervalo entre compras ligeiramente acima do habitual');
    }
  }

  // Factor 3: Low engagement / single purchase (0-20 points)
  if (totalOrders === 1) {
    riskScore += 20;
    factors.push('Apenas 1 compra realizada (cliente one-time)');
  } else if (totalOrders === 2) {
    riskScore += 10;
    factors.push('Apenas 2 compras realizadas');
  }

  // Factor 4: Time as customer vs activity (0-10 points)
  if (firstPurchaseDate) {
    const lifespanDays = (Date.now() - new Date(firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24);
    if (lifespanDays > 365 && totalOrders <= 2) {
      riskScore += 10;
      factors.push('Cliente ha mais de 1 ano com poucas compras');
    }
  }

  return {
    risk: Math.min(100, riskScore),
    factors: factors.length > 0 ? factors : ['Nenhum fator de risco identificado'],
  };
}

// ============================================================================
// COHORT ANALYSIS
// ============================================================================

interface CohortOrder {
  user_id: string;
  created_at: string;
  status: string;
}

interface CohortUser {
  id: string;
  created_at: string;
}

/**
 * Build cohort retention data.
 * Groups customers by first purchase month and tracks retention.
 */
export function buildCohortData(
  users: CohortUser[],
  orders: CohortOrder[],
): CohortData[] {
  // Filter valid orders
  const validOrders = orders.filter(
    o => o.status !== 'canceled' && o.status !== 'refunded'
  );

  // Group users by registration month (cohort)
  const cohorts = new Map<string, Set<string>>();
  for (const user of users) {
    const month = user.created_at.slice(0, 7); // YYYY-MM
    if (!cohorts.has(month)) cohorts.set(month, new Set());
    cohorts.get(month)!.add(user.id);
  }

  // For each user, find which months they made purchases
  const userPurchaseMonths = new Map<string, Set<string>>();
  for (const order of validOrders) {
    if (!userPurchaseMonths.has(order.user_id)) {
      userPurchaseMonths.set(order.user_id, new Set());
    }
    userPurchaseMonths.get(order.user_id)!.add(order.created_at.slice(0, 7));
  }

  // Build cohort retention data
  const result: CohortData[] = [];
  const sortedCohorts = Array.from(cohorts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [cohortMonth, userIds] of sortedCohorts) {
    const cohortSize = userIds.size;
    const retention: Record<number, number> = {};
    const cohortDate = new Date(cohortMonth + '-01');

    // Check retention for months 1-12
    for (let monthOffset = 1; monthOffset <= 12; monthOffset++) {
      const targetDate = new Date(cohortDate);
      targetDate.setMonth(targetDate.getMonth() + monthOffset);
      const targetMonth = targetDate.toISOString().slice(0, 7);

      let retainedCount = 0;
      for (const userId of userIds) {
        const purchaseMonths = userPurchaseMonths.get(userId);
        if (purchaseMonths && purchaseMonths.has(targetMonth)) {
          retainedCount++;
        }
      }

      retention[monthOffset] = cohortSize > 0
        ? Math.round((retainedCount / cohortSize) * 100)
        : 0;
    }

    result.push({ cohortMonth, cohortSize, retention });
  }

  return result;
}

// ============================================================================
// SEGMENT LABELS & COLORS
// ============================================================================

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  champion: 'Champions',
  loyal: 'Loyal',
  potential: 'Potential',
  at_risk: 'At Risk',
  lost: 'Lost',
};

export const SEGMENT_COLORS: Record<CustomerSegment, string> = {
  champion: '#22c55e', // green
  loyal: '#3b82f6',    // blue
  potential: '#a855f7', // purple
  at_risk: '#f59e0b',  // amber
  lost: '#6b7280',     // gray
};

export const SEGMENT_BG_CLASSES: Record<CustomerSegment, string> = {
  champion: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  loyal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  potential: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  at_risk: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  lost: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function getChurnRiskColor(risk: number): string {
  if (risk >= 70) return 'text-red-600';
  if (risk >= 40) return 'text-amber-600';
  return 'text-green-600';
}

export function getLtvLevelColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return 'text-green-600';
  if (level === 'medium') return 'text-amber-600';
  return 'text-red-600';
}

export function getRfmScoreColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 2.5) return 'text-amber-600';
  return 'text-red-600';
}
