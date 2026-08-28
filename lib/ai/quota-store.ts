import { getSupabaseAdmin } from '@/lib/supabase';
import { GeminiQuotaError, type QuotaKind } from './quota-error';

const localPauses = new Map<string, GeminiQuotaError>();
export const geminiModelName = () => process.env.GOOGLE_GENAI_MODEL || 'gemini-3.6-flash';

export async function getGeminiQuotaPause(model = geminiModelName()): Promise<GeminiQuotaError | null> {
  const local = localPauses.get(model);
  if (local && Date.parse(local.retryAt) > Date.now()) return local;
  localPauses.delete(model);
  try {
    const { data, error } = await getSupabaseAdmin().from('ai_quota_pauses').select('kind,retry_at').eq('model', model).maybeSingle();
    if (error) throw error;
    if (data && ['daily', 'rate'].includes(data.kind) && Date.parse(data.retry_at) > Date.now()) {
      const pause = new GeminiQuotaError(data.kind as QuotaKind, data.retry_at);
      localPauses.set(model, pause);
      return pause;
    }
  } catch {
    // Degraded mode: the client still remembers an observed 429 in this instance.
    // Install the quota migration to share the pause across serverless instances.
  }
  return null;
}

export async function rememberGeminiQuotaPause(pause: GeminiQuotaError, model = geminiModelName()) {
  const previous = localPauses.get(model);
  const effective = previous && Date.parse(previous.retryAt) > Date.parse(pause.retryAt) ? previous : pause;
  localPauses.set(model, effective);
  try {
    const { error } = await getSupabaseAdmin().rpc('pause_gemini_quota', {
      p_model: model, p_kind: effective.kind, p_retry_at: effective.retryAt,
    });
    if (error) throw error;
  } catch { console.warn('[gemini-quota] Pausa apenas local; confira a migração de cotas.'); }
}
