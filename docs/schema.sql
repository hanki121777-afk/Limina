-- =========================================================================
-- Limina - Supabase Database Schema Dump (Idempotent / Re-runnable Spec)
-- =========================================================================

-- ─────────────────────────────────────────────────────────
-- 1. 테이블 DDL 정의 (Core 4 Tables - IF NOT EXISTS 적용)
-- ─────────────────────────────────────────────────────────

-- [users] 유저 마스터 테이블 (Supabase auth.users 와 1:1 대응)
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_sign_in_at timestamp with time zone
);

-- [subscriptions] 구독/결제 상태 테이블
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  tier text default 'Free'::text check (tier in ('Free', 'Pro', 'Enterprise', 'free', 'pro', 'enterprise')) not null,
  status text default 'active'::text not null,
  starts_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- [licenses] 데스크톱 에이전트 연동 라이선스 (복사 토큰 관리)
create table if not exists public.licenses (
  id uuid default gen_random_uuid() primary key,
  license_key text not null unique,
  user_id uuid references public.users(id) on delete cascade not null unique,
  max_devices integer default 2 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- [ideas] AI 진단 리포트 테이블 (온디바이스 수집 기반 AI 결과 보관)
create table if not exists public.ideas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  grade text not null,
  score numeric not null,
  title text not null,
  context text,
  idea text not null,
  business jsonb,
  prompts jsonb,
  locale text default 'ko'::text not null,
  score_breakdown jsonb,
  reality_check jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- [user_settings] 통합 유저 설정 테이블 (users 와 1:1 매핑)
create table if not exists public.user_settings (
  user_id uuid references public.users(id) on delete cascade not null primary key,
  language text default 'ko'::text not null,
  interests text[] default '{}'::text[] not null,
  quality_mode text default 'balance'::text not null,
  budget text default ''::text not null,
  invest_time text default ''::text not null,
  is_gold_popup boolean default true not null,
  blacklist_domains text[] default '{}'::text[] not null,
  is_clipboard_collecting boolean default true not null,
  is_file_collecting boolean default true not null,
  is_notifications_enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─────────────────────────────────────────────────────────
-- 2. 시간 자동 갱신 트리거 (updated_at)
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- 중복 에러 방지를 위해 기존 트리거가 있다면 드랍 후 생성
drop trigger if exists on_subscriptions_updated on public.subscriptions;
create trigger on_subscriptions_updated
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_licenses_updated on public.licenses;
create trigger on_licenses_updated
  before update on public.licenses
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_ideas_updated on public.ideas;
create trigger on_ideas_updated
  before update on public.ideas
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_user_settings_updated on public.user_settings;
create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

-- ─────────────────────────────────────────────────────────
-- 3. 회원가입 자동 연동 트리거 (auth.users -> public.users, subscriptions, licenses)
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_license_key text;
begin
  -- 1) public.users 에 프로필 삽입 (중복 가입 에러 방지용 ON CONFLICT DO NOTHING 추가)
  insert into public.users (id, email, last_sign_in_at)
  values (new.id, new.email, new.last_sign_in_at)
  on conflict (id) do nothing;

  -- 2) subscriptions 에 기본 'Free' 등급 자동 설정 (중복 생성 방지용 ON CONFLICT)
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'Free', 'active')
  on conflict (user_id) do nothing;

  -- 3) licenses 에 32자리 보안 연동 키(토큰) 자동 생성 및 발급
  new_license_key := substring(md5(random()::text) from 1 for 32);
  insert into public.licenses (user_id, license_key, max_devices, is_active)
  values (new.id, new_license_key, 2, true)
  on conflict (user_id) do nothing;

  -- 4) user_settings 에 기본 설정 자동 생성
  insert into public.user_settings (user_id, language, interests, quality_mode, budget, invest_time, is_gold_popup, blacklist_domains, is_clipboard_collecting, is_file_collecting, is_notifications_enabled)
  values (new.id, coalesce(new.raw_user_meta_data->>'language', 'ko'), '{}'::text[], 'balance', '', '', true, '{}'::text[], true, true, true)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- 중복 에러 방지를 위해 기존 트리거가 있다면 드랍 후 생성
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- 4. 철통 행 단위 보안 정책 (RLS) 구축 (중복 방지 안전화)
-- ─────────────────────────────────────────────────────────

-- RLS 전면 활성화 (중복 선언 가능)
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.licenses enable row level security;
alter table public.ideas enable row level security;
alter table public.user_settings enable row level security;

-- [users] RLS 정책 재설정
drop policy if exists "사용자는 본인 프로필만 조회 가능" on public.users;
create policy "사용자는 본인 프로필만 조회 가능" on public.users
  for select using (auth.uid() = id);

drop policy if exists "사용자는 본인 프로필만 수정 가능" on public.users;
create policy "사용자는 본인 프로필만 수정 가능" on public.users
  for update using (auth.uid() = id);

-- [subscriptions] RLS 정책 재설정
drop policy if exists "사용자는 본인 구독 정보만 조회 가능" on public.subscriptions;
create policy "사용자는 본인 구독 정보만 조회 가능" on public.subscriptions
  for select using (auth.uid() = user_id);

-- [licenses] RLS 정책 재설정
drop policy if exists "사용자는 본인 라이선스 정보만 조회 가능" on public.licenses;
create policy "사용자는 본인 라이선스 정보만 조회 가능" on public.licenses
  for select using (auth.uid() = user_id);

drop policy if exists "사용자는 본인 라이선스 정보만 수정 가능" on public.licenses;
create policy "사용자는 본인 라이선스 정보만 수정 가능" on public.licenses
  for update using (auth.uid() = user_id);

-- [ideas] RLS 정책 재설정
drop policy if exists "사용자는 본인 아이디어 리포트만 조회 가능" on public.ideas;
create policy "사용자는 본인 아이디어 리포트만 조회 가능" on public.ideas
  for select using (auth.uid() = user_id);

drop policy if exists "사용자는 본인 계정에만 아이디어 리포트 추가 가능" on public.ideas;
create policy "사용자는 본인 계정에만 아이디어 리포트 추가 가능" on public.ideas
  for insert with check (auth.uid() = user_id);

drop policy if exists "사용자는 본인 아이디어 리포트만 수정 가능" on public.ideas;
create policy "사용자는 본인 아이디어 리포트만 수정 가능" on public.ideas
  for update using (auth.uid() = user_id);

drop policy if exists "사용자는 본인 아이디어 리포트만 삭제 가능" on public.ideas;
create policy "사용자는 본인 아이디어 리포트만 삭제 가능" on public.ideas
  for delete using (auth.uid() = user_id);

-- [user_settings] RLS 정책 재설정
drop policy if exists "사용자는 본인 설정 정보만 조회 가능" on public.user_settings;
create policy "사용자는 본인 설정 정보만 조회 가능" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "사용자는 본인 설정 정보만 수정 가능" on public.user_settings;
create policy "사용자는 본인 설정 정보만 수정 가능" on public.user_settings
  for update using (auth.uid() = user_id);
