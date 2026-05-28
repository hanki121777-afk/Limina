'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    // 실시간 인증 리스너를 통해 비동기 세션 지연을 방어하고 정확한 방향으로 리다이렉트
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[IdeaTok Home Redirect] Event:', event, 'Session:', session ? 'Active' : 'Null');
      if (session) {
        router.replace(`/${locale}/dashboard`);
      } else {
        router.replace(`/${locale}/login`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [locale, router]);

  return (
    <div className="flex min-h-screen bg-black items-center justify-center text-cyan-400 font-mono">
      REDIRECTING TO VAULT...
    </div>
  );
}

