'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { Idea } from '../../../../../../shared/types/idea';

export default function IdeaDetailPage() {
  const t = useTranslations('ideas');
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const locale = (params?.locale as string) || 'en';
  const ideaId = params?.id as string;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // 개별 프롬프트의 복사 상태 제어용 객체 (키: step 번호, 값: 복사완료 여부)
  const [copiedSteps, setCopiedSteps] = useState<Record<number, boolean>>({});

  // ─────────────────────────────────────────────────────────
  // 1. 인증 가드 및 2중 소유권 검증
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // 세션 없으면 로그인 화면으로 추방
        router.replace(`/${locale}/login`);
      } else {
        setUserEmail(session.user?.email ?? null);
        setSessionChecked(true);
        fetchIdeaDetail(session.user.id);
      }
    }).catch(() => {
      router.replace(`/${locale}/login`);
    });
  }, [locale, ideaId, router]);

  // Supabase 상세 단건 조회
  const fetchIdeaDetail = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single();

      if (error || !data) {
        throw new Error('Not found');
      }

      const retrievedIdea = data as Idea;

      // 2중 보안 가드: 조회한 아이디어의 소유자 user_id가 현재 로그인 유저 ID와 다르면 추방
      if (retrievedIdea.user_id !== userId) {
        console.warn('[IdeaTok Guard] Unauthorized data access attempt. Redirecting.');
        router.replace(`/${locale}/dashboard`);
        return;
      }

      setIdea(retrievedIdea);
    } catch (err) {
      console.error('Error loading idea details:', err);
      router.replace(`/${locale}/dashboard`);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 2. 단독 프롬프트 복사 핸들러 (1.5초 복구 타이머)
  // ─────────────────────────────────────────────────────────
  const handleCopyPrompt = (stepNum: number, content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // 복사 완료 피드백 활성화
        setCopiedSteps(prev => ({ ...prev, [stepNum]: true }));
        
        // 1.5초 뒤 상태 원복
        setTimeout(() => {
          setCopiedSteps(prev => ({ ...prev, [stepNum]: false }));
        }, 1500);
      })
      .catch((err) => {
        console.error('Failed to copy prompt text:', err);
      });
  };

  // ─────────────────────────────────────────────────────────
  // 3. 로그아웃 핸들러
  // ─────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace(`/${locale}/login`);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 4. 언어 전환 스위처 핸들러
  // ─────────────────────────────────────────────────────────
  const handleLanguageChange = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    router.push(newPath);
  };

  if (!sessionChecked || loading) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-cyan-400 font-mono">
        {t('loading') || 'RETRIEVING VAULT INFO...'}
      </div>
    );
  }

  if (!idea) return null;

  return (
    <div 
      className="min-h-screen bg-black text-white font-sans overflow-y-auto"
      style={{
        backgroundImage: `
          radial-gradient(circle at top center, rgba(6, 182, 212, 0.08) 0%, transparent 60%),
          linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 24px 24px, 24px 24px',
      }}
    >
      
      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
          {/* 로고 */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push(`/${locale}/dashboard`)}
          >
            <Image 
              src="/assets/ideatik-icon-cyan.png" 
              alt="IdeaTok Logo" 
              width={24} 
              height={24} 
            />
            <span className="text-md font-bold tracking-tight text-white font-en">
              Idea<em className="text-cyan-400 not-italic">Tok</em>
            </span>
          </div>

          {/* 우측 네비게이션 */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500 hidden sm:inline">{userEmail}</span>
            <select
              value={locale}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="ko">KO</option>
              <option value="en">EN</option>
              <option value="ja">JA</option>
              <option value="zh-CN">简</option>
              <option value="zh-TW">繁</option>
              <option value="es">ES</option>
            </select>
            <button 
              onClick={handleSignOut}
              className="px-3 py-1.5 text-zinc-400 border border-zinc-800 rounded hover:text-white hover:border-zinc-700 transition-all font-mono active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 py-8 md:px-12">
        
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors font-mono"
          >
            &lt; {t('back') || 'Back to Dashboard'}
          </button>
        </div>

        {/* 2컬럼 레이아웃 */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ─────────────────────────────────────────────────────────
              LEFT COLUMN: BUSINESS BLUEPRINT (비즈니스 설계판 - 45%)
             ───────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-[45%] space-y-6">
            <div className="border border-zinc-800 bg-zinc-900/20 p-8 rounded-2xl backdrop-blur-xl">
              
              {/* 등급 점수 및 타이틀 */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded font-mono ${
                  idea.grade === 'GOLD' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                  idea.grade === 'SILVER' ? 'bg-zinc-400/10 text-zinc-300 border border-zinc-400/20' :
                  'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                }`}>
                  {idea.grade} · {idea.score.toFixed(1)}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(idea.created_at).toLocaleDateString(locale)}
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white mb-6">
                {idea.title}
              </h2>

              {/* 융합 경로 (Context) */}
              <div className="mb-8 p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2 font-mono">
                  {t('contextTitle') || 'FUSION CONTEXT PATH'}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {idea.context}
                </p>
              </div>

              {/* 아이디어 말맛 요약 */}
              <div className="mb-8">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line border-l-2 border-cyan-500/30 pl-4 font-sans italic">
                  &ldquo;{idea.idea}&rdquo;
                </p>
              </div>

              {/* 4대 비즈니스 설계 뼈대 */}
              <div className="space-y-6 pt-6 border-t border-zinc-900">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">
                  {t('businessTitle') || 'BUSINESS BLUEPRINT'}
                </h3>
                
                {/* 1. 타겟 고객 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.target') || 'Target Audience'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed pl-4">
                    {idea.business?.target || '-'}
                  </p>
                </div>

                {/* 2. 핵심 문제 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.problem') || 'Core Problem'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed pl-4">
                    {idea.business?.problem || '-'}
                  </p>
                </div>

                {/* 3. 해결 솔루션 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.solution') || 'Proposed Solution'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed pl-4">
                    {idea.business?.solution || '-'}
                  </p>
                </div>

                {/* 4. 수익 모델 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.revenue') || 'Revenue Stream'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed pl-4">
                    {idea.business?.revenue_model || '-'}
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              RIGHT COLUMN: ACCELERATING PROMPTS (프롬프트 발전소 - 55%)
             ───────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-[55%] space-y-6">
            <div className="border border-zinc-800 bg-zinc-900/10 p-8 rounded-2xl backdrop-blur-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-6 font-mono">
                ⚡ {t('promptTitle') || 'AI ACCELERATING WORKSPACE'}
              </h3>

              {/* 5단계 프롬프트 반복 렌더링 */}
              <div className="space-y-6">
                {idea.prompts?.map((p) => {
                  const isCopied = !!copiedSteps[p.step];
                  return (
                    <div 
                      key={p.step}
                      className="group border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(6,182,212,0.08)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-zinc-500 font-mono">
                          STEP 0{p.step} · {p.title}
                        </span>
                        
                        {/* 복사 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(p.step, p.content)}
                          className={`text-[10px] px-2.5 py-1 rounded font-mono font-medium transition-all duration-200 active:scale-95 border ${
                            isCopied 
                              ? 'bg-cyan-500 border-cyan-500 text-black font-semibold' 
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {isCopied ? t('prompt.copied') || 'Copied ✓' : t('prompt.copy') || 'Copy'}
                        </button>
                      </div>
                      
                      {/* 프롬프트 스크립트 */}
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap select-all">
                        {p.content}
                      </p>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
