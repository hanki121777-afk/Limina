import { supabase } from './supabaseClient';
import { Provider } from '@supabase/supabase-js';

/**
 * 이메일과 비밀번호를 사용하여 로그인합니다.
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

/**
 * 이메일과 비밀번호를 사용하여 회원가입합니다.
 * 사용자 메타데이터에 가입 언어 정보를 동봉합니다.
 */
export async function signUpWithEmail(email: string, password: string, language: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        language: language
      }
    }
  });

  if (error) throw error;
  return data;
}

/**
 * 구글/카카오 등 소셜 로그인 공급자를 이용해 OAuth 인증을 개시합니다.
 * 호스트 주소를 동적으로 감지하여 인증 완료 후 되돌아올 리다이렉트 주소를 지정합니다.
 */
export async function signInWithOAuth(provider: Provider, locale: string) {
  let redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${locale}/dashboard` 
    : '';

  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) {
      const tabParam = searchParams.get('tab');
      redirectUrl = `${window.location.origin}/${locale}/${redirectParam}${tabParam ? `?tab=${tabParam}` : ''}`;
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl
    }
  });

  if (error) throw error;
  return data;
}

/**
 * 현재 로그인 상태를 해제하고 로그아웃합니다.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
