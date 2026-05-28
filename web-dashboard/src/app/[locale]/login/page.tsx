'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signInWithOAuth } from '@/lib/auth';

export default function LoginPage() {
  const t = useTranslations('login');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const [errorMsg, setErrorMsg] = useState('');

  // 구글 소셜 로그인 핸들러
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithOAuth('google', locale);
    } catch (err: any) {
      setErrorMsg(err.message || '소셜 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* ─────────────────────────────────────────────────────────
          LEFT PANEL: MINIMAL AUTH AREA (50%)
         ───────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col justify-between w-full lg:w-1/2 p-8 sm:p-12 md:p-20 z-10 bg-zinc-950">
        
        {/* 상단: 홈가기 버튼 */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push(`/${locale}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded hover:text-white hover:border-zinc-700 transition-all font-mono active:scale-95"
          >
            &lt; Home
          </button>
        </div>

        {/* 중앙: 로그인 카드 */}
        <div className="max-w-sm w-full mx-auto space-y-8 my-auto">
          {/* 로고 */}
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 mb-3">
              <Image 
                src="/assets/ideatik-icon-cyan.png" 
                alt="IdeaTok Logo" 
                width={32} 
                height={32} 
                className="block"
              />
              <span className="text-xl font-bold tracking-tight text-white font-en">
                Idea<em className="text-cyan-400 not-italic">Tok</em>
              </span>
            </div>
            <h2 className="text-3xl font-medium tracking-tight text-white font-en">
              Welcome Back
            </h2>
            <p className="text-sm text-zinc-500">
              {t('meta') || 'Login to your account'}
            </p>
          </div>

          {/* 에러 메세지 */}
          {errorMsg && (
            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-xs text-red-400 text-center">
              {errorMsg}
            </div>
          )}

          {/* 구글 소셜 단독 버튼 (프리미엄 미니멀 디자인) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-md shadow-black/10"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{t('btnGoogle') || 'Continue with Google'}</span>
            </button>
          </div>
        </div>

        {/* 하단: 이용약관 */}
        <div className="max-w-sm w-full mx-auto text-center">
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-zinc-400 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-zinc-400 transition-colors">Privacy Policy</a>.
          </p>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────
          RIGHT PANEL: GEOMETRIC ART AREA (50%)
         ───────────────────────────────────────────────────────── */}
      <div 
        className="hidden lg:flex relative items-center justify-center w-1/2 h-screen bg-black"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, transparent 20%, #000 90%),
            radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0%, transparent 65%),
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 24px 24px, 24px 24px',
        }}
      >
        
        {/* 중앙 타이포그래피 (엠보싱 강조 효과) */}
        <div className="relative z-10 text-center select-none">
          <h1 className="text-4xl font-medium tracking-tight text-zinc-100 font-en">
            Start Building <span className="text-cyan-400 font-semibold drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">Great Ideas</span>
          </h1>
        </div>

      </div>

    </div>
  );
}
