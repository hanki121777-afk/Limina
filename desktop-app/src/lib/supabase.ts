import { createClient } from '@supabase/supabase-js';

// Vite 환경 변수 참조 (import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Limina] Warning: Supabase URL or Anon Key is missing. Check your local .env configuration.'
  );
}

// 방어적 코딩 기법 적용: 환경 변수가 부재할 때도 컴파일 오류 및 런타임 크래시가 나지 않도록 폴백 세팅
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
