import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────
// 타입 정의 — api.md 5-8 / 6-4 스키마 기준
// ─────────────────────────────────────────────────────────
export interface IdeaUploadPayload {
  grade: string;
  score: number;
  title: string;
  context?: string;
  idea?: string;
  business?: Record<string, string>;
  prompts?: Array<{ step: number; title: string; content: string }>;
  locale: string;
  userId: string;
  accessToken: string;
  score_breakdown?: any;
  reality_check?: any;
}

// ─────────────────────────────────────────────────────────
// Supabase ideas 테이블에 분석 결과 INSERT
// 성공 시 생성된 UUID 반환, 실패 시 null 반환
// ─────────────────────────────────────────────────────────
export async function uploadIdeaToSupabase(
  payload: IdeaUploadPayload
): Promise<string | null> {
  const env = import.meta.env as Record<string, string | undefined>;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('[Limina IdeaUpload] Supabase env vars not configured. Skipping upload.');
    return null;
  }

  try {
    // 유저 accessToken으로 인증된 클라이언트 생성 (RLS 통과용)
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${payload.accessToken}` },
      },
    });

    const { data, error } = await client
      .from('ideas')
      .insert({
        user_id: payload.userId,
        grade: payload.grade,
        score: payload.score,
        title: payload.title,
        context: payload.context ?? null,
        idea: payload.idea ?? null,
        business: payload.business ?? null,
        prompts: payload.prompts ?? null,
        locale: payload.locale,
        score_breakdown: payload.score_breakdown ?? null,
        reality_check: payload.reality_check ?? null,
      })
      .select('id');


    if (error) {
      console.error('[Limina IdeaUpload] Insert error:', error.message);
      return null;
    }

    const rows = data as Array<{ id: string }> | null;
    const ideaId = rows?.[0]?.id ?? null;
    console.log(`[Limina IdeaUpload] Saved to Supabase. ID: ${ideaId}`);
    return ideaId;
  } catch (err) {
    console.error('[Limina IdeaUpload] Upload failed:', (err as Error).message);
    return null;
  }
}
