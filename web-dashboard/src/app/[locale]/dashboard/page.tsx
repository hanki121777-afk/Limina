'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { Idea } from '../../../../../shared/types/idea';
import { Settings, Inbox } from 'lucide-react';

const LANGUAGES = [
  { code: 'ko', label: 'KR 한국어' },
  { code: 'en', label: 'US English' },
  { code: 'ja', label: 'JP 日本語' },
  { code: 'zh-CN', label: 'CN 简体中文' },
  { code: 'zh-TW', label: 'TW 繁體中文' },
  { code: 'es', label: 'ES Español' }
];

/* ─────────────────────────────────────────────
   커스텀 모달 컴포넌트
───────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}

function Modal({ open, title, description, confirmLabel, cancelLabel, onConfirm, onClose, danger, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{description}</p>
        {children}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 border border-zinc-800 rounded-lg hover:text-white hover:border-zinc-600 transition-all"
          >
            {cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all active:scale-95 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-cyan-500 text-black hover:bg-cyan-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (params?.locale as string) || 'en';

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  /* ─── 삭제 확인 모달 상태 ─── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // 1. 인증 및 세션 검증 가드 + 실시간 구독(Realtime) 연동
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    let channel: any = null;

    // 인증 상태 실시간 모니터링 및 세션 가드 (초기 마운트 시의 세션 로드 딜레이 완벽 대응)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Limina Auth] Event:', event, 'Session:', session ? 'Active' : 'Null');
      
      if (session) {
        setUserEmail(session.user?.email ?? null);
        setUserId(session.user.id);
        setSessionChecked(true);
        fetchIdeas(session.user.id);

        // Supabase Realtime 채널 구독 활성화 (중복 구독 방지)
        if (!channel) {
          channel = supabase
            .channel('realtime-ideas')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'ideas',
                filter: `user_id=eq.${session.user.id}`
              },
              (payload) => {
                console.log('[Limina Realtime] Change detected:', payload);
                if (payload.eventType === 'INSERT') {
                  const newIdea = payload.new as Idea;
                  if (!newIdea.deleted) {
                    setIdeas(prev => [newIdea, ...prev]);
                  }
                } else if (payload.eventType === 'UPDATE') {
                  const updatedIdea = payload.new as Idea;
                  setIdeas(prev => {
                    if (updatedIdea.deleted) {
                      // 소프트 삭제 시 리스트에서 제외
                      return prev.filter(item => item.id !== updatedIdea.id);
                    }
                    // 별표 및 필드 업데이트 반영
                    return prev.map(item => item.id === updatedIdea.id ? updatedIdea : item);
                  });
                } else if (payload.eventType === 'DELETE') {
                  const deletedIdea = payload.old as { id: string };
                  setIdeas(prev => prev.filter(item => item.id !== deletedIdea.id));
                }
              }
            )
            .subscribe();
        }
      } else {
        // 세션이 완전히 없는 경우에만 로그인 페이지로 추방
        router.replace(`/${locale}/login`);
      }
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscription.unsubscribe();
    };
  }, [locale, router]);

  // ─────────────────────────────────────────────────────────
  // 2. Supabase 데이터 조회 (최신순, deleted = false)
  // ─────────────────────────────────────────────────────────
  const fetchIdeas = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas((data as Idea[]) || []);
    } catch (err) {
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 3. 별표(★) 즐겨찾기 토글 기능
  // ─────────────────────────────────────────────────────────
  const handleToggleStar = async (ideaId: string, currentStarred: boolean) => {
    try {
      // 로컬 상태 즉시 변경 (Optimistic Update)
      setIdeas(prev => prev.map(item => 
        item.id === ideaId ? { ...item, starred: !currentStarred } : item
      ));

      const { error } = await supabase
        .from('ideas')
        .update({ starred: !currentStarred })
        .eq('id', ideaId);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling star status:', err);
      // 실패 시 원래 상태 복구
      setIdeas(prev => prev.map(item => 
        item.id === ideaId ? { ...item, starred: currentStarred } : item
      ));
    }
  };

  // ─────────────────────────────────────────────────────────
  // 4. 소프트 삭제 (Soft Delete - deleted = true)
  // ─────────────────────────────────────────────────────────
  const handleSoftDelete = (ideaId: string) => {
    setDeletingIdeaId(ideaId);
    setShowDeleteModal(true);
  };

  const confirmSoftDelete = async () => {
    if (!deletingIdeaId) return;
    try {
      // 로컬 상태 즉시 제외 (Optimistic Update)
      setIdeas(prev => prev.filter(item => item.id !== deletingIdeaId));
      setShowDeleteModal(false);

      const { error } = await supabase
        .from('ideas')
        .update({ deleted: true })
        .eq('id', deletingIdeaId);

      if (error) throw error;
    } catch (err) {
      console.error('Error soft deleting idea:', err);
      // 실패 시 리스트 재조회
      if (userId) fetchIdeas(userId);
    } finally {
      setDeletingIdeaId(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // 5. 로그아웃 핸들러
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
  // 6. 언어 전환 스위처 핸들러
  // ─────────────────────────────────────────────────────────
  const handleLanguageChange = (newLocale: string) => {
    // 예: /ko/dashboard -> /en/dashboard 로 주소 교체
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    router.push(newPath);
  };

  const filteredIdeas = filterStarredOnly 
    ? ideas.filter(item => item.starred) 
    : ideas;

  if (!sessionChecked || loading) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-cyan-400 font-mono">
        LOADING VAULT...
      </div>
    );
  }

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
      
      {/* ─────────────────────────────────────────────────────────
          GLOBAL HEADER
         ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
          {/* 로고 */}
          <div 
            onClick={() => {
              const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3001';
              window.location.href = `${landingUrl}/${locale}`;
            }}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
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
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-300 hidden sm:inline">{userEmail}</span>
            
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

            {/* 설정 버튼 */}
            <button
              id="dashboard-settings-btn"
              onClick={() => router.push(`/${locale}/settings`)}
              title="Settings"
              className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center hover:bg-orange-500/20 hover:border-orange-500/30 transition-all active:scale-95 group"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-orange-400 group-hover:text-orange-300 transition-colors" />
            </button>

            {/* 로그아웃 버튼 */}
            <button 
              onClick={handleSignOut}
              className="px-3 py-1.5 text-zinc-300 border border-zinc-800 rounded hover:text-white hover:border-zinc-700 transition-all font-mono active:scale-95"
            >
              {tCommon('signOut')}
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────
          MAIN CONTAINER
         ───────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-10 md:px-12 min-h-[calc(100vh-4rem)]">
        
        {/* 필터 탭 바 */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <button
              onClick={setFilterStarredOnly.bind(null, false)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${!filterStarredOnly ? 'bg-cyan-500 text-black' : 'bg-zinc-900 text-zinc-300 hover:text-white'}`}
            >
              {t('filterAll') || 'All Ideas'}
            </button>
            <button
              onClick={setFilterStarredOnly.bind(null, true)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${filterStarredOnly ? 'bg-cyan-500 text-black' : 'bg-zinc-900 text-zinc-300 hover:text-white'}`}
            >
              <span>★</span>
              <span>{t('filterStarred') || 'Favorites'}</span>
            </button>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            TOTAL: {filteredIdeas.length}
          </span>
        </div>

        {/* 아이디어 목록 조작 (텅 비어 있을 때) */}
        {filteredIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
              <Inbox className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-300">{t('emptyList') || 'No ideas detected yet.'}</p>
          </div>
        ) : (
          /* 아이디어 카드 그리드 피드 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIdeas.map((item) => (
              <div 
                key={item.id}
                onClick={() => router.push(`/${locale}/ideas/${item.id}?from=dashboard`)}
                className="group relative flex flex-col justify-between border border-zinc-800/80 bg-zinc-900/25 p-6 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(39,224,161,0.15)] cursor-pointer"
              >
                
                {/* 카드 상단: 등급 & 별표 & 휴지통 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      item.grade === 'GOLD' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                      item.grade === 'SILVER' ? 'bg-zinc-400/10 text-zinc-300 border border-zinc-400/20' :
                      'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                    }`}>
                      {item.grade} · {item.score.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* 별표 토글 버튼 */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(item.id, item.starred);
                      }}
                      className={`text-base leading-none transition-colors active:scale-90 ${item.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'} relative z-10`}
                      aria-label="Toggle favorite"
                    >
                      ★
                    </button>
                    {/* 휴지통 삭제 버튼 */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSoftDelete(item.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 active:scale-90 transition-colors relative z-10"
                      aria-label="Delete idea"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* 카드 본문 */}
                <div className="flex-1 space-y-3 mb-6">
                  <h3 className="text-lg font-semibold tracking-tight text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {item.context}
                  </p>
                  <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    {item.idea}
                  </p>
                </div>

                {/* 카드 푸터: 날짜 */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono">
                  <span>
                    {new Date(item.created_at).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="uppercase text-[9px]">{item.locale}</span>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* 아이디어 삭제 확인 모달 */}
      <Modal
        open={showDeleteModal}
        title={t('confirmDelete')}
        description={t('confirmDeleteDesc')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        onConfirm={confirmSoftDelete}
        onClose={() => { setShowDeleteModal(false); setDeletingIdeaId(null); }}
        danger
      />

    </div>
  );
}
