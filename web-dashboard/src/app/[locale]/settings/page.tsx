'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import {
  User, Crown, Receipt, Monitor, Sliders, Target,
  BarChart2, Ban, Bell, Lock, Database, HelpCircle,
  BookOpen, Mail, Bug, ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { Idea } from '../../../../../shared/types/idea';

/* ─────────────────────────────────────────────
   타입 정의
───────────────────────────────────────────── */
type NavSection =
  | 'profile' | 'subscription' | 'billing' | 'devices'
  | 'ideaSettings' | 'bizCondition' | 'stats' | 'blacklist'
  | 'notifications' | 'security' | 'data' | 'help';

const RECOMMEND_TAG_GROUPS = [
  {
    categoryKey: 'biz_startup',
    tags: ['startup', 'saas_b2b', 'commerce', 'logistics', 'hr', 'legal_tax', 'fintech']
  },
  {
    categoryKey: 'tech_digital',
    tags: ['it_ai', 'game_ent', 'contents_media', 'social_community']
  },
  {
    categoryKey: 'lifestyle',
    tags: ['lifestyle_interior', 'interior_remodel', 'fashion', 'travel_leisure', 'mobility', 'pet']
  },
  {
    categoryKey: 'health_care',
    tags: ['beauty', 'fitness', 'healthcare', 'senior', 'parenting']
  },
  {
    categoryKey: 'food_agri',
    tags: ['food_service', 'agritech']
  },
  {
    categoryKey: 'invest_real',
    tags: ['investing', 'real_estate']
  },
  {
    categoryKey: 'edu_env',
    tags: ['education', 'eco']
  }
] as const;

interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  language: string;
  created_at: string;
  early_bird: boolean;
}

interface Subscription {
  plan: 'free' | 'pro_monthly' | 'pro_yearly';
  next_billing_date: string | null;
  usage_this_month: number;
  usage_limit: number;
  license_key: string | null;
}

interface IdeaStat {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
  report: number;
  avg_score: number;
  starred: number;
}

interface BizCondition {
  budget: string;
  time: string;
  type: string;
  online: string;
  goal: string;
}

interface NotificationSettings {
  gold_popup: boolean;
  silver_bronze_popup: boolean;
  email_alert: boolean;
  dnd_enabled: boolean;
  dnd_from: string;
  dnd_to: string;
}

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

/* ─────────────────────────────────────────────
   Toggle 컴포넌트
───────────────────────────────────────────── */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-cyan-500' : 'bg-zinc-700'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

/* ─────────────────────────────────────────────
   카드 래퍼
───────────────────────────────────────────── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
      <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest mb-5 font-mono">{title}</h2>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   필드 컴포넌트
───────────────────────────────────────────── */
function FieldLabel({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mb-1">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {note && <span className="ml-2 text-[10px] text-zinc-600">{note}</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   메인 페이지 컴포넌트
───────────────────────────────────────────── */
export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';

  /* ─── 인증 상태 ─── */
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* ─── 현재 선택된 섹션 ─── */
  const [activeSection, setActiveSection] = useState<NavSection>('profile');

  /* ─── 프로필 ─── */
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    nickname: '',
    language: locale,
    created_at: '',
    early_bird: false,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  /* ─── 구독 ─── */
  const [subscription, setSubscription] = useState<Subscription>({
    plan: 'free',
    next_billing_date: null,
    usage_this_month: 0,
    usage_limit: 10,
    license_key: null,
  });
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* ─── 통계 ─── */
  const [stats, setStats] = useState<IdeaStat>({ total: 0, gold: 0, silver: 0, bronze: 0, report: 0, avg_score: 0, starred: 0 });

  /* ─── 최근 아이디어 ─── */
  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([]);

  /* ─── 블랙리스트 ─── */
  const [blacklist, setBlacklist] = useState<string[]>(['paypal.com', 'bankofamerica.com']);
  const [blacklistInput, setBlacklistInput] = useState('');
  const [blacklistError, setBlacklistError] = useState('');

  /* ─── 알림 ─── */
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    gold_popup: true,
    silver_bronze_popup: true,
    email_alert: false,
    dnd_enabled: false,
    dnd_from: '23:00',
    dnd_to: '07:00',
  });

  /* ─── 관심 태그 ─── */
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(['창업', 'startup', '副業']);
  const [triggerInput, setTriggerInput] = useState('');

  /* ─── 퀄리티 모드 ─── */
  const [qualityMode, setQualityMode] = useState<'strict' | 'balance' | 'sensitive'>('balance');

  /* ─── 사업화 조건 ─── */
  const [bizCondition, setBizCondition] = useState<BizCondition>({
    budget: 'budgetOpt2',
    time: 'timeOpt2',
    type: 'typeOpt1',
    online: 'onlineOpt1',
    goal: 'goalOpt2',
  });
  const [bizSaved, setBizSaved] = useState(false);

  /* ─── 보안 ─── */
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

  /* ─── 데이터 모달 ─── */
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  /* ─── 복사 버튼 ─── */
  const [licenseCopied, setLicenseCopied] = useState(false);

  /* ─────────────────────────────────────────────
     인증 가드 + 초기 데이터 로드
  ───────────────────────────────────────────── */
  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUserId(session.user.id);
        setProfile(prev => ({
          ...prev,
          id: session.user.id,
          email: session.user.email ?? '',
          created_at: session.user.created_at ?? '',
          nickname: session.user.user_metadata?.nickname || session.user.email?.split('@')[0] || '',
          early_bird: session.user.user_metadata?.early_bird ?? false,
        }));
        setSessionChecked(true);
        // 통계 로드
        loadStats(session.user.id);
        // DND 설정 로드
        loadUserSettings(session.user.id);
        // 구독 및 라이선스 정보 로드
        loadSubscriptionAndLicense(session.user.id);
      } else {
        router.replace(`/${locale}/login`);
      }
    });
    return () => authSub.unsubscribe();
  }, [locale, router]);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as NavSection | null;
    if (tabParam && ['profile', 'subscription', 'billing', 'devices', 'ideaSettings', 'bizCondition', 'stats', 'blacklist', 'notifications', 'security', 'data', 'help'].includes(tabParam)) {
      setActiveSection(tabParam);
      localStorage.setItem('settings_active_tab', tabParam);
    } else {
      const savedTab = localStorage.getItem('settings_active_tab') as NavSection | null;
      if (savedTab && ['profile', 'subscription', 'billing', 'devices', 'ideaSettings', 'bizCondition', 'stats', 'blacklist', 'notifications', 'security', 'data', 'help'].includes(savedTab)) {
        setActiveSection(savedTab);
      }
    }
  }, [searchParams]);

  const loadStats = async (uid: string) => {
    const { data } = await supabase
      .from('ideas')
      .select('grade, score, starred')
      .eq('user_id', uid)
      .eq('deleted', false);

    if (data) {
      const gold = data.filter(d => d.grade === 'GOLD').length;
      const silver = data.filter(d => d.grade === 'SILVER').length;
      const bronze = data.filter(d => d.grade === 'BRONZE').length;
      const report = data.filter(d => d.grade === 'REPORT').length;
      const starred = data.filter(d => d.starred).length;
      const avg = data.length > 0 ? data.reduce((acc, d) => acc + (d.score || 0), 0) / data.length : 0;
      setStats({ total: data.length, gold, silver, bronze, report, avg_score: avg, starred });
    }

    const { data: recentData } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', uid)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentData) {
      setRecentIdeas(recentData as Idea[]);
    }
  };

  const loadSubscriptionAndLicense = async (uid: string) => {
    try {
      // 1) 구독 정보 조회
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('tier, expires_at')
        .eq('user_id', uid)
        .maybeSingle();

      // 2) 라이선스 키 조회
      const { data: licData, error: licError } = await supabase
        .from('licenses')
        .select('license_key')
        .eq('user_id', uid)
        .maybeSingle();

      // 3) 당월 사용량 집계 (이번 달에 생성된 아이디어 수)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: usageCount, error: countError } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('deleted', false)
        .gte('created_at', firstDayOfMonth);

      if (subError) console.error('Error fetching subscription:', subError);
      if (licData === null && !licError) {
        console.log('License not found, creating one...');
      } else if (licError) {
        console.error('Error fetching license:', licError);
      }
      if (countError) console.error('Error counting usage:', countError);

      const tierMap: Record<string, 'free' | 'pro_monthly' | 'pro_yearly'> = {
        'Free': 'free',
        'Pro': 'pro_monthly',
        'Enterprise': 'pro_yearly'
      };

      const plan = subData ? (tierMap[subData.tier] || 'free') : 'free';
      const limit = plan === 'free' ? 10 : 9999;

      setSubscription({
        plan,
        next_billing_date: subData?.expires_at || null,
        usage_this_month: usageCount || 0,
        usage_limit: limit,
        license_key: licData?.license_key || null,
      });
    } catch (err) {
      console.error('Error loading subscription and license:', err);
    }
  };

  const handleToggleRecentStar = async (ideaId: string, currentStarred: boolean) => {
    try {
      setRecentIdeas(prev => prev.map(item => 
        item.id === ideaId ? { ...item, starred: !currentStarred } : item
      ));

      const { error } = await supabase
        .from('ideas')
        .update({ starred: !currentStarred })
        .eq('id', ideaId);

      if (error) throw error;
      
      if (userId) {
        loadStats(userId);
      }
    } catch (err) {
      console.error('Error toggling recent star status:', err);
      setRecentIdeas(prev => prev.map(item => 
        item.id === ideaId ? { ...item, starred: currentStarred } : item
      ));
    }
  };

  const handleSoftDeleteRecent = async (ideaId: string) => {
    try {
      setRecentIdeas(prev => prev.filter(item => item.id !== ideaId));

      const { error } = await supabase
        .from('ideas')
        .update({ deleted: true })
        .eq('id', ideaId);

      if (error) throw error;
      
      if (userId) {
        loadStats(userId);
      }
    } catch (err) {
      console.error('Error soft deleting recent idea:', err);
      if (userId) {
        loadStats(userId);
      }
    }
  };

  const loadUserSettings = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('do_not_disturb_enabled, do_not_disturb_start, do_not_disturb_end')
        .eq('id', uid)
        .single();

      if (data && !error) {
        setNotifSettings(prev => ({
          ...prev,
          dnd_enabled: data.do_not_disturb_enabled ?? false,
          dnd_from: data.do_not_disturb_start ? data.do_not_disturb_start.slice(0, 5) : '23:00',
          dnd_to: data.do_not_disturb_end ? data.do_not_disturb_end.slice(0, 5) : '07:00',
        }));
      }
    } catch (err) {
      console.error('Error loading DND settings:', err);
    }
  };

  const updateDNDSettings = async (enabled: boolean, from: string, to: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          do_not_disturb_enabled: enabled,
          do_not_disturb_start: from ? `${from}:00` : '23:00:00',
          do_not_disturb_end: to ? `${to}:00` : '07:00:00',
        })
        .eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating DND settings:', err);
    }
  };

  /* ─────────────────────────────────────────────
     로그아웃
  ───────────────────────────────────────────── */
  const handleSignOut = async () => {
    await signOut();
    router.replace(`/${locale}/login`);
  };

  /* ─────────────────────────────────────────────
     프로필 저장
  ───────────────────────────────────────────── */
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { nickname: profile.nickname, early_bird: profile.early_bird }
    });
    setProfileSaving(false);
    if (!error) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      // 언어가 바뀌면 이동
      if (profile.language !== locale) {
        const newPath = `/${profile.language}/settings`;
        router.push(newPath);
      }
    }
  };

  /* ─────────────────────────────────────────────
     블랙리스트 추가
  ───────────────────────────────────────────── */
  const handleAddBlacklist = () => {
    const domain = blacklistInput.trim().toLowerCase();
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (!domainRegex.test(domain)) {
      setBlacklistError(t('blacklist.invalidDomain'));
      return;
    }
    if (!blacklist.includes(domain)) {
      setBlacklist(prev => [...prev, domain]);
    }
    setBlacklistInput('');
    setBlacklistError('');
  };

  /* ─────────────────────────────────────────────
     사업화 조건 저장 (로컬 + Supabase user_metadata)
  ───────────────────────────────────────────── */
  const handleSaveBiz = async () => {
    await supabase.auth.updateUser({ data: { biz_condition: bizCondition } });
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  /* ─────────────────────────────────────────────
     아이디어 JSON 내보내기
  ───────────────────────────────────────────── */
  const handleExportJson = async () => {
    if (!userId) return;
    const { data } = await supabase.from('ideas').select('*').eq('user_id', userId).eq('deleted', false);
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liminas_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ─────────────────────────────────────────────
     아이디어 CSV 내보내기
  ───────────────────────────────────────────── */
  const handleExportCsv = async () => {
    if (!userId) return;
    const { data } = await supabase.from('ideas').select('*').eq('user_id', userId).eq('deleted', false);
    if (data && data.length > 0) {
      const keys = ['id', 'grade', 'score', 'title', 'created_at', 'locale'];
      const csv = [keys.join(','), ...data.map(d => keys.map(k => JSON.stringify((d as any)[k] ?? '')).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liminas_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ─────────────────────────────────────────────
     네비게이션 아이템 목록
  ───────────────────────────────────────────── */
  const navItems: { key: NavSection; icon: LucideIcon }[] = [
    { key: 'profile', icon: User },
    { key: 'subscription', icon: Crown },
    { key: 'billing', icon: Receipt },
    { key: 'ideaSettings', icon: Sliders },
    { key: 'bizCondition', icon: Target },
    { key: 'blacklist', icon: Ban },
    { key: 'stats', icon: BarChart2 },
    { key: 'devices', icon: Monitor },
    { key: 'notifications', icon: Bell },
    { key: 'security', icon: Lock },
    { key: 'data', icon: Database },
    { key: 'help', icon: HelpCircle },
  ];

  /* ─────────────────────────────────────────────
     로딩 화면
  ───────────────────────────────────────────── */
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center text-cyan-400 font-mono text-sm">
        {t('loading')}
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     플랜 이름 매핑
  ───────────────────────────────────────────── */
  const planLabel = {
    free: t('subscription.planFree'),
    pro_monthly: t('subscription.planProMonthly'),
    pro_yearly: t('subscription.planProYearly'),
  }[subscription.plan];

  /* ─────────────────────────────────────────────
     섹션 렌더러
  ───────────────────────────────────────────── */
  const renderSection = () => {
    switch (activeSection) {

      /* ── 1. 프로필 ── */
      case 'profile':
        return (
          <>
            <SectionCard title={t('profile.title')}>
              <div className="space-y-5">
                {/* 이메일 */}
                <div>
                  <FieldLabel label={t('profile.email')} note={t('profile.emailNote')} />
                  <div className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-500 font-mono">
                    {profile.email}
                  </div>
                </div>

                {/* 닉네임 */}
                <div>
                  <FieldLabel label={t('profile.nickname')} />
                  <input
                    id="settings-nickname"
                    type="text"
                    value={profile.nickname}
                    onChange={e => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder={t('profile.nicknamePlaceholder')}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* 언어 */}
                <div>
                  <FieldLabel label={t('profile.language')} />
                  <select
                    id="settings-language"
                    value={profile.language}
                    onChange={e => setProfile(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                  >
                    <option value="ko">🇰🇷 한국어</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="zh-CN">🇨🇳 简体中文</option>
                    <option value="zh-TW">🇹🇼 繁體中文</option>
                    <option value="es">🇪🇸 Español</option>
                  </select>
                </div>

                {/* 가입일 */}
                <div>
                  <FieldLabel label={t('profile.joinedAt')} />
                  <div className="text-sm text-zinc-400 font-mono">
                    {profile.created_at
                      ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(profile.created_at))
                      : '—'}
                  </div>
                </div>

                {/* 얼리버드 뱃지 */}
                {profile.early_bird && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
                    <span className="text-amber-400 text-base">🐦</span>
                    <div>
                      <span className="text-xs font-bold text-amber-400">{t('profile.earlyBird')}</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{t('profile.earlyBirdDesc')}</p>
                    </div>
                  </div>
                )}

                <button
                  id="settings-save-profile"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="w-full rounded-lg bg-cyan-500 text-black font-semibold py-2.5 text-sm hover:bg-cyan-400 active:scale-95 transition-all disabled:opacity-50"
                >
                  {profileSaved ? tCommon('saved') : profileSaving ? tCommon('saving') : t('profile.saveProfile')}
                </button>
              </div>
            </SectionCard>
          </>
        );

      /* ── 2. 구독 ── */
      case 'subscription':
        return (
          <>
            <SectionCard title={t('subscription.title')}>
              <div className="space-y-5">
                {/* 현재 플랜 */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-1">{t('subscription.currentPlan')}</p>
                    <span className={`text-xl font-bold ${subscription.plan === 'free' ? 'text-zinc-300' : 'text-cyan-400'}`}>
                      {planLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-zinc-500 mb-1">{t('subscription.nextBilling')}</p>
                    <span className="text-sm text-zinc-300 font-mono">
                      {subscription.next_billing_date
                        ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(subscription.next_billing_date))
                        : t('subscription.noBilling')}
                    </span>
                  </div>
                </div>

                {/* 사용량 */}
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-2">
                    <span>{t('subscription.usageThisMonth')}</span>
                    <span className="font-mono">{subscription.usage_this_month} {t('subscription.usageOf')} {subscription.usage_limit} {t('subscription.usageLimit')}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-2 rounded-full bg-cyan-500 transition-all"
                      style={{ width: `${Math.min((subscription.usage_this_month / subscription.usage_limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 라이선스 키 */}
                <div>
                  <FieldLabel label={t('subscription.licenseKey')} />
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-500 font-mono truncate">
                      {subscription.license_key || t('subscription.noLicense')}
                    </div>
                    {subscription.license_key && (
                      <button
                        id="settings-copy-license"
                        onClick={() => {
                          navigator.clipboard.writeText(subscription.license_key!);
                          setLicenseCopied(true);
                          setTimeout(() => setLicenseCopied(false), 2000);
                        }}
                        className="px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                      >
                        {licenseCopied ? tCommon('copied') : tCommon('copy')}
                      </button>
                    )}
                  </div>
                </div>

                {/* 연간 전환 버튼 */}
                {subscription.plan === 'pro_monthly' && (
                  <button
                    id="settings-upgrade-yearly"
                    className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-semibold py-2.5 text-sm hover:bg-cyan-500/20 active:scale-95 transition-all"
                  >
                    {t('subscription.upgradeYearly')}
                  </button>
                )}

                {/* 구독 취소 */}
                {subscription.plan !== 'free' && (
                  <button
                    id="settings-cancel-subscription"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full rounded-lg border border-zinc-800 text-zinc-500 text-sm py-2.5 hover:border-red-500/30 hover:text-red-400 active:scale-95 transition-all"
                  >
                    {t('subscription.cancelSubscription')}
                  </button>
                )}
              </div>
            </SectionCard>

            <Modal
              open={showCancelModal}
              title={t('subscription.cancelConfirmTitle')}
              description={t('subscription.cancelConfirmDesc')}
              confirmLabel={t('subscription.cancelConfirmBtn')}
              cancelLabel={tCommon('cancel')}
              onConfirm={() => { setShowCancelModal(false); }}
              onClose={() => setShowCancelModal(false)}
              danger
            />
          </>
        );

      /* ── 3. 결제 내역 ── */
      case 'billing':
        return (
          <SectionCard title={t('billing.title')}>
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-600">{t('billing.empty')}</p>
            </div>
          </SectionCard>
        );

      /* ── 4. 연결된 기기 ── */
      case 'devices':
        return (
          <SectionCard title={t('devices.title')}>
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-3">
                <Monitor className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-600">{t('devices.empty')}</p>
              <p className="text-xs text-zinc-700 mt-2">{t('devices.connectNote')}</p>
            </div>
          </SectionCard>
        );

      /* ── 5. 아이디어 설정 ── */
      case 'ideaSettings':
        return (
          <>
            <SectionCard title={t('ideaSettings.interests')}>
              <p className="text-xs text-zinc-400 mb-3">{t('ideaSettings.interestsDesc')}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {interests.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  >
                    {tag}
                    <button onClick={() => setInterests(prev => prev.filter(t => t !== tag))} className="text-cyan-600 hover:text-red-400 leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  id="settings-interest-input"
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && interestInput.trim()) {
                      if (interests.length >= 8) return;
                      setInterests(prev => [...new Set([...prev, interestInput.trim()])]);
                      setInterestInput('');
                    }
                  }}
                  placeholder={t('ideaSettings.interestPlaceholder')}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
              {interests.length >= 8 && (
                <p className="text-xs text-amber-400 mt-1">{t('ideaSettings.interestMax')}</p>
              )}

              {interests.length < 8 && (
                <div className="mt-6 pt-5 border-t border-zinc-800/80">
                  <h4 className="text-xs font-semibold text-zinc-100 mb-4">
                    {t('ideaSettings.recommendTags.title')}
                  </h4>
                  <div className="space-y-4">
                    {RECOMMEND_TAG_GROUPS.map(group => {
                      const availableTags = group.tags.filter(tagKey => {
                        const translated = t(`ideaSettings.recommendTags.tags.${tagKey}`);
                        return !interests.includes(translated);
                      });

                      if (availableTags.length === 0) return null;

                      return (
                        <div key={group.categoryKey} className="space-y-2">
                          <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                            {t(`ideaSettings.recommendTags.categories.${group.categoryKey}`)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {availableTags.map(tagKey => {
                              const translated = t(`ideaSettings.recommendTags.tags.${tagKey}`);
                              return (
                                <button
                                  key={tagKey}
                                  onClick={() => {
                                    if (interests.length >= 8) return;
                                    setInterests(prev => [...new Set([...prev, translated])]);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-400 border border-zinc-800 hover:border-zinc-700/60 text-xs transition-all active:scale-95"
                                >
                                  + {translated}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title={t('ideaSettings.qualityMode')}>
              <div className="grid grid-cols-3 gap-3">
                {(['strict', 'balance', 'sensitive'] as const).map(mode => (
                  <button
                    key={mode}
                    id={`settings-quality-${mode}`}
                    onClick={() => setQualityMode(mode)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      qualityMode === mode
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                    }`}
                  >
                    <p className={`text-xs font-bold mb-1 ${qualityMode === mode ? 'text-cyan-400' : 'text-zinc-300'}`}>
                      {t(`ideaSettings.${mode}`)}
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-snug">{t(`ideaSettings.${mode}Desc`)}</p>
                  </button>
                ))}
              </div>
            </SectionCard>
          </>
        );

      /* ── 6. 사업화 조건 ── */
      case 'bizCondition':
        return (
          <SectionCard title={t('bizCondition.title')}>
            <p className="text-xs text-zinc-500 mb-5">{t('bizCondition.desc')}</p>
            <div className="space-y-5">
              {([
                { key: 'budget', opts: ['budgetOpt0', 'budgetOpt1', 'budgetOpt2', 'budgetOpt3', 'budgetOpt4'] as const },
                { key: 'time', opts: ['timeOpt1', 'timeOpt2', 'timeOpt3', 'timeOpt4'] as const },
                { key: 'type', opts: ['typeOpt1', 'typeOpt2', 'typeOpt3'] as const },
                { key: 'online', opts: ['onlineOpt1', 'onlineOpt2', 'onlineOpt3'] as const },
                { key: 'goal', opts: ['goalOpt1', 'goalOpt2', 'goalOpt3', 'goalOpt4'] as const },
              ] as { key: keyof BizCondition; opts: string[] }[]).map(({ key, opts }) => (
                <div key={key}>
                  <p className="text-xs font-medium text-zinc-400 mb-2">{t(`bizCondition.${key}`)}</p>
                  <div className="flex flex-wrap gap-2">
                    {opts.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setBizCondition(prev => ({ ...prev, [key]: opt }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          bizCondition[key] === opt
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        {t(`bizCondition.${opt}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                id="settings-save-biz"
                onClick={handleSaveBiz}
                className="w-full rounded-lg bg-cyan-500 text-black font-semibold py-2.5 text-sm hover:bg-cyan-400 active:scale-95 transition-all mt-4"
              >
                {bizSaved ? tCommon('saved') : t('bizCondition.save')}
              </button>
            </div>
          </SectionCard>
        );

      /* ── 7. 통계 ── */
      case 'stats':
        return (
          <SectionCard title={t('stats.title')}>
            {stats.total === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-3">
                  <BarChart2 className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-600">{t('stats.noData')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 요약 카드 그리드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: t('stats.gold'), value: stats.gold, color: 'text-amber-400', bg: 'bg-amber-400/5 border-amber-400/20' },
                    { label: t('stats.silver'), value: stats.silver, color: 'text-zinc-300', bg: 'bg-zinc-400/5 border-zinc-400/20' },
                    { label: t('stats.bronze'), value: stats.bronze, color: 'text-cyan-400', bg: 'bg-cyan-400/5 border-cyan-400/20' },
                    { label: t('stats.report'), value: stats.report, color: 'text-purple-400', bg: 'bg-purple-400/5 border-purple-400/20' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-xl border ${bg} p-4 text-center`}>
                      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* 총계 및 평균 */}
                <div className="flex gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold font-mono text-white">{stats.total}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{t('stats.totalIdeas')}</p>
                  </div>
                  <div className="w-px bg-zinc-800" />
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold font-mono text-cyan-400">{stats.avg_score.toFixed(1)}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{t('stats.avgScore')}</p>
                  </div>
                  <div className="w-px bg-zinc-800" />
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold font-mono text-amber-400">{stats.starred}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{t('stats.starred')}</p>
                  </div>
                </div>

                {/* 최근 포착된 아이디어 섹션 */}
                {recentIdeas.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-zinc-900">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest font-mono">
                        {t('stats.recentIdeasTitle')}
                      </h3>
                      <button
                        onClick={() => router.push(`/${locale}/dashboard`)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {t('stats.viewAll')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {recentIdeas.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => router.push(`/${locale}/ideas/${item.id}?from=settings`)}
                          className="group relative flex flex-col justify-between border border-zinc-800/80 bg-zinc-900/25 p-4 rounded-xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(39,224,161,0.1)] cursor-pointer"
                        >
                          {/* 카드 상단: 등급 & 별표 & 휴지통 */}
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              item.grade === 'GOLD' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                              item.grade === 'SILVER' ? 'bg-zinc-400/10 text-zinc-300 border border-zinc-400/20' :
                              'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                            }`}>
                              {item.grade} · {item.score.toFixed(1)}
                            </span>

                            <div className="flex items-center gap-2 text-xs">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRecentStar(item.id, item.starred);
                                }}
                                className={`text-sm leading-none transition-colors active:scale-90 ${item.starred ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'} relative z-10`}
                                aria-label="Toggle favorite"
                              >
                                ★
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSoftDeleteRecent(item.id);
                                }}
                                className="text-zinc-500 hover:text-red-400 active:scale-90 transition-colors relative z-10"
                                aria-label="Delete idea"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* 카드 본문 */}
                          <div className="flex-1 space-y-2 mb-4">
                            <h4 className="text-sm font-semibold tracking-tight text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 line-clamp-2">
                              {item.context}
                            </p>
                            <p className="text-[11px] text-zinc-300 line-clamp-3 leading-relaxed">
                              {item.idea}
                            </p>
                          </div>

                          {/* 카드 푸터: 날짜 */}
                          <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-[9px] text-zinc-400 font-mono">
                            <span>
                              {new Date(item.created_at).toLocaleDateString(locale, {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </span>
                            <span className="uppercase text-[8px]">{item.locale}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        );

      /* ── 8. 블랙리스트 ── */
      case 'blacklist':
        return (
          <SectionCard title={t('blacklist.title')}>
            <p className="text-xs text-zinc-500 mb-4">{t('blacklist.desc')}</p>
            <div className="flex gap-2 mb-4">
              <input
                id="settings-blacklist-input"
                value={blacklistInput}
                onChange={e => { setBlacklistInput(e.target.value); setBlacklistError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddBlacklist(); }}
                placeholder={t('blacklist.placeholder')}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                id="settings-blacklist-add"
                onClick={handleAddBlacklist}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-semibold hover:bg-cyan-400 active:scale-95 transition-all"
              >
                {t('blacklist.add')}
              </button>
            </div>
            {blacklistError && <p className="text-xs text-red-400 mb-3">{blacklistError}</p>}
            {blacklist.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-6">{t('blacklist.empty')}</p>
            ) : (
              <div className="space-y-2">
                {blacklist.map(domain => (
                  <div key={domain} className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900">
                    <span className="text-sm text-zinc-300 font-mono">{domain}</span>
                    <button
                      onClick={() => setBlacklist(prev => prev.filter(d => d !== domain))}
                      className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        );

      /* ── 9. 알림 ── */
      case 'notifications':
        return (
          <SectionCard title={t('notifications.title')}>
            <div className="space-y-5">
              {[
                { key: 'gold_popup' as const, label: t('notifications.goldPopup'), desc: t('notifications.goldPopupDesc') },
                { key: 'silver_bronze_popup' as const, label: t('notifications.silverBronzePopup'), desc: t('notifications.silverBronzePopupDesc') },
                { key: 'email_alert' as const, label: t('notifications.emailAlert'), desc: t('notifications.emailAlertDesc') },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-zinc-900">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium text-zinc-200">{label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                  <Toggle
                    value={notifSettings[key]}
                    onChange={v => setNotifSettings(prev => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}

              {/* 방해 금지 시간 */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-zinc-200">{t('notifications.dndTitle')}</p>
                  <Toggle
                    value={notifSettings.dnd_enabled}
                    onChange={v => {
                      setNotifSettings(prev => ({ ...prev, dnd_enabled: v }));
                      updateDNDSettings(v, notifSettings.dnd_from, notifSettings.dnd_to);
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mb-4">{t('notifications.dndDesc')}</p>
                
                <div className={`flex items-center gap-3 transition-opacity duration-200 ${
                  notifSettings.dnd_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">{t('notifications.dndFrom')}</p>
                    <input
                      id="settings-dnd-from"
                      type="time"
                      value={notifSettings.dnd_from}
                      onChange={e => setNotifSettings(prev => ({ ...prev, dnd_from: e.target.value }))}
                      onBlur={e => updateDNDSettings(notifSettings.dnd_enabled, e.target.value, notifSettings.dnd_to)}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <span className="text-zinc-600 mt-4">—</span>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">{t('notifications.dndTo')}</p>
                    <input
                      id="settings-dnd-to"
                      type="time"
                      value={notifSettings.dnd_to}
                      onChange={e => setNotifSettings(prev => ({ ...prev, dnd_to: e.target.value }))}
                      onBlur={e => updateDNDSettings(notifSettings.dnd_enabled, notifSettings.dnd_from, e.target.value)}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        );

      /* ── 10. 보안 ── */
      case 'security':
        return (
          <>
            <SectionCard title={t('security.changePassword')}>
              <div className="space-y-4">
                {[
                  { id: 'settings-pw-current', key: 'current', label: t('security.currentPassword') },
                  { id: 'settings-pw-new', key: 'newPw', label: t('security.newPassword') },
                  { id: 'settings-pw-confirm', key: 'confirm', label: t('security.confirmPassword') },
                ].map(({ id, key, label }) => (
                  <div key={key}>
                    <FieldLabel label={label} />
                    <input
                      id={id}
                      type="password"
                      value={pwForm[key as keyof typeof pwForm]}
                      onChange={e => setPwForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))}
                <button
                  id="settings-save-password"
                  className="w-full rounded-lg bg-cyan-500 text-black font-semibold py-2.5 text-sm hover:bg-cyan-400 active:scale-95 transition-all"
                >
                  {tCommon('save')}
                </button>
              </div>
            </SectionCard>

            <SectionCard title={t('security.twoFactor')}>
              <p className="text-xs text-zinc-500 mb-4">{t('security.twoFactorDesc')}</p>
              <button
                id="settings-setup-2fa"
                className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-300 hover:border-cyan-500 hover:text-cyan-400 active:scale-95 transition-all"
              >
                {t('security.twoFactorSetup')}
              </button>
            </SectionCard>

            <SectionCard title={t('security.connectedAccounts')}>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔵</span>
                  <span className="text-sm text-zinc-300">{t('security.google')}</span>
                </div>
                <span className="text-xs text-zinc-500">{t('security.notConnected')}</span>
              </div>
            </SectionCard>
          </>
        );

      /* ── 11. 데이터 ── */
      case 'data':
        return (
          <>
            <SectionCard title={t('data.exportTitle')}>
              <div className="flex gap-3">
                <button
                  id="settings-export-json"
                  onClick={handleExportJson}
                  className="flex-1 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 active:scale-95 transition-all"
                >
                  {t('data.exportJson')}
                </button>
                <button
                  id="settings-export-csv"
                  onClick={handleExportCsv}
                  className="flex-1 rounded-lg border border-zinc-800 py-2.5 text-sm text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 active:scale-95 transition-all"
                >
                  {t('data.exportCsv')}
                </button>
              </div>
            </SectionCard>

            <SectionCard title={t('data.burnTitle')}>
              <p className="text-xs text-zinc-500 mb-4">{t('data.burnDesc')}</p>
              <button
                id="settings-burn-data"
                onClick={() => setShowBurnModal(true)}
                className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-400 text-sm hover:bg-orange-500/10 active:scale-95 transition-all"
              >
                {t('data.burnBtn')}
              </button>
            </SectionCard>

            <SectionCard title="">
              <div className="flex gap-4">
                <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">{t('data.privacyPolicy')}</a>
                <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors">{t('data.gdpr')}</a>
              </div>
            </SectionCard>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h3 className="text-sm font-bold text-red-400 mb-2">{t('data.deleteAccount')}</h3>
              <p className="text-xs text-zinc-500 mb-4">{t('data.deleteAccountDesc')}</p>
              <button
                id="settings-delete-account"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 active:scale-95 transition-all"
              >
                {t('data.deleteAccountBtn')}
              </button>
            </div>

            {/* 소각 모달 */}
            <Modal
              open={showBurnModal}
              title={t('data.burnConfirmTitle')}
              description={t('data.burnConfirmDesc')}
              confirmLabel={t('data.burnConfirmBtn')}
              cancelLabel={tCommon('cancel')}
              onConfirm={() => setShowBurnModal(false)}
              onClose={() => setShowBurnModal(false)}
              danger
            />

            {/* 계정 삭제 모달 */}
            <Modal
              open={showDeleteModal}
              title={t('data.deleteConfirmTitle')}
              description={t('data.deleteConfirmDesc')}
              confirmLabel={t('data.deleteConfirmBtn')}
              cancelLabel={tCommon('cancel')}
              onConfirm={async () => {
                if (deleteInput !== 'DELETE') return;
                // 실제 삭제 로직은 Edge Function을 통해 처리해야 함
                setShowDeleteModal(false);
              }}
              onClose={() => { setShowDeleteModal(false); setDeleteInput(''); }}
              danger
            >
              <input
                id="settings-delete-confirm-input"
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={t('data.deleteConfirmInput')}
                className="w-full rounded-lg border border-red-500/30 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono mt-2"
              />
            </Modal>
          </>
        );

      /* ── 12. 도움말 ── */
      case 'help':
        return (
          <SectionCard title={t('help.title')}>
            <div className="space-y-3">
              {([
                { Icon: BookOpen, label: t('help.faq'), href: '#' },
                { Icon: Mail, label: t('help.email'), href: 'mailto:support@limina.app' },
                { Icon: Bug, label: t('help.bugReport'), href: 'https://github.com/limina/feedback/issues' },
              ] as { Icon: LucideIcon; label: string; href: string }[]).map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
                  <span className="ml-auto text-zinc-700 group-hover:text-zinc-400 transition-colors text-xs">→</span>
                </a>
              ))}

              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-900 bg-zinc-900 mt-4">
                <span className="text-xs text-zinc-500">{t('help.version')}</span>
                <span className="text-xs font-mono text-zinc-400">v0.1.0-beta</span>
              </div>
            </div>
          </SectionCard>
        );

      default:
        return null;
    }
  };

  /* ─────────────────────────────────────────────
     최종 렌더링
  ───────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen bg-black text-white font-sans"
      style={{
        backgroundImage: `
          radial-gradient(circle at top left, rgba(39, 224, 161, 0.05) 0%, transparent 50%),
          linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 24px 24px, 24px 24px',
      }}
    >
      {/* ─── 헤더 ─── */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/90">
        <div className="flex h-16 items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
          <div
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <Image src="/assets/limina-icon-cyan.png" alt="Limina" width={22} height={22} />
            <span className="text-md font-bold tracking-tight text-white font-en">
              Lim<em className="text-white not-italic">ina</em>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => router.push(`/${locale}/dashboard`)}
              className="flex items-center gap-2 py-2 px-1 text-base text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
              <span>{tCommon('dashboard')}</span>
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-zinc-500 border border-zinc-800 rounded hover:text-white hover:border-zinc-700 transition-all font-mono active:scale-95"
            >
              {tCommon('signOut')}
            </button>
          </div>
        </div>
      </header>

      {/* ─── 본문 2단 레이아웃 ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex gap-6">

        {/* ─── 사이드바 ─── */}
        <aside className="w-56 shrink-0 hidden md:block">
          <div className="sticky top-24">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3 px-3 font-mono">
              {t('title')}
            </p>
            <nav className="space-y-0.5">
              {navItems.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  id={`settings-nav-${key}`}
                  onClick={() => {
                    setActiveSection(key);
                    localStorage.setItem('settings_active_tab', key);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                    activeSection === key
                      ? 'text-cyan-400 font-semibold'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all ${
                    activeSection === key
                      ? 'bg-cyan-500/20 border-cyan-500/30'
                      : 'bg-zinc-800/50 border-zinc-700/50'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${activeSection === key ? 'text-cyan-400' : 'text-zinc-500'}`} />
                  </div>
                  <span>{t(`nav.${key}`)}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* ─── 모바일 탭 ─── */}
        <div className="md:hidden w-full mb-4 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {navItems.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveSection(key);
                  localStorage.setItem('settings_active_tab', key);
                }}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full text-xs transition-all ${
                  activeSection === key
                    ? 'bg-cyan-500 text-black font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{t(`nav.${key}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── 컨텐츠 ─── */}
        <main className="flex-1 min-w-0">
          {/* 섹션 타이틀 */}
          <div className="flex items-center gap-3 mb-6">
            {(() => {
              const item = navItems.find(n => n.key === activeSection);
              if (!item) return null;
              const Icon = item.icon;
              return (
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
              );
            })()}
            <h1 className="text-lg font-bold text-white">
              {t(`nav.${activeSection}`)}
            </h1>
          </div>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
