import { getSupabaseAdmin } from '@/lib/supabase';

export interface BrandVoice {
  id: string;
  tone: 'casual' | 'professional' | 'balanced';
  toneDescription?: string;
  targetAgeMin: number;
  targetAgeMax: number;
  interests: string[];
  brandRules: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export async function getBrandVoice(): Promise<BrandVoice> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('ai_brand_voice')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('[getBrandVoice] Error:', error);
    throw new Error('Failed to fetch brand voice guidelines');
  }

  return {
    id: data.id,
    tone: data.tone,
    toneDescription: data.tone_description,
    targetAgeMin: data.target_age_min,
    targetAgeMax: data.target_age_max,
    interests: data.interests || [],
    brandRules: data.brand_rules,
    language: data.language,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateBrandVoice(updates: Partial<BrandVoice>): Promise<BrandVoice> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('ai_brand_voice')
    .update({
      tone: updates.tone,
      tone_description: updates.toneDescription,
      target_age_min: updates.targetAgeMin,
      target_age_max: updates.targetAgeMax,
      interests: updates.interests,
      brand_rules: updates.brandRules,
      language: updates.language,
      updated_at: new Date().toISOString(),
    })
    .eq('id', updates.id)
    .select()
    .single();

  if (error || !data) {
    console.error('[updateBrandVoice] Error:', error);
    throw new Error('Failed to update brand voice guidelines');
  }

  return {
    id: data.id,
    tone: data.tone,
    toneDescription: data.tone_description,
    targetAgeMin: data.target_age_min,
    targetAgeMax: data.target_age_max,
    interests: data.interests || [],
    brandRules: data.brand_rules,
    language: data.language,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
