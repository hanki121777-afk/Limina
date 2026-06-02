# Limina — Antigravity AI 작업 규칙 (gemini.md)

> 이 파일은 **Antigravity IDE (Gemini 모델)** 가 Limina 프로젝트 작업 시 따라야 할 최상위 절대 규칙입니다.
> CLAUDE.md와 동일한 규칙이지만, **Antigravity 전담 작업 범위**와 **Claude Code로 넘기는 기준**이 추가됩니다.

---

## 🤖 AI 역할 분담 (반드시 숙지)

Limina은 두 AI 도구를 목적에 따라 분리해서 사용합니다.

| AI 도구 | 담당 작업 | 언제 사용 |
|---|---|---|
| **Antigravity (Gemini) — 이 파일** | 일반 개발, UI 구현, 기능 추가, 반복 작업 | 평소 대부분의 작업 |
| **Claude Code (CLAUDE.md)** | 버그 추적, 복잡한 로직, OS별 네이티브 코드, 성능 최적화 | 막혔을 때, 어려운 작업 |

### Antigravity가 담당하는 작업
- 컴포넌트 UI 구현 (React, Tailwind)
- 번역 키 추가 및 다국어 파일 관리
- API 연동 (Supabase CRUD, Claude API 호출 코드)
- 라우팅, 페이지 생성
- CSS/디자인 구현
- 환경변수 설정 및 config 파일 작성
- 테스트 코드 작성
- 반복적인 파일 생성 작업

### Claude Code로 넘겨야 하는 작업 (이 경우 사용자에게 알려주세요)
- **버그가 2번 이상 시도해도 안 잡힐 때**
- **Electron 네이티브 모듈** (keytar, OS 자격증명, powerMonitor)
- **Windows/Mac/Linux OS별 분기 코드**
- **electron-builder 코드 사이닝/공증**
- **CPU/메모리 누수 진단**
- **보안 취약점 검토**
- **Supabase RLS 정책 복잡한 설정**

Claude Code로 넘길 때 이렇게 말하세요:
> "이 작업은 OS 네이티브 코드가 필요해서 Claude Code에서 진행하는 걸 추천해요. CLAUDE.md를 읽힌 뒤 작업해주세요."

---

## 📌 프로젝트 한 줄 요약

> 유저의 PC 사용 중 발생하는 텍스트 데이터를 자동 수집하고, AI가 비즈니스 아이디어를 도출해 팝업으로 전달하는 **온디바이스 글로벌 SaaS**.

- **채널**: 데스크톱 앱 (Win/Mac/Linux) + 크롬·Edge 익스텐션 + 웹 대시보드
- **타겟**: 창업/사이드 프로젝트에 관심 있는 직장인, 학생, 프리랜서 (전 세계)
- **언어**: 한국어 / 영어 / 일본어 / 중국어(간체·번체) / 스페인어 (출시 시점 6개)
- **수익 모델**: Free / Pro 월 구독 / 연간 (40% 할인)
- **차별점**: 일상 데이터는 100% 로컬 처리, 생성된 아이디어 결과물만 클라우드 보관

---

## 🚨 절대 규칙 (이 규칙을 어기면 멈추고 알려주세요)

아래 규칙과 충돌하는 요청이 들어오면, **멈추고 사용자에게 먼저 확인하세요.**

특히 **수집 데이터 서버 전송, 카카오톡 자동 수집, 게시판/공유 기능 추가, 한국 전용 코드** 같은 요청은 Limina의 핵심 가치를 무너뜨립니다. 이런 요청이 오면 작업을 즉시 멈추고 "프로젝트 제약 조건 위반"임을 먼저 고지하세요.

---

### 1. 기술 스택은 바꾸지 마세요

| 역할 | 사용할 기술 | 다른 거 쓰면 안 됨 |
|------|------------|------------------|
| 데스크톱 앱 | **Electron + React + TypeScript** | Python, Tauri, Flutter Desktop 안 됨 |
| UI 스타일 | **Tailwind CSS** | Bootstrap, MUI, Chakra 안 됨 |
| 웹 대시보드 | **Next.js (App Router) + TypeScript** | Remix, SvelteKit 안 됨 |
| 크롬 익스텐션 | **JavaScript Manifest V3** | MV2, TypeScript 컴파일 복잡화 안 됨 |
| 데이터/로그인 | **Supabase** | Firebase, AWS Amplify 안 됨 |
| AI 분석 | **Claude API (Anthropic)** | OpenAI, Gemini 직접 호출 안 됨 |
| 결제 (한국) | **포트원 v2** | 토스페이먼츠 직접 연동 안 됨 |
| 결제 (글로벌) | **Stripe** | PayPal, Paddle 안 됨 |
| 다국어 | **next-intl** (웹) + **i18next** (앱) | 직접 구현 안 됨 |
| 런타임 | **Node.js LTS** | Deno, Bun 안 됨 |
| 빌드 (데스크톱) | **electron-builder** | electron-forge, pkg 안 됨 |
| 배포 (웹) | **Vercel** | Netlify, Cloudflare Pages 안 됨 |
| 앱 폰트 (한글) | **Pretendard** | Noto Sans KR 안 됨 |
| 앱 폰트 (영문) | **Unbounded (헤딩) + Inter (본문)** | Roboto, Open Sans 안 됨 |
| 앱 폰트 (일본어) | **Noto Sans JP** | 다른 거 안 됨 |
| 앱 폰트 (중국어) | **Noto Sans SC/TC** | 다른 거 안 됨 |

사용자가 다른 기술을 요청하면 이렇게 물어보세요:
> "Limina은 Electron + React + Next.js + Supabase 조합에 맞춰져 있어요. 다른 걸 쓰면 글로벌 배포와 다국어 처리가 어려워져요. 일단 이 조합으로 진행할까요?"

---

### 2. 항상 한국어로, 쉽게 설명하세요

- 모든 대답은 **한국어**로 합니다 (사용자가 한국인)
- 사용자는 **코딩 초보자**입니다. 바이브 코딩(AI에게 시켜서 코딩하는 방식)에 익숙하지 않습니다.
- 어려운 용어가 나오면, 바로 뒤에 쉬운 말로 다시 설명하세요
  - 예: "터미널 (명령어를 입력하는 검은 창)"
  - 예: "환경변수 (비밀 설정값을 저장하는 파일)"
  - 예: "i18n (internationalization, 다국어 처리 기술)"
  - 예: "Idle 상태 (유저가 키보드/마우스를 30초 이상 안 만진 상태)"
  - 예: "MV3 (Manifest V3, 크롬 익스텐션 최신 버전)"
  - 예: "Edge Function (Supabase의 서버리스 함수, 결제 웹훅 처리용)"
  - 예: "RLS (Row Level Security, 데이터 접근 권한 규칙)"
- "알아서 해보세요", "패턴을 보고 응용하세요" 같은 말은 하지 마세요
- **복사-붙여넣기 가능한 코드**를 주세요
- **어디에 붙여넣을지 정확한 파일 경로**를 알려주세요
- 어떤 일이 벌어졌는지 작업 완료 후 **한 줄로 요약**해주세요

---

### 3. 한 번에 많이 하지 마세요

코드를 만들기 전에 항상 **계획을 먼저** 보여주세요:

1. "이렇게 할 거예요" — 계획 보여주기
2. 사용자가 "네" 또는 "ok" 하면 — 코드 만들기
3. 다 했으면 — 뭘 했는지 한 줄로 정리해주기

**한 번에 5개 파일 이상 바꾸지 마세요.**
파일이 많이 바뀌어야 하는 작업이면 여러 단계로 쪼개세요.

---

### 4. 배포는 절대 임의로 하지 마세요 (로컬 작업 우선)

- **사용자가 "배포해"라고 명시적으로 지시할 때만 배포를 실행하세요.**
- 그 외의 모든 작업과 테스트는 **로컬 환경**에서만 진행해야 합니다.
- 임의로 `npx vercel --prod`, `electron-builder`, `chrome web store upload` 같은 배포 스크립트를 실행해서는 절대 안 됩니다.

---

### 5. 비밀 정보는 절대 보여주지 마세요

- `.env` 파일의 실제 값은 **절대 화면에 출력하지 마세요**
- 예시가 필요하면 이렇게 쓰세요:
  - `YOUR_ANTHROPIC_API_KEY` (실제 값 대신)
  - `YOUR_SUPABASE_URL`
  - `YOUR_SUPABASE_ANON_KEY`
  - `YOUR_PORTONE_CHANNEL_KEY`
  - `YOUR_STRIPE_SECRET_KEY`
  - `YOUR_STRIPE_WEBHOOK_SECRET`
- Git에 `.env` 커밋되지 않도록 `.gitignore`에 항상 추가하세요
- 로그(`console.log`)에 API 키, 토큰, 유저 이메일, 결제 정보 출력 금지

---

### 6. 삭제하기 전에 꼭 물어보세요

파일을 삭제하거나 크게 바꾸기 전에는 반드시 확인하세요:
> "이 파일을 삭제해도 될까요? [파일 이름]"

특히 **Supabase 테이블/컬럼**을 바꾸기 전에는 반드시 확인하세요:
> "[테이블명] 테이블의 [컬럼명]을 바꾸려고 해요. 진행해도 될까요?"

`users`, `subscriptions`, `licenses`, `ideas` **4개 테이블**과 그 컬럼은 사용자 명시적 허가 없이 절대 rename/drop하지 마세요.

---

### 7. 설정할 때는 클릭 경로까지 알려주세요

Supabase, Vercel, 포트원, Stripe, Anthropic Console 같은 사이트 설정을 안내할 때:
- **어디를 클릭**해야 하는지
- **버튼 이름**이 뭔지
- **화면에 뭐가 보이는지**
구체적으로 알려주세요.

---

### 8. 환경 세팅은 자동으로 처리하세요

사용자가 "시작해줘"라고 하면 다음을 순서대로 실행하세요:

#### Step 1. Node.js 설치 확인
```bash
node -v
```
- 결과가 `v20.x.x` 이상이면 OK
- 없거나 v18 이하면 설치 필요:
  - **Mac**: `brew install node@20` 또는 nodejs.org에서 LTS 다운로드 안내
  - **Windows**:
    1. `winget install OpenJS.NodeJS.LTS` 실행
    2. winget이 안 되면 [nodejs.org](https://nodejs.org)에서 LTS 버전 다운로드 안내
    3. 설치 완료 후, **반드시 터미널을 완전히 껐다가 다시 열기**
    4. 새 터미널에서 `node -v`로 확인
  - **Linux (Ubuntu/Debian)**: `sudo apt install nodejs npm`

#### Step 2. 프로젝트 폴더 생성

**Windows 사용자 필독:**
- 폴더 경로에 **한글이 있으면 에러**가 납니다.
- 반드시 `C:\dev\` 같은 영어 경로에 프로젝트를 만드세요.

```powershell
# Windows
mkdir C:\dev
cd C:\dev
```

```bash
# Mac/Linux
mkdir -p ~/dev
cd ~/dev
```

#### Step 3. 프로젝트 구조 생성
```bash
mkdir Limina
cd Limina

mkdir desktop-app
mkdir chrome-extension
mkdir web-dashboard
mkdir landing-page
mkdir shared
```

#### Step 4. 각 단계마다 사용자에게 확인
각 단계에서 에러가 나면 멈추고 에러 메시지를 보여주세요.

#### Windows 사용자 사전 점검
- **터미널 종류**: PowerShell을 사용하세요. cmd는 쓰지 마세요.
- **PowerShell 실행 정책 차단** 에러 시:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

---

### 9. 팝업창 및 중요 동작 버튼 확인 규칙

- **커스텀 모달 의무화**: 시스템 기본 알림창(`alert`, `confirm`, `window.prompt`)은 절대 사용하지 마세요.
- **중요 동작의 즉각 실행 금지**: 데이터 삭제, 구독 취소, 계정 삭제는 반드시 **확인 모달**을 거치도록 구현하세요.

---

### 10. 글로벌 출시 전제 (한국 코드 금지)

- **모든 텍스트는 i18n 번역 키로 작성** (하드코딩 금지)
  - ❌ `<button>아이디어 보기</button>`
  - ✅ `<button>{t('idea.view')}</button>`
- **금액 표시는 통화 분리**
  - ❌ `9,900원` 하드코딩
  - ✅ `formatCurrency(price, locale)` 사용
- **날짜/시간은 locale-aware**
  - ❌ `2026년 5월 23일` 하드코딩
  - ✅ `Intl.DateTimeFormat` 사용
- **한국 전용 기능은 조건 분기**
  - 카카오 로그인, 포트원 결제는 `locale === 'ko'` 또는 `region === 'KR'`일 때만 노출

---

### 11. 온디바이스 원칙 (데이터 분리)

이건 Limina의 **핵심 차별점**입니다. 절대 어기지 마세요.

| 데이터 | 저장 위치 | 외부 전송 |
|---|---|---|
| 수집한 원본 데이터 (daily_log.txt) | **로컬만** | ❌ 절대 X |
| 유저 설정 (config.json) | **로컬만** | ❌ 절대 X |
| AI 분석 시 Claude API 호출 | 일시 전송 후 즉시 폐기 | ⚠️ 분석 1회만 |
| AI가 생성한 아이디어 결과물 | **Supabase ideas 테이블** | ✅ 저장 OK |
| 유저 계정, 구독, 라이선스 | **Supabase** | ✅ 저장 OK |

---

### 12. 카카오톡/메신저 처리 (법적 안전)

**모든 메신저 앱의 메시지를 직접 수집하는 행위는 금지됩니다.**

- ❌ 카카오톡 PC 앱 직접 읽기
- ❌ Slack/Discord/LINE/WhatsApp/Telegram API 후킹

대신 **클립보드 모니터링**으로 통일:
- 유저가 메신저에서 텍스트를 **직접 복사(Ctrl+C)** 했을 때만 수집

---

### 13. 보안/개인정보 규칙

- **API 키 보관**: OS 자격증명 관리자 (keytar) — 이 부분은 Claude Code에 위임
- **블랙리스트 도메인 자동 차단**: 결제/금융/비밀번호 입력창에서는 수집 중단
- **마스킹 처리**: Claude API 호출 전, 이메일·전화번호·신용카드 번호·주민번호 패턴 자동 마스킹
- **로컬 데이터 7일 롤링**: 8일째 자동 소각

---

## 💬 대화 스타일

### 1. 먼저 지금 상황을 한 줄로 알려주세요
- 예: "지금은 데스크톱 앱의 Idle 감지 기능을 만드는 단계예요."

### 2. 그 다음 선택지 2~3개를 보여주세요
각 선택지마다 **시간과 난이도**를 적어주세요:
- A) 기본 Idle 감지만 (10분, 쉬움)
- B) Idle 감지 + 부팅 후 5분 대기까지 (20분, 보통)
- C) Idle 감지 + 야간 우선순위 로직까지 (40분, 어려움)

### 3. 막히면 Claude Code로 넘기는 걸 제안하세요

작업이 2번 이상 실패하거나 OS 네이티브 코드가 필요하면:
> "이 부분은 Claude Code에서 처리하는 게 더 안전해요. CLAUDE.md를 읽힌 뒤 넘겨드릴까요?"

---

## 🎯 워크플로우 (슬래시 명령어)

### `/start` — 프로젝트 시작

1. Node.js 설치 확인 + 설치
2. 작업 폴더 생성 (`C:\dev\Limina` 또는 `~/dev/Limina`)
3. 5개 하위 프로젝트 폴더 생성
4. Git 저장소 초기화 (`git init` + `.gitignore`)
5. `shared/` 폴더에 공통 TypeScript 타입 정의
6. 사용자에게 "어떤 부분부터 만들까요?" 물어보기:
   - A) 크롬 익스텐션 (수집 시작점)
   - B) 데스크톱 앱 기본 구조
   - C) Supabase 셋업 + DB 테이블

### `/extension` — 크롬·Edge 익스텐션

1. `chrome-extension/` 폴더로 이동
2. `manifest.json` 작성 (MV3, 권한 최소화)
3. `background.js` 서비스 워커
4. `content.js` 사이트별 텍스트 수집 (YouTube, 뉴스, AI 대화 등)
5. `localhost:7421` 로컬 서버로 POST 전송
6. 익스텐션 옵션 페이지 (수집 카테고리 On/Off)
7. 크롬 + Edge 양쪽 테스트

### `/desktop` — 데스크톱 앱 (Electron)

1. `desktop-app/` 폴더로 이동
2. Electron + React + TypeScript 보일러플레이트 생성
   ```bash
   npm create electron-vite@latest desktop-app -- --template react-ts
   ```
3. Tailwind CSS + i18next 설정
4. 로컬 HTTP 서버 (7421 포트, 익스텐션 수신용)
5. 클립보드 모니터링 모듈
6. 오피스 파일 텍스트 추출 모듈
7. Idle 감지 + 7일 롤링 데이터 관리
8. Claude API 호출 + 2단계 게이트키퍼
9. 등급별 트레이 알림 팝업
10. 자동 업데이트 (electron-updater + GitHub Releases)

### `/dashboard` — 웹 대시보드 (Next.js)

1. `web-dashboard/` 폴더로 이동
2. Next.js + TypeScript + Tailwind 설정
3. next-intl 다국어 설정 (6개 언어)
4. Supabase 클라이언트 + 인증
5. 메인 페이지: 아이디어 카드 그리드 (최신순)
6. 상세 페이지: 아이디어 상세 + 단계별 프롬프트 복사 버튼
7. 관심 체크(★) / 삭제 기능
8. 결제 페이지 (포트원/Stripe 분기)

### `/landing` — 랜딩페이지

1. `landing-page/` 폴더로 이동
2. Next.js + Tailwind + 다국어
3. 히어로 / 기능 소개 / 가격 / FAQ / CTA
4. 다운로드 버튼 (Windows/Mac/Linux 각각)

### `/db-setup` — Supabase 셋업

1. Supabase 프로젝트 생성 안내 (supabase.com)
2. `.env` 파일에 키 설정
3. SQL Editor에서 4개 테이블 생성:
   - `users`
   - `subscriptions`
   - `licenses`
   - `ideas`
4. RLS (Row Level Security) 정책 적용
5. Realtime 활성화 (ideas 테이블)
6. Edge Function 1개: 결제 웹훅 (`payment-webhook`)

### `/deploy` — 배포

**먼저 사용자에게 명시적 허가를 받으세요.**

1. 로컬 빌드 확인:
   - 웹: `npm run build`
   - 데스크톱: `npm run build:win` 또는 `:mac` 또는 `:linux`
2. 빌드 에러 있으면 먼저 수정
3. 사용자가 OK 하면:
   - 웹: `npx vercel --prod`
   - 데스크톱: GitHub Releases 업로드
   - 익스텐션: 크롬/Edge 웹스토어 매뉴얼 업로드 안내

---

## 📂 참조 문서 우선순위

기능 구현 시 관련 문서를 참조하고, **충돌이 있으면 다음 순서로 적용**:

1. **gemini.md (이 파일) / CLAUDE.md** — 최상위 절대 규칙
2. **agent.md** — 시스템 작동 규칙 (수집/분석/팝업 로직)
3. **api.md** — 통신 스펙, DB 스키마
4. **design.md** — 디자인 시스템 (컬러, 타이포, 컴포넌트)
5. **i18n.md** — 다국어 처리 가이드
6. **dev.md** — 기술 스택, 코드 뼈대, MVP 순서
7. **claude-prompt.md / gemini-prompt.md** — AI 분석 엔진 프롬프트

---

## ⚠️ 모델을 위한 참고사항

- 이 파일은 **자동으로 읽힘**. 다른 규칙보다 이 파일을 우선하세요.
- 5개 하위 프로젝트는 **모노레포(monorepo)가 아닌 독립 폴더**. 공유는 `shared/` 에 TypeScript 타입만.
- 파일 확장자는 `.tsx` / `.ts`를 사용하세요 (익스텐션 제외).
- 환경변수 접두사:
  - 데스크톱 앱: `VITE_` (Electron + Vite)
  - 웹 대시보드/랜딩: `NEXT_PUBLIC_` (클라이언트), 그 외는 서버 전용
- 개발 서버 주소:
  - 데스크톱 앱 내부 HTTP 서버: `localhost:7421`
  - 웹 대시보드: `localhost:3000`
  - 랜딩페이지: `localhost:3001`
- **npm 명령어를 체인하지 마세요** (`&&`로 연결 금지). 한 줄씩 실행하고 결과를 확인한 뒤 다음으로 넘어가세요.

---

## 🔧 Windows 문제 해결

### "winget을 찾을 수 없습니다"
[nodejs.org](https://nodejs.org)에서 LTS 버전 다운로드. 옵션은 전부 기본값으로 "Next"만.

### "node(npm)은(는) 내부 또는 외부 명령이 아닙니다"
터미널을 완전히 닫고 새로 열기. 그래도 안 되면 컴퓨터 재시작.

### "이 시스템에서 스크립트를 실행할 수 없습니다"
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
"Y" 입력 후 Enter. PowerShell 닫고 다시 열기.

### Electron 빌드 실패
- 첫 빌드는 5~10분 걸려요. 기다리세요.
- Windows Defender가 `node_modules\electron\` 차단할 수 있어요. 폴더 예외 추가.

### 크롬 익스텐션이 로드되지 않음
1. `chrome://extensions` 접속
2. "개발자 모드" ON
3. "압축해제된 확장 프로그램을 로드합니다" → `chrome-extension/` 폴더 선택

---

## 🌐 Mac / Linux 문제 해결

### Mac: "command not found: brew"
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Mac: "확인되지 않은 개발자" 경고
- 개발 중: 우클릭 → 열기 → 다시 열기
- 배포 시: 코드 사이닝 + 공증 필요 → **Claude Code에 위임**

### Linux: AppImage 실행 안 됨
```bash
chmod +x Limina-*.AppImage
./Limina-*.AppImage
```

---

## 📝 끝으로

**기억하세요:**
1. 사용자는 초보자입니다. 친절하게.
2. 글로벌 출시가 목표입니다. 한국 전용 코드 금지.
3. 핵심 가치는 "온디바이스 + 말맛 + 심플함"입니다.
4. 막히면 Claude Code로 넘기는 걸 제안하세요.
5. 의심스러우면 멈추고 물어보세요.

---

## 🥊 경쟁사 비교 (포지셔닝 참고용)

| 비교 항목 | Screenpipe (Rewind) | MS Copilot Recall | 유튜브 요약 익스텐션 | **Limina** |
|---|---|---|---|---|
| 핵심 콘셉트 | PC 화면/소리 무제한 녹화 | Windows OS 스크린샷 저장 | 클릭한 영상 자막 요약 | **일상에서 대박 아이디어 자동 포착·배달** |
| 알림 주기 | 수동 검색 (알림 없음) | 수동 타임라인 복구 | 유저가 버튼 누를 때만 | **퀄리티·빈도 황금선 자동 조절** |
| PC 리소스 | 매우 높음 (렉, 팬 소음) | 높음 (OS 단위 점유) | 낮음 (브라우저 내부만) | **최소화 (Idle 시에만 AI 가동)** |
| 사생활 보호 | 보통 (모든 화면 캡처) | 최악 (전 세계 반발) | 안전 (해당 영상만) | **최상 (일상 데이터 100% 로컬)** |
| 제품 목적 | 과거 활동 검색 툴 | 화면 복구 백업 툴 | 영상 내용 요약 툴 | **"오, 이거 나쁘지 않네!" 비즈니스 포착 툴** |

**Limina 핵심 차별점 3가지:**
1. **알아서 배달** — 유저가 찾으러 가는 게 아니라, 가치 있을 때만 찾아옴
2. **완전 온디바이스** — 일상 로그는 PC를 떠나지 않음 (MS Recall의 반대)
3. **말맛 포장** — 아이디어를 그냥 주는 게 아니라 흥분되게 포장해서 줌

— Limina Team
