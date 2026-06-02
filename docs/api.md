# Limina API & 통신 스펙 (api.md)

> 이 문서는 Limina의 **모든 통신 인터페이스**를 정의합니다.
> 익스텐션 ↔ 데스크톱 앱 ↔ Supabase ↔ Claude API ↔ 포트원/Stripe 간 모든 요청/응답 포맷이 명시돼 있습니다.

---

## 1. 전체 통신 구조

```
┌────────────────────────────┐
│  크롬·Edge 익스텐션 (JS)    │
└──────────────┬─────────────┘
               │ HTTP (localhost:7421)
               ▼
┌────────────────────────────┐         ┌──────────────────┐
│  데스크톱 앱 (Electron)     │ ◄────► │  Claude API      │
│  - 로컬 HTTP 서버           │  HTTPS  │  (Anthropic)     │
│  - daily_log.txt            │         └──────────────────┘
│  - 분석 엔진                │
└──────────────┬─────────────┘
               │ HTTPS
               ▼
┌────────────────────────────┐         ┌──────────────────┐
│  Supabase                  │ ◄────► │  포트원 (한국)    │
│  - 계정/구독/라이선스       │  Webhook│                  │
│  - ideas 테이블             │         └──────────────────┘
│  - Edge Functions           │         ┌──────────────────┐
└──────────────┬─────────────┘ ◄────► │  Stripe (글로벌) │
               ▲                Webhook│                  │
               │ HTTPS                 └──────────────────┘
┌──────────────┴─────────────┐
│  웹 대시보드 (Next.js)      │
│  - Limina.com              │
└────────────────────────────┘
```

---

## 2. 로컬 서버 (데스크톱 앱 내부)

데스크톱 앱은 `localhost:7421`에 HTTP 서버를 구동.
크롬·Edge 익스텐션이 이곳으로 수집 데이터를 전송한다.

### 2-1. 포트 정책

- **기본 포트**: 7421
- 포트 충돌 시 7422, 7423 순차 시도 (config.json에 기록)
- **외부 접근 차단**: `127.0.0.1` 바인딩만, 외부 IP 거부
- **CORS**: `chrome-extension://` 도메인만 허용

### 2-2. 인증 (보안 필수)

- 첫 실행 시 **32자 랜덤 토큰** 생성 → `config.json`에 저장
- 익스텐션 설치 시 옵션 페이지에서 토큰 입력
- 모든 요청 헤더에 `X-Limina-Token: {token}` 필수
- 토큰 불일치 시 401 응답

---

## 3. 익스텐션 ↔ 데스크톱 앱 API

### 3-1. POST /collect — 텍스트 수집

**Request**

```http
POST http://localhost:7421/collect
Content-Type: application/json
X-Limina-Token: {32자토큰}

{
  "source": "youtube",
  "url": "https://www.youtube.com/watch?v=...",
  "title": "드론 배달 규제 완화 2026",
  "content": "영상 제목 + 상위 댓글 3개 텍스트...",
  "meta": {
    "domain": "youtube.com",
    "category": "video"
  },
  "timestamp": "2026-05-23T09:14:30+09:00"
}
```

**Response 성공**

```json
{
  "status": "ok",
  "logged": true
}
```

**Response 블랙리스트 도메인**

```json
{
  "status": "blocked",
  "reason": "blacklist_domain"
}
```

**Response 수집 비활성화 카테고리**

```json
{
  "status": "disabled",
  "reason": "category_off"
}
```

### 3-2. GET /status — 앱 상태 확인

```http
GET http://localhost:7421/status
X-Limina-Token: {token}
```

**Response**

```json
{
  "status": "running",
  "version": "1.0.0",
  "tier": "free",
  "language": "ko",
  "collection_enabled": true,
  "last_analysis": "2026-05-22T23:45:12+09:00"
}
```

### 3-3. GET /config — 익스텐션 설정 조회

```http
GET http://localhost:7421/config
X-Limina-Token: {token}
```

**Response**

```json
{
  "enabled_sources": ["youtube", "news", "clipboard", "ai_chat"],
  "blacklist_domains": ["banking.naver.com", "kbstar.com"],
  "trigger_keywords": ["drone", "subscription"]
}
```

---

## 4. 데스크톱 앱 ↔ Claude API

### 4-1. 분석 요청

```http
POST https://api.anthropic.com/v1/messages
Content-Type: application/json
x-api-key: {ANTHROPIC_API_KEY}
anthropic-version: 2023-06-01

{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 2000,
  "messages": [
    {
      "role": "user",
      "content": "{claude-prompt.md 템플릿 + 유저 컨텍스트 + daily_log}"
    }
  ]
}
```

### 4-2. 모델 자동 분기

```typescript
function selectModel(tier: Tier): string {
  if (tier === 'pro' || tier === 'yearly') {
    return 'claude-sonnet-4-20250514';
  }
  return 'claude-haiku-4-5-20251001';
}
```

| 구독 티어 | 모델 |
|---|---|
| Free | `claude-haiku-4-5-20251001` |
| Pro 월 | `claude-sonnet-4-20250514` |
| Pro 연 | `claude-sonnet-4-20250514` |

### 4-3. 응답 파싱

AI 응답은 `claude-prompt.md`에 정의된 포맷으로 텍스트 반환.
앱에서 정규식으로 파싱하여 구조화.

```typescript
function parseResponse(text: string): AnalysisResult {
  const gradeMatch = text.match(/\[GRADE:\s*(\w+)\]/);
  const grade = gradeMatch?.[1] as Grade;
  
  if (grade === 'EMPTY' || grade === 'BURN') {
    return { grade, score: 0 };
  }
  
  if (grade === 'REPORT') {
    return {
      grade: 'REPORT',
      score: 0,
      summary: extractField(text, 'SUMMARY'),
      keywords: extractField(text, 'KEYWORDS').split(', '),
    };
  }
  
  const scoreMatch = text.match(/\[SCORE:\s*([\d.]+)/);
  return {
    grade,
    score: parseFloat(scoreMatch?.[1] ?? '0'),
    title: extractField(text, 'TITLE'),
    context: extractField(text, 'CONTEXT'),
    idea: extractField(text, 'IDEA'),
    business: extractBusiness(text),
    prompts: extractPrompts(text),
  };
}
```

### 4-4. 에러 처리

| HTTP 코드 | 의미 | 처리 |
|---|---|---|
| 401 | Unauthorized | 사용자에게 API 키 재입력 요청 |
| 429 | Rate Limit | 1시간 대기 후 재시도 |
| 500/503 | 서버 에러 | 30분 후 자동 재시도 (최대 3회) |
| 네트워크 끊김 | - | 다음 Idle 타임에 재시도 |

---

## 5. 데스크톱 앱 ↔ Supabase

### 5-1. 환경 설정

```
SUPABASE_URL: https://{project}.supabase.co
SUPABASE_ANON_KEY: eyJ... (공개 가능)
```

### 5-2. 회원가입

```http
POST https://{project}.supabase.co/auth/v1/signup
apikey: {SUPABASE_ANON_KEY}
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "...",
  "data": {
    "language": "ko"
  }
}
```

**Response**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### 5-3. 로그인

```http
POST https://{project}.supabase.co/auth/v1/token?grant_type=password
```

### 5-4. OAuth 로그인 (글로벌 권장)

```http
GET https://{project}.supabase.co/auth/v1/authorize?provider=google
GET https://{project}.supabase.co/auth/v1/authorize?provider=kakao  # 한국만
```

### 5-5. 구독 상태 조회

```http
GET https://{project}.supabase.co/rest/v1/subscriptions?user_id=eq.{user_id}
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {access_token}
```

**Response**

```json
[
  {
    "user_id": "uuid",
    "tier": "pro",
    "expires_at": "2027-05-23T00:00:00Z",
    "monthly_limit": null,
    "used_this_month": 12,
    "payment_provider": "portone"
  }
]
```

### 5-6. 라이선스 검증

앱 시작 시 + 매일 1회 자동 검증.

```http
POST https://{project}.supabase.co/functions/v1/verify-license
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "license_key": "IDTK-XXXX-XXXX-XXXX",
  "device_id": "32자랜덤"
}
```

**Response 유효**

```json
{
  "valid": true,
  "tier": "pro",
  "expires_at": "2027-05-23T00:00:00Z"
}
```

**Response 만료/무효**

```json
{
  "valid": false,
  "reason": "expired",
  "fallback_tier": "free"
}
```

### 5-7. 사용량 카운트 (Free 유저)

```http
POST https://{project}.supabase.co/rest/v1/usage
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: resolution=merge-duplicates

{
  "user_id": "uuid",
  "month": "2026-05",
  "notification_count": 1
}
```

### 5-8. 아이디어 업로드

분석 완료 후 등급이 GOLD/SILVER/BRONZE/REPORT면 Supabase에 저장.

```http
POST https://{project}.supabase.co/rest/v1/ideas
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "user_id": "uuid",
  "grade": "GOLD",
  "score": 9.2,
  "title": "아파트 드론 전용 도난 방지 수거함",
  "context": "드론 배달 규제 완화 뉴스 + 택배 도난 클립보드 데이터 융합",
  "idea": "새벽 3시, 드론이 베란다에 조용히 착륙합니다...",
  "business": {
    "target": "...",
    "problem": "...",
    "solution": "...",
    "revenue_model": "..."
  },
  "prompts": [
    {"step": 1, "title": "시장 검증", "content": "..."},
    {"step": 2, "title": "경쟁사 분석", "content": "..."},
    {"step": 3, "title": "수익 모델", "content": "..."},
    {"step": 4, "title": "MVP 설계", "content": "..."},
    {"step": 5, "title": "마케팅 전략", "content": "..."}
  ],
  "locale": "ko"
}
```

**Response**

```json
[
  {
    "id": "idea-uuid",
    "created_at": "2026-05-23T15:30:00+09:00"
  }
]
```

---

## 6. Supabase DB 스키마

### 6-1. users 테이블

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('ko','en','ja','zh-CN','zh-TW','es')),
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 6-2. subscriptions 테이블

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT CHECK (tier IN ('free','pro','yearly')) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  payment_provider TEXT CHECK (payment_provider IN ('portone','stripe')),
  payment_id TEXT,
  currency TEXT,
  amount_paid INTEGER,
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_read_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

### 6-3. licenses 테이블

```sql
CREATE TABLE licenses (
  key TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  device_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked'))
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
```

### 6-4. ideas 테이블 (대시보드용)

```sql
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grade TEXT CHECK (grade IN ('GOLD','SILVER','BRONZE','REPORT')) NOT NULL,
  score FLOAT,
  title TEXT NOT NULL,
  context TEXT,
  idea TEXT,
  business JSONB,
  prompts JSONB,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('ko','en','ja','zh-CN','zh-TW','es')),
  starred BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_ideas_user_created ON ideas(user_id, created_at DESC);
CREATE INDEX idx_ideas_user_starred ON ideas(user_id, starred) WHERE starred = TRUE;

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas_read_own" ON ideas
  FOR SELECT USING (auth.uid() = user_id AND deleted = FALSE);

CREATE POLICY "ideas_insert_own" ON ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ideas_update_own" ON ideas
  FOR UPDATE USING (auth.uid() = user_id);
```

### 6-5. usage 테이블 (Free 유저 월 한도)

```sql
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  notification_count INTEGER DEFAULT 0,
  api_call_count INTEGER DEFAULT 0,
  UNIQUE(user_id, month)
);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_read_own" ON usage
  FOR SELECT USING (auth.uid() = user_id);
```

### 6-6. 자동 정리 (Free 30일 / Pro 무제한)

```sql
-- Free 유저 30일 이상 된 아이디어 자동 삭제 (매일 자정 실행)
CREATE OR REPLACE FUNCTION cleanup_free_user_ideas()
RETURNS void AS $$
BEGIN
  UPDATE ideas
  SET deleted = TRUE
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND user_id IN (
      SELECT user_id FROM subscriptions WHERE tier = 'free'
    );
END;
$$ LANGUAGE plpgsql;

-- pg_cron으로 매일 자정 실행 (Supabase Pro 플랜)
SELECT cron.schedule('cleanup-free-ideas', '0 0 * * *', 'SELECT cleanup_free_user_ideas()');
```

**⚠️ 중요**: 유저의 일상 로그 데이터(daily_log.txt)는 절대 서버에 저장하지 않음. 아이디어 결과물만 저장.

---

## 7. 결제 시스템

### 7-1. 결제 분기 (지역별)

```typescript
function selectPaymentProvider(locale: string, region?: string): 'portone' | 'stripe' {
  if (locale === 'ko' || region === 'KR') return 'portone';
  return 'stripe';
}
```

### 7-2. 포트원 결제 흐름 (한국)

**Step 1: 결제 시작 (웹 대시보드)**

```typescript
// web-dashboard/src/lib/payment/portone.ts
import * as PortOne from '@portone/browser-sdk/v2';

async function startPortonePayment(userId: string) {
  const response = await PortOne.requestPayment({
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
    paymentId: `Limina-pro-${Date.now()}-${userId}`,
    orderName: 'Limina Pro 월 구독',
    totalAmount: 9900,
    currency: 'KRW',
    payMethod: 'EASY_PAY',
    customer: {
      customerId: userId,
    },
  });
  
  return response;
}
```

**Step 2: 웹훅 처리 (Supabase Edge Function)**

`supabase/functions/payment-webhook-portone/index.ts`:

```typescript
import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';

serve(async (req) => {
  const payload = await req.json();
  
  // 1. 포트원 API로 결제 검증
  const verifyResp = await fetch(
    `https://api.portone.io/payments/${payload.paymentId}`,
    {
      headers: { Authorization: `PortOne ${Deno.env.get('PORTONE_API_SECRET')}` },
    }
  );
  const verified = await verifyResp.json();
  
  if (verified.status !== 'PAID') {
    return new Response('Payment not verified', { status: 400 });
  }
  
  // 2. user_id 추출
  const userId = payload.paymentId.split('-').pop();
  
  // 3. 구독 정보 업데이트
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    tier: 'pro',
    status: 'active',
    expires_at: expiresAt.toISOString(),
    payment_provider: 'portone',
    payment_id: payload.paymentId,
    currency: 'KRW',
    amount_paid: 9900,
  });
  
  // 4. 라이선스 키 발급
  const licenseKey = `IDTK-${crypto.randomUUID().slice(0,4).toUpperCase()}-${crypto.randomUUID().slice(0,4).toUpperCase()}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
  
  await supabase.from('licenses').insert({
    key: licenseKey,
    user_id: userId,
    activated_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  
  return new Response(JSON.stringify({ ok: true }));
});
```

### 7-3. Stripe 결제 흐름 (글로벌)

**Step 1: Checkout Session 생성**

```typescript
// web-dashboard/src/app/api/checkout/stripe/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { userId, priceId, locale } = await req.json();
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `https://Limina.com/${locale}/dashboard?payment=success`,
    cancel_url: `https://Limina.com/${locale}/pricing`,
    customer_email: req.headers.get('x-user-email') ?? undefined,
    client_reference_id: userId,
    locale: locale as Stripe.Checkout.SessionCreateParams.Locale,
  });
  
  return Response.json({ url: session.url });
}
```

**Step 2: Stripe 가격 (Stripe 대시보드에서 미리 생성)**

| Price ID | 통화 | 금액 | 주기 |
|---|---|---|---|
| `price_pro_monthly_usd` | USD | $7.99 | 월 |
| `price_pro_monthly_jpy` | JPY | ¥980 | 월 |
| `price_pro_monthly_cny` | CNY | ¥45 | 월 |
| `price_pro_monthly_eur` | EUR | €6.99 | 월 |
| `price_pro_yearly_usd` | USD | $59.99 | 년 |
| ... | ... | ... | ... |

**Step 3: 웹훅 처리**

`supabase/functions/payment-webhook-stripe/index.ts`:

```typescript
serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id!;
    
    // subscriptions 업데이트
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      tier: session.mode === 'subscription' ? 'pro' : 'free',
      status: 'active',
      expires_at: new Date(session.expires_at * 1000).toISOString(),
      payment_provider: 'stripe',
      payment_id: session.id,
      currency: session.currency,
      amount_paid: session.amount_total,
    });
    
    // 라이선스 발급
    // ...
  }
  
  if (event.type === 'customer.subscription.deleted') {
    // 구독 취소 처리
  }
  
  return new Response(JSON.stringify({ ok: true }));
});
```

---

## 8. 로컬 데이터 스키마 (데스크톱 앱)

### 8-1. 저장 위치

| OS | 경로 |
|---|---|
| Windows | `%APPDATA%/Limina/` |
| Mac | `~/Library/Application Support/Limina/` |
| Linux | `~/.config/Limina/` |

Electron `app.getPath('userData')` 사용하면 자동 분기.

### 8-2. config.json

`dev.md` Section 6 참조.

### 8-3. daily_log.txt 포맷

```
[2026-05-23T09:14:30+09:00 youtube] {"title":"...","content":"..."}
[2026-05-23T11:30:12+09:00 clipboard] 일반 텍스트...
[2026-05-23T13:05:01+09:00 news] {"title":"...","content":"..."}
```

각 라인:
- ISO 8601 타임스탬프 (timezone 포함)
- 소스 종류 (`youtube`, `clipboard`, `news`, `office`, `pdf`, `ai_chat` 등)
- 본문: 텍스트 또는 JSON 객체

---

## 9. GitHub Releases (데스크톱 앱 자동 업데이트)

### 9-1. 최신 버전 확인

```http
GET https://api.github.com/repos/{org}/Limina-desktop/releases/latest
```

**Response (요약)**

```json
{
  "tag_name": "v1.0.1",
  "name": "Limina v1.0.1",
  "assets": [
    {
      "name": "Limina-Setup-1.0.1.exe",
      "browser_download_url": "https://github.com/.../Limina-Setup-1.0.1.exe",
      "size": 80000000
    },
    {
      "name": "Limina-1.0.1.dmg",
      "browser_download_url": "https://github.com/.../Limina-1.0.1.dmg",
      "size": 85000000
    },
    {
      "name": "Limina-1.0.1.AppImage",
      "browser_download_url": "https://github.com/.../Limina-1.0.1.AppImage",
      "size": 90000000
    }
  ]
}
```

### 9-2. electron-updater 흐름

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'Limina',
  repo: 'Limina-desktop',
});

// 1. 앱 시작 시 + 매일 자정 자동 체크
autoUpdater.checkForUpdates();

// 2. 새 버전 있으면 트레이 알림 표시
autoUpdater.on('update-available', () => {
  showTrayNotification(t('update.available'));
});

// 3. 유저 확인 후 백그라운드 다운로드
autoUpdater.downloadUpdate();

// 4. 다음 재시작 시 적용
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});
```

---

## 10. 에러 코드 정의

### 10-1. 로컬 API 에러

| 코드 | 의미 | 처리 |
|---|---|---|
| 401 | 인증 토큰 불일치 | 익스텐션 옵션에서 토큰 재입력 안내 |
| 403 | 카테고리 비활성화 | 무시 (정상 동작) |
| 423 | 블랙리스트 도메인 | 무시 (정상 동작) |
| 500 | 내부 오류 | 로그 기록 |

### 10-2. 분석 에러

| 코드 | 의미 | 처리 |
|---|---|---|
| `ANALYSIS_DATA_EMPTY` | 데이터 부족 | 재누적 |
| `ANALYSIS_SCORE_LOW` | 점수 미달 | 조용히 소각 |
| `ANALYSIS_API_FAILED` | API 호출 실패 | 30분 후 재시도 |
| `ANALYSIS_QUOTA_EXCEEDED` | Free 월 한도 초과 | Pro 안내 알림 |
| `ANALYSIS_API_KEY_MISSING` | API 키 없음 | 설정 안내 |

### 10-3. 구독 에러

| 코드 | 의미 | 처리 |
|---|---|---|
| `LICENSE_EXPIRED` | 라이선스 만료 | Free로 자동 강등 |
| `LICENSE_INVALID` | 잘못된 키 | 재입력 요청 |
| `LICENSE_DEVICE_MISMATCH` | 다른 기기에서 활성화됨 | 재인증 안내 |
| `PAYMENT_FAILED` | 결제 실패 | 사유 표시 |
| `PAYMENT_PROVIDER_DOWN` | 결제사 장애 | 다른 결제 수단 안내 |

---

## 11. 보안 가이드

### 11-1. API 키 보관

| 키 종류 | 보관 위치 |
|---|---|
| `ANTHROPIC_API_KEY` (데스크톱) | OS 자격증명 관리자 (keytar) |
| `SUPABASE_ANON_KEY` (데스크톱) | config.json (암호화 X, 공개 가능) |
| `SUPABASE_SERVICE_ROLE_KEY` (서버 only) | Supabase Edge Function 환경변수 |
| `STRIPE_SECRET_KEY` (서버 only) | Vercel 환경변수 |
| `STRIPE_WEBHOOK_SECRET` (서버 only) | Vercel 환경변수 |
| `PORTONE_API_SECRET` (서버 only) | Supabase Edge Function 환경변수 |

### 11-2. 로컬 서버 보호

- 127.0.0.1만 바인딩 (외부 IP 차단)
- 모든 요청 `X-Limina-Token` 검증
- CORS는 `chrome-extension://` 만 허용
- HTTP만 사용 (localhost는 HTTPS 불필요)

### 11-3. 데이터 전송

- 모든 외부 통신은 **HTTPS 강제**
- Claude API 호출 전 **PII 마스킹** (이메일, 전화번호, 카드번호 등)
- 로그에 민감 정보 기록 금지
- `console.log` 프로덕션 빌드에서 자동 제거 (`drop_console: true`)

### 11-4. PII 마스킹 규칙

```typescript
function maskPII(text: string): string {
  return text
    // 이메일
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    // 전화번호 (국제)
    .replace(/\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, '[PHONE]')
    // 한국 주민번호
    .replace(/\d{6}[-]\d{7}/g, '[KR-SSN]')
    // 미국 SSN
    .replace(/\d{3}-\d{2}-\d{4}/g, '[US-SSN]')
    // 카드번호 (15~16자리)
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/g, '[CARD]');
}
```

---

## 12. 비용 예측 (월 기준)

### 12-1. Claude API 비용

**Haiku (Free 유저)**
```
입력 2,500 토큰 × $0.80/1M = $0.002
출력   600 토큰 × $4.00/1M = $0.0024
1회 합계                   ≈ 6원
월 10회                    ≈ 60원/유저
```

**Sonnet (Pro 유저)**
```
입력 2,500 토큰 × $3.00/1M = $0.0075
출력   600 토큰 × $15.00/1M = $0.009
1회 합계                   ≈ 24원
월 평균 12회               ≈ 290원/유저
```

### 12-2. 인프라 비용

| 서비스 | Free | 유료 전환 |
|---|---|---|
| Supabase | 500MB DB / 1GB Storage | $25/월 (10,000 유저 후) |
| Vercel | 100GB 대역폭 / 100 빌드 | $20/월 (50,000 방문 후) |
| Stripe | - | 거래액 3.4% + $0.30 |
| 포트원 | - | 거래액 3.3% |
| GitHub Releases | 무제한 | - |

### 12-3. 손익 시뮬레이션 (Pro 유저 1,000명, 글로벌)

```
월 수익 (지역 혼합):
- 한국 300명   ×  9,900원   ≈ 2,970,000원
- 미국 200명   ×  $7.99     ≈ 2,200,000원
- 일본 200명   ×  ¥980      ≈ 1,800,000원
- 중국 200명   ×  ¥45       ≈ 1,700,000원
- 기타 100명   ×  $5.99     ≈   820,000원
─────────────────────────────────────────
월 총 수익                   ≈ 9,490,000원

월 비용:
- Claude API (Sonnet × 12회) ≈   290,000원
- Supabase Pro               ≈    33,000원
- Vercel Pro                 ≈    27,000원
- 포트원 수수료 (30%)        ≈    98,000원
- Stripe 수수료 (70%)        ≈   232,000원
─────────────────────────────────────────
월 총 비용                   ≈   680,000원

순이익                       ≈ 8,810,000원/월 (마진 93%)
```

**1만 Pro 유저 도달 시:**
- 월 순이익 약 8,800만원
- 연 환산 약 10억 5천만원

---

## 13. Edge Functions 목록

| 함수명 | 용도 |
|---|---|
| `payment-webhook-portone` | 포트원 결제 웹훅 처리 |
| `payment-webhook-stripe` | Stripe 결제 웹훅 처리 |
| `verify-license` | 라이선스 검증 (앱에서 매일 호출) |
| `cleanup-free-ideas` | Free 유저 30일 지난 아이디어 삭제 (cron) |
| `send-weekly-email` | (v3) 주간 인사이트 이메일 |

---

## 14. 환경변수 체크리스트

### 14-1. 데스크톱 앱 (`.env`)

```bash
# Supabase (공개 가능)
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# 빌드 시 자동 업데이트 publish 토큰
GH_TOKEN=YOUR_GITHUB_TOKEN
```

⚠️ Anthropic API 키는 OS 자격증명 관리자에 저장. `.env` 사용 금지.

### 14-2. 웹 (`.env.local`)

```bash
# 공개
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_PORTONE_STORE_ID=YOUR_PORTONE_STORE_ID
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=YOUR_PORTONE_CHANNEL_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUB_KEY

# 서버 only (NEXT_PUBLIC_ 접두사 X)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
PORTONE_API_SECRET=YOUR_PORTONE_API_SECRET
```

### 14-3. Supabase Edge Function 환경변수

Supabase 대시보드 → Project Settings → Edge Functions → Add Environment Variable:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PORTONE_API_SECRET
```

---

## 15. 테스트 시나리오

배포 전 반드시 확인:

### 익스텐션 ↔ 데스크톱 앱
- [ ] 토큰 미일치 시 401 응답
- [ ] CORS가 chrome-extension://만 허용
- [ ] 외부 IP에서 접근 차단 확인
- [ ] 블랙리스트 도메인에서 수집 안 됨

### 데스크톱 앱 ↔ Claude API
- [ ] Haiku/Sonnet 자동 분기
- [ ] API 키 없을 때 친절한 에러 메시지
- [ ] 429 발생 시 재시도 로직 작동
- [ ] PII 마스킹 적용 확인

### Supabase 통신
- [ ] RLS 적용 — 다른 유저 데이터 못 봄
- [ ] 아이디어 업로드 후 즉시 대시보드에 표시
- [ ] 토큰 만료 시 자동 갱신

### 결제
- [ ] 포트원: 카카오페이 결제 → 구독 활성화 → 라이선스 발급
- [ ] Stripe: 카드 결제 → 동일 흐름
- [ ] 환불 시 구독 자동 해지
- [ ] 결제 실패 시 명확한 에러 표시

### 자동 업데이트
- [ ] 새 버전 출시 시 트레이 알림
- [ ] 백그라운드 다운로드
- [ ] 재시작 시 적용

---

**이 문서는 살아있는 문서입니다.** API 스펙이 바뀌면 즉시 업데이트하세요.
