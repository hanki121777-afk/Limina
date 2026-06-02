'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { Idea } from '../../../../../../shared/types/idea';
import { ArrowLeft } from 'lucide-react';

// 난이도 별점 렌더러 함수
function renderDifficultyStars(difficulty: string | number) {
  const diffStr = String(difficulty).trim();
  let stars = 0;
  let maxStars = 3;

  if (diffStr.includes('★') || diffStr.includes('⭐')) {
    return <span className="text-amber-400 font-mono">{diffStr}</span>;
  }

  if (diffStr === '상' || diffStr === '높음' || diffStr.toLowerCase() === 'high' || diffStr === '3') {
    stars = 3;
    maxStars = 3;
  } else if (diffStr === '중' || diffStr === '보통' || diffStr.toLowerCase() === 'medium' || diffStr === '2') {
    stars = 2;
    maxStars = 3;
  } else if (diffStr === '하' || diffStr === '낮음' || diffStr.toLowerCase() === 'low' || diffStr === '1') {
    stars = 1;
    maxStars = 3;
  } else {
    const num = parseInt(diffStr, 10);
    if (!isNaN(num)) {
      stars = num;
      maxStars = 5;
    } else {
      return <span className="text-zinc-300 font-medium">{diffStr}</span>;
    }
  }

  return (
    <span className="text-amber-400 font-mono text-sm tracking-wider">
      {'★'.repeat(stars)}{'☆'.repeat(Math.max(0, maxStars - stars))}
    </span>
  );
}

const LANGUAGES = [
  { code: 'ko', label: 'KR 한국어' },
  { code: 'en', label: 'US English' },
  { code: 'ja', label: 'JP 日本語' },
  { code: 'zh-CN', label: 'CN 简体中文' },
  { code: 'zh-TW', label: 'TW 繁體中文' },
  { code: 'es', label: 'ES Español' }
];

export default function IdeaDetailPage() {
  const t = useTranslations('ideas');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  
  const locale = (params?.locale as string) || 'en';
  const ideaId = params?.id as string;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // 개별 프롬프트의 복사 상태 제어용 객체 (키: step 번호, 값: 복사완료 여부)
  const [copiedSteps, setCopiedSteps] = useState<Record<number, boolean>>({});

  // 언어 선택 드롭다운 상태
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

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
        console.warn('[Limina Guard] Unauthorized data access attempt. Redirecting.');
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
          radial-gradient(circle at top center, rgba(39, 224, 161, 0.08) 0%, transparent 60%),
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
              src="/assets/limina-icon-cyan.png" 
              alt="Limina Logo" 
              width={24} 
              height={24} 
            />
            <span className="text-md font-bold tracking-tight text-white font-en">
              Lim<em className="text-white not-italic">ina</em>
            </span>
          </div>

          {/* 우측 네비게이션 */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-300 hidden sm:inline">{userEmail}</span>
            <button
              onClick={() => router.push(`/${locale}/dashboard`)}
              className="flex items-center gap-2 py-2 px-1 text-base text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
              <span>{tCommon('dashboard')}</span>
            </button>
            {/* 커스텀 로케일 셀렉터 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="appearance-none border border-zinc-800 bg-zinc-900/50 backdrop-blur rounded-lg px-3 py-2 text-sm text-zinc-300 w-[120px] flex items-center justify-between transition-all hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
              >
                <span>{LANGUAGES.find(l => l.code === locale)?.label.split(' ')[0]} {LANGUAGES.find(l => l.code === locale)?.label.split(' ')[1]}</span>
                <span className="text-[10px] text-zinc-500 ml-1 transition-transform duration-200" style={{ transform: langDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </button>
              
              {langDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />
                  <ul className="absolute top-[calc(100%+8px)] left-0 w-[145px] bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 py-1">
                    {LANGUAGES.map((lang) => (
                      <li key={lang.code}>
                        <button
                          type="button"
                          onClick={() => {
                            handleLanguageChange(lang.code);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-cyan-500/10 hover:text-cyan-400 flex items-center gap-2 ${
                            locale === lang.code ? 'text-cyan-400 font-semibold bg-cyan-500/5' : 'text-zinc-400'
                          }`}
                        >
                          {lang.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <button 
              onClick={handleSignOut}
              className="px-3 py-1.5 text-zinc-300 border border-zinc-800 rounded hover:text-white hover:border-zinc-700 transition-all font-mono active:scale-95"
            >
              {tCommon('signOut')}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 py-8 md:px-12">
        
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <button
            onClick={() => {
              if (from === 'settings') {
                router.push(`/${locale}/settings?tab=stats`);
              } else {
                router.push(`/${locale}/dashboard`);
              }
            }}
            className="flex items-center gap-2 py-2 px-1 text-base text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
            <span>
              {from === 'settings'
                ? t('backToStats') || 'To My Stats'
                : t('backToDashboard') || 'To Dashboard'}
            </span>
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
                <span className="text-[10px] text-zinc-400 font-mono">
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
                  <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.target') || 'Target Audience'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed pl-4">
                    {idea.business?.target || '-'}
                  </p>
                </div>

                {/* 2. 핵심 문제 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.problem') || 'Core Problem'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed pl-4">
                    {idea.business?.problem || '-'}
                  </p>
                </div>

                {/* 3. 해결 솔루션 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.solution') || 'Proposed Solution'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed pl-4">
                    {idea.business?.solution || '-'}
                  </p>
                </div>

                {/* 4. 수익 모델 */}
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <span className="text-cyan-400">⊙</span> {t('business.revenue') || 'Revenue Stream'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed pl-4">
                    {idea.business?.revenue_model || '-'}
                  </p>
                </div>
              </div>

            </div>

            {/* SCORE BREAKDOWN CARD */}
            {idea.score_breakdown && (
              <div className="border border-zinc-800 bg-zinc-900/20 p-8 rounded-2xl backdrop-blur-xl space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                  <span>📊</span> {t('scoreBreakdownTitle') || 'AI Evaluation Rubric'}
                </h3>
                
                <div className="space-y-5">
                  {[
                    { key: 'feasibility', max: 3, label: t('scoreBreakdown.feasibility') || 'Feasibility' },
                    { key: 'market_size', max: 2, label: t('scoreBreakdown.market_size') || 'Market Size' },
                    { key: 'revenue_clarity', max: 2, label: t('scoreBreakdown.revenue_clarity') || 'Revenue Clarity' },
                    { key: 'differentiation', max: 2, label: t('scoreBreakdown.differentiation') || 'Differentiation' },
                    { key: 'user_fit', max: 1, label: t('scoreBreakdown.user_fit') || 'User Fit' }
                  ].map((item) => {
                    const breakdown = idea.score_breakdown?.[item.key as keyof typeof idea.score_breakdown];
                    if (!breakdown) return null;
                    const percent = Math.min((breakdown.score / item.max) * 100, 100);
                    
                    return (
                      <div key={item.key} className="space-y-2">
                        <div className="flex justify-between items-end text-xs">
                          <span className="font-semibold text-zinc-200">{item.label}</span>
                          <span className="font-mono text-cyan-400 font-semibold">
                            {breakdown.score.toFixed(1)} / {item.max.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded overflow-hidden">
                          <div 
                            className="h-full rounded transition-all duration-500 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        {breakdown.reason && (
                          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans pl-1">
                            &bull; {breakdown.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REALITY CHECK CARD */}
            {idea.reality_check && (
              <div className="border border-zinc-800 bg-zinc-900/20 p-8 rounded-2xl backdrop-blur-xl space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                  <span>⚖️</span> {t('realityCheckTitle') || 'Reality Check'}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* 초기 비용 */}
                  {idea.reality_check.initial_cost && (
                    <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                        {t('realityCheck.initial_cost') || 'Initial Cost'}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {idea.reality_check.initial_cost}
                      </span>
                    </div>
                  )}
                  
                  {/* 월 운영비 */}
                  {idea.reality_check.monthly_cost && (
                    <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                        {t('realityCheck.monthly_cost') || 'Monthly Cost'}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {idea.reality_check.monthly_cost}
                      </span>
                    </div>
                  )}

                  {/* 손익분기점 */}
                  {idea.reality_check.breakeven_point && (
                    <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                        {t('realityCheck.breakeven_point') || 'Breakeven Point'}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {idea.reality_check.breakeven_point}
                      </span>
                    </div>
                  )}

                  {/* 구현 난이도 */}
                  {idea.reality_check.difficulty && (
                    <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">
                        {t('realityCheck.difficulty') || 'Difficulty'}
                      </span>
                      <div className="flex items-center min-h-[1.25rem]">
                        {renderDifficultyStars(idea.reality_check.difficulty)}
                      </div>
                    </div>
                  )}
                </div>

                {/* 지금 바로 할 수 있는 행동 (First Action) - 글래스모피즘 */}
                {idea.reality_check.first_action && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 p-4 rounded-md space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-4 -mt-4 pointer-events-none" />
                    <span className="text-[10px] font-bold tracking-wider block uppercase flex items-center gap-1.5 font-mono">
                      <span className="animate-pulse text-cyan-300">⚡</span> {t('realityCheck.first_action') || 'Immediate First Step'}
                    </span>
                    <p className="text-xs leading-relaxed font-semibold text-cyan-300">
                      {idea.reality_check.first_action}
                    </p>
                  </div>
                )}
              </div>
            )}

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
                      className="group border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(39,224,161,0.08)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-zinc-400 font-mono">
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
                      <div className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-900/60 shadow-inner">
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap select-all">
                          {p.content}
                        </p>
                      </div>
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
