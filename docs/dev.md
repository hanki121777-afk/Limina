# IdeaTok 개발자 가이드 (dev.md)

> 이 문서는 **개발자가 코드를 짤 때 참고하는 기술 가이드**입니다.
> 기술 스택, 환경 세팅, 핵심 모듈 코드 뼈대, 빌드/배포 방법이 들어있습니다.
> `CLAUDE.md`의 절대 규칙을 우선하고, 충돌하면 `CLAUDE.md`를 따르세요.

---

## 1. 기술 스택 한눈에

### 1-1. 5개 하위 프로젝트

| 프로젝트 | 기술 | 역할 |
|---|---|---|
| `desktop-app/` | **Electron + React + TypeScript + Vite** | Win/Mac/Linux 데스크톱 앱 |
| `chrome-extension/` | **JavaScript Manifest V3** | 크롬 + Edge 익스텐션 |
| `web-dashboard/` | **Next.js (App Router) + TS + Tailwind + next-intl** | 로그인/아이디어 대시보드/결제 |
| `landing-page/` | **Next.js + TS + Tailwind + next-intl** | 마케팅 랜딩페이지 |
| `shared/` | **TypeScript only** | 공통 타입/상수 (런타임 없음) |

### 1-2. 외부 서비스

| 서비스 | 용도 | 비용 |
|---|---|---|
| **Supabase** | 인증/DB/Storage/Edge Functions | Free → Pro $25/월 (1만 유저 후) |
| **Anthropic Claude API** | AI 분석 | 종량제 (Haiku 또는 Sonnet) |
| **포트원 v2** | 한국 결제 | 거래액 3.3% |
| **Stripe** | 글로벌 결제 | 거래액 3.4% + $0.30 |
| **Vercel** | 웹 대시보드 + 랜딩 배포 | Free → Pro $20/월 |
| **GitHub Releases** | 데스크톱 앱 자동 업데이트 | Free |
| **크롬 웹스토어** | 익스텐션 배포 | 일회성 $5 (개발자 등록) |
| **Edge Add-ons** | 익스텐션 배포 | Free |

### 1-3. 데스크톱 앱 핵심 라이브러리

```json
{
  "dependencies": {
    "electron": "^32.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "@supabase/supabase-js": "^2.45.0",
    "electron-updater": "^6.3.0",
    "electron-store": "^10.0.0",
    "keytar": "^7.9.0",
    "i18next": "^23.15.0",
    "react-i18next": "^15.0.0",
    "framer-motion": "^11.5.0",
    "lucide-react": "^0.445.0",
    "tailwindcss": "^3.4.0",
    "mammoth": "^1.8.0",
    "xlsx": "^0.18.5",
    "pdf-parse": "^1.1.1",
    "chokidar": "^4.0.0",
    "node-cron": "^3.0.0"
  },
  "devDependencies": {
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "@types/node": "^22.5.0",
    "@types/react": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

**라이브러리 역할:**
- `@anthropic-ai/sdk` — Claude API 호출
- `@supabase/supabase-js` — Supabase 클라이언트
- `electron-updater` — GitHub Releases에서 자동 업데이트
- `electron-store` — config.json 관리 (electron 친화적)
- `keytar` — OS 자격증명 관리자 (Win/Mac/Linux 자동 분기)
- `i18next` + `react-i18next` — 다국어 처리
- `framer-motion` — 부드러운 모달/팝업 애니메이션
- `lucide-react` — 아이콘 (단색 아웃라인 스타일)
- `mammoth` — Word 파일(.docx) 텍스트 추출
- `xlsx` — Excel 파일(.xlsx) 텍스트 추출
- `pdf-parse` — PDF 텍스트 추출
- `chokidar` — 로컬 폴더 파일 변경 감지
- `node-cron` — 정기 작업 스케줄링 (7일 롤링 등)

### 1-4. 웹 (Next.js) 핵심 라이브러리

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "next-intl": "^3.20.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.5.0",
    "lucide-react": "^0.445.0",
    "@portone/browser-sdk": "^0.0.10",
    "stripe": "^17.0.0",
    "@stripe/stripe-js": "^4.5.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0"
  }
}
```

---

## 2. 환경 세팅 (초보자 친화)

> 사용자에게 안내할 때 **한 단계씩, 결과 확인 후 다음 단계로** 진행하세요.

### Step 1. Node.js 설치 확인

```bash
node -v
```
- v20.x.x 이상이어야 함
- 없으면 [nodejs.org](https://nodejs.org)에서 LTS 다운로드

### Step 2. 프로젝트 폴더 만들기

**Windows:**
```powershell
mkdir C:\dev
cd C:\dev
mkdir ideatok
cd ideatok
```

**Mac/Linux:**
```bash
mkdir -p ~/dev/ideatok
cd ~/dev/ideatok
```

⚠️ **Windows는 반드시 영어 경로 사용.** 바탕화면, 한글 폴더 안 됨.

### Step 3. 5개 하위 폴더 생성

```bash
mkdir desktop-app chrome-extension web-dashboard landing-page shared
```

### Step 4. Git 초기화

```bash
git init
```

`.gitignore` 파일을 루트에 생성:

```gitignore
# 의존성
node_modules/
*/node_modules/

# 빌드 결과물
dist/
build/
out/
.next/
*.exe
*.dmg
*.AppImage

# 환경변수 (절대 커밋 금지!)
.env
.env.local
.env.production
*/.env
*/.env.local

# 로그
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Electron
release/
dist_electron/
```

### Step 5. shared/ 폴더 셋업

```bash
cd shared
npm init -y
npm install -D typescript
npx tsc --init
```

`shared/tsconfig.json` 수정:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["types/**/*", "constants/**/*"]
}
```

`shared/types/idea.ts` 예시:

```typescript
export type Grade = 'GOLD' | 'SILVER' | 'BRONZE' | 'REPORT' | 'BURN' | 'EMPTY';

export type QualityMode = 'strict' | 'balance' | 'sensitive';

export type Locale = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'es';

export type Tier = 'free' | 'pro' | 'yearly';

export interface Idea {
  id: string;
  user_id: string;
  created_at: string;
  grade: Grade;
  score: number;
  title: string;
  context: string;
  idea: string;
  business: {
    target: string;
    problem: string;
    solution: string;
    revenue_model: string;
  };
  prompts: {
    step: number;
    title: string;
    content: string;
  }[];
  starred: boolean;
  deleted: boolean;
  locale: Locale;
}

export interface AnalysisResult {
  grade: Grade;
  score: number;
  title?: string;
  context?: string;
  idea?: string;
  business?: Idea['business'];
  prompts?: Idea['prompts'];
  summary?: string;
  keywords?: string[];
}
```

---

## 3. 데스크톱 앱 (Electron) 셋업

### 3-1. 프로젝트 생성

```bash
cd desktop-app
npm create @quick-start/electron@latest . -- --template react-ts
```

선택지가 뜨면:
- Add Electron updater plugin? → **Yes**
- Enable Electron download mirror proxy? → **No** (한국에서도 No)

설치 끝나면:
```bash
npm install
npm run dev
```

기본 창이 뜨면 OK.

### 3-2. 핵심 의존성 추가 설치

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js electron-updater electron-store keytar
npm install i18next react-i18next i18next-fs-backend
npm install framer-motion lucide-react
npm install mammoth xlsx pdf-parse chokidar node-cron
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3-3. Tailwind 설정

`desktop-app/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#0a0a0a',
          1: '#0d0d0d',
          card: '#111111',
          'card-2': '#131313',
        },
        cyan: {
          DEFAULT: '#06b6d4',
          dim: 'rgba(6,182,212,0.5)',
          soft: 'rgba(6,182,212,0.08)',
          glow: 'rgba(6,182,212,0.25)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
        },
        muted: {
          DEFAULT: 'rgba(255,255,255,0.55)',
          2: 'rgba(255,255,255,0.35)',
          dim: 'rgba(255,255,255,0.18)',
        },
      },
      fontFamily: {
        en: ['Unbounded', 'sans-serif'],
        ko: ['Pretendard', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 3-4. 핵심 모듈 코드 뼈대

#### A. 로컬 HTTP 서버 (익스텐션 수신)

`desktop-app/src/main/local-server.ts`:

```typescript
import { createServer } from 'node:http';
import { config } from './storage/config';
import { appendDailyLog } from './storage/daily-log';

const PORT = 7421;

export function startLocalServer() {
  const server = createServer((req, res) => {
    // CORS: 익스텐션만 허용
    res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IdeaTok-Token');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // 토큰 검증
    const token = req.headers['x-ideatok-token'];
    const validToken = config.get('local_server.auth_token');
    if (token !== validToken) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'invalid_token' }));
      return;
    }
    
    // 라우팅
    if (req.method === 'POST' && req.url === '/collect') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          appendDailyLog(data);
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', logged: true }));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'invalid_json' }));
        }
      });
      return;
    }
    
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'running',
        version: app.getVersion(),
        tier: config.get('subscription.tier'),
        collection_enabled: true,
      }));
      return;
    }
    
    res.writeHead(404);
    res.end();
  });
  
  // 127.0.0.1만 바인딩 (외부 차단)
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Local server running at http://127.0.0.1:${PORT}`);
  });
  
  return server;
}
```

#### B. Idle 감지

`desktop-app/src/main/analyzer/idle-monitor.ts`:

```typescript
import { powerMonitor } from 'electron';
import os from 'node:os';

const IDLE_THRESHOLD_SECONDS = 30;
const CPU_THRESHOLD_PERCENT = 20;
const BOOT_DELAY_SECONDS = 300;

const startTime = Date.now();

export function isIdle(): boolean {
  // 부팅 후 5분 경과?
  const uptimeSec = (Date.now() - startTime) / 1000;
  if (uptimeSec < BOOT_DELAY_SECONDS) return false;
  
  // 마우스/키보드 입력 30초 이상 없음?
  const idleSec = powerMonitor.getSystemIdleTime();
  if (idleSec < IDLE_THRESHOLD_SECONDS) return false;
  
  // CPU 사용률 20% 미만?
  const cpuUsage = getCpuUsage();
  if (cpuUsage >= CPU_THRESHOLD_PERCENT) return false;
  
  return true;
}

function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    Object.values(cpu.times).forEach(time => { totalTick += time; });
    totalIdle += cpu.times.idle;
  });
  
  return 100 - Math.round((totalIdle / totalTick) * 100);
}
```

#### C. 클립보드 모니터링

`desktop-app/src/main/collectors/clipboard.ts`:

```typescript
import { clipboard } from 'electron';
import { appendDailyLog } from '../storage/daily-log';
import { maskPII } from '../analyzer/masking';
import { isBlacklistedContent } from '../analyzer/blacklist';

let lastClipboardText = '';
const POLL_INTERVAL_MS = 1500;

export function startClipboardMonitor() {
  setInterval(() => {
    try {
      const text = clipboard.readText();
      
      // 변경 없음
      if (text === lastClipboardText) return;
      lastClipboardText = text;
      
      // 너무 짧음 (의미 없음)
      if (text.length < 20) return;
      
      // 블랙리스트 (비밀번호, 카드번호 등)
      if (isBlacklistedContent(text)) return;
      
      // 마스킹 후 저장
      const masked = maskPII(text);
      appendDailyLog({
        source: 'clipboard',
        content: masked,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // 클립보드 접근 실패 무시
    }
  }, POLL_INTERVAL_MS);
}
```

#### D. Claude API 호출 (Haiku/Sonnet 자동 분기)

`desktop-app/src/main/analyzer/api-caller.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import keytar from 'keytar';
import { config } from '../storage/config';
import { buildPrompt } from './prompt-builder';
import { parseResponse } from './response-parser';
import type { AnalysisResult } from '@shared/types/idea';

const KEYTAR_SERVICE = 'IdeaTok';
const KEYTAR_ACCOUNT = 'anthropic_api_key';

export async function analyzeLogs(dailyLog: string): Promise<AnalysisResult> {
  const apiKey = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
  if (!apiKey) throw new Error('API_KEY_NOT_FOUND');
  
  const tier = config.get('subscription.tier');
  const locale = config.get('user.language');
  
  const model = tier === 'pro' || tier === 'yearly'
    ? 'claude-sonnet-4-20250514'
    : 'claude-haiku-4-5-20251001';
  
  const client = new Anthropic({ apiKey });
  
  const prompt = buildPrompt({
    dailyLog,
    userInterests: config.get('user.interest_categories'),
    qualityMode: config.get('analysis.quality_mode'),
    daysSinceLastPopup: getDaysSinceLastPopup(),
    locale,
  });
  
  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0].type === 'text'
    ? response.content[0].text
    : '';
  
  return parseResponse(text);
}
```

#### E. 트레이 알림

`desktop-app/src/main/tray.ts`:

```typescript
import { Tray, Menu, Notification, nativeImage, shell } from 'electron';
import { config } from './storage/config';
import { t } from './i18n';
import path from 'node:path';

let tray: Tray | null = null;

export function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  
  tray.setToolTip('IdeaTok');
  
  const menu = Menu.buildFromTemplate([
    { label: t('tray.dashboard'), click: openDashboard },
    { label: t('tray.settings'), click: openSettings },
    { type: 'separator' },
    { label: t('tray.quit'), role: 'quit' },
  ]);
  
  tray.setContextMenu(menu);
}

export function showIdeaNotification(idea: {
  id: string;
  grade: string;
  title: string;
}) {
  const locale = config.get('user.language');
  
  const notif = new Notification({
    title: t(`notification.${idea.grade.toLowerCase()}.title`, { lng: locale }),
    body: idea.title,
    icon: getGradeIcon(idea.grade),
  });
  
  notif.on('click', () => {
    shell.openExternal(
      `https://ideatok.com/${locale}/dashboard/ideas/${idea.id}`
    );
  });
  
  notif.show();
}
```

#### F. 자동 업데이트

`desktop-app/src/main/auto-update.ts`:

```typescript
import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  
  autoUpdater.on('update-available', async () => {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of IdeaTok is available. Download now?',
      buttons: ['Download', 'Later'],
    });
    
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
  
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
  
  // 앱 시작 시 + 매일 자정 체크
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 24 * 60 * 60 * 1000);
}
```

---

## 4. 웹 대시보드 (Next.js) 셋업

### 4-1. 프로젝트 생성

```bash
cd web-dashboard
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

옵션:
- TypeScript? → **Yes**
- ESLint? → **Yes**
- Tailwind CSS? → **Yes**
- `src/` directory? → **Yes**
- App Router? → **Yes**
- Turbopack? → **No** (안정성 우선)
- Customize import alias? → **No** (`@/*` 그대로)

### 4-2. 핵심 의존성

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install next-intl
npm install framer-motion lucide-react
npm install @portone/browser-sdk stripe @stripe/stripe-js
npm install zod react-hook-form @hookform/resolvers
```

### 4-3. 폴더 구조

```
web-dashboard/src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx           # 아이디어 그리드
│   │   ├── ideas/[id]/
│   │   │   └── page.tsx           # 아이디어 상세
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── page.tsx               # /[locale] 진입점
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── webhook/payment/route.ts
├── components/
│   ├── ui/                        # 기본 UI (Button, Card 등)
│   ├── IdeaCard.tsx
│   ├── IdeaDetail.tsx
│   ├── LanguageSwitcher.tsx
│   └── ConfirmModal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # 브라우저용
│   │   ├── server.ts              # 서버용
│   │   └── middleware.ts
│   ├── payment/
│   │   ├── portone.ts
│   │   ├── stripe.ts
│   │   └── select-method.ts       # 지역 분기
│   └── i18n.ts
├── messages/                       # 다국어 번역
│   ├── ko.json
│   ├── en.json
│   ├── ja.json
│   ├── zh-CN.json
│   ├── zh-TW.json
│   └── es.json
└── middleware.ts                   # locale 라우팅
```

---

## 5. 크롬·Edge 익스텐션 셋업

### 5-1. manifest.json (MV3)

`chrome-extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "1.0.0",
  "default_locale": "en",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["http://localhost:7421/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/16.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}
```

### 5-2. 다국어 (chrome.i18n API)

`chrome-extension/_locales/en/messages.json`:

```json
{
  "extension_name": {
    "message": "IdeaTok — AI Idea Detector"
  },
  "extension_description": {
    "message": "Collects text data from your browsing and lets AI detect business ideas. All processing is local."
  },
  "popup_title": {
    "message": "IdeaTok Collector"
  }
}
```

`chrome-extension/_locales/ko/messages.json`:

```json
{
  "extension_name": {
    "message": "IdeaTok — AI 아이디어 탐지기"
  },
  "extension_description": {
    "message": "당신의 브라우징 데이터를 모아 AI가 비즈니스 아이디어를 발견하도록 돕습니다. 모든 처리는 로컬에서 이루어집니다."
  },
  "popup_title": {
    "message": "IdeaTok 수집기"
  }
}
```

### 5-3. 핵심 코드

`chrome-extension/content.js`:

```javascript
const COLLECTORS = {
  'youtube.com': collectYoutube,
  'news.naver.com': collectNews,
  'claude.ai': collectAIChat,
  'chatgpt.com': collectAIChat,
  'gemini.google.com': collectAIChat,
};

function getCollector(hostname) {
  for (const [domain, fn] of Object.entries(COLLECTORS)) {
    if (hostname.includes(domain)) return fn;
  }
  return collectGeneric;
}

async function sendToApp(data) {
  const { authToken } = await chrome.storage.local.get('authToken');
  if (!authToken) {
    console.warn('IdeaTok: Auth token not set. Open desktop app first.');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:7421/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IdeaTok-Token': authToken,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.warn('IdeaTok: Server returned', response.status);
    }
  } catch (err) {
    // 데스크톱 앱이 안 켜져 있음 — 무시
  }
}

// 도메인별 수집 함수
function collectYoutube() {
  const title = document.querySelector('h1.title')?.textContent;
  const comments = [...document.querySelectorAll('#content-text')]
    .slice(0, 3)
    .map(el => el.textContent);
  
  if (title) {
    sendToApp({
      source: 'youtube',
      url: location.href,
      title,
      content: comments.join(' | '),
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 6. config.json 구조 (데스크톱 앱)

`%APPDATA%/IdeaTok/config.json` (Win), `~/Library/Application Support/IdeaTok/config.json` (Mac), `~/.config/IdeaTok/config.json` (Linux):

```json
{
  "version": "1.0.0",
  "first_run": false,
  "user": {
    "language": "ko",
    "interest_categories": ["startup", "tech", "real_estate"],
    "onboarding_completed": true,
    "supabase_user_id": "uuid",
    "device_id": "32자랜덤"
  },
  "local_server": {
    "port": 7421,
    "auth_token": "32자랜덤"
  },
  "collection": {
    "enabled_sources": ["youtube", "news", "clipboard", "office", "pdf", "ai_chat"],
    "blacklist_domains": ["banking.naver.com", "pay.naver.com"],
    "blacklist_keywords": [],
    "trigger_keywords": [],
    "local_folder_paths": []
  },
  "analysis": {
    "quality_mode": "balance",
    "retention_days": 7,
    "max_silence_days": 5,
    "boot_delay_seconds": 300,
    "idle_cpu_threshold": 20,
    "idle_input_seconds": 30
  },
  "subscription": {
    "tier": "free",
    "license_key": null,
    "expires_at": null,
    "monthly_limit": 10,
    "used_this_month": 0,
    "last_verified": "2026-05-23T00:00:00Z"
  },
  "api": {
    "free_model": "claude-haiku-4-5-20251001",
    "pro_model": "claude-sonnet-4-20250514"
  }
}
```

---

## 7. 빌드 및 배포

### 7-1. 데스크톱 앱 (electron-builder)

`desktop-app/electron-builder.yml`:

```yaml
appId: com.ideatok.app
productName: IdeaTok
copyright: Copyright © 2026 IdeaTok

directories:
  output: release/${version}
  buildResources: build

files:
  - dist/**/*
  - node_modules/**/*
  - package.json

# Windows
win:
  target:
    - target: nsis
      arch: [x64]
  icon: build/icon.ico
  publisherName: IdeaTok
  
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  
# Mac
mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: build/icon.icns
  category: public.app-category.productivity
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  
# Linux
linux:
  target:
    - AppImage
    - deb
  icon: build/icon.png
  category: Office

# 자동 업데이트
publish:
  provider: github
  owner: ideatok
  repo: ideatok-desktop
```

빌드 명령:

```bash
# 개발 빌드
npm run build

# 플랫폼별 배포 빌드 (현재 OS만)
npm run build:win
npm run build:mac
npm run build:linux

# 전체 (CI 환경 추천)
npm run build:all
```

### 7-2. 웹 빌드 + Vercel 배포

```bash
cd web-dashboard
npm run build           # 로컬 확인
npx vercel              # 처음 한 번만 로그인
npx vercel --prod       # 프로덕션 배포 (사용자 명시 지시 시에만!)
```

### 7-3. 크롬·Edge 익스텐션 배포

1. `chrome-extension/` 폴더 압축 → `.zip`
2. **크롬 웹스토어**: https://chrome.google.com/webstore/devconsole
3. **Edge Add-ons**: https://partner.microsoft.com/dashboard/microsoftedge
4. 둘 다 동일한 .zip 업로드 가능 (MV3 호환)

---

## 8. 보안 체크리스트

배포 전 반드시 확인:

- [ ] `.env`가 `.gitignore`에 포함되어 있나?
- [ ] API 키가 코드에 하드코딩되지 않았나?
- [ ] `console.log`에 민감 정보 출력되지 않나?
- [ ] Claude API 호출 전 PII 마스킹이 적용되나?
- [ ] 로컬 HTTP 서버가 127.0.0.1만 바인딩하나?
- [ ] X-IdeaTok-Token 헤더 검증이 작동하나?
- [ ] Supabase RLS가 활성화되어 있나?
- [ ] CSP (Content Security Policy)가 설정되어 있나?
- [ ] Electron `contextIsolation: true`, `nodeIntegration: false`인가?

---

## 9. 자주 묻는 질문 (사용자 안내용)

### Q. Claude API 키는 어디서 받나요?
[console.anthropic.com](https://console.anthropic.com) → 가입 → API Keys → Create Key

### Q. Supabase 프로젝트는 어떻게 만들죠?
1. [supabase.com](https://supabase.com) 가입
2. "New Project" 클릭
3. 프로젝트 이름: `ideatok`
4. Database Password 설정 (안전한 곳에 보관)
5. Region: 한국 유저 많으면 `Northeast Asia (Seoul)`, 글로벌이면 `US East`

### Q. 포트원 vs Stripe 계정 둘 다 필요한가요?
- 한국 유저만 받으면: 포트원만
- 글로벌 출시: 둘 다

### Q. 익스텐션과 데스크톱 앱은 어떻게 연결되나요?
- 데스크톱 앱 첫 실행 시 32자 토큰이 생성됩니다
- 익스텐션 설치 후 옵션 페이지에서 토큰 입력
- 토큰이 일치하면 자동으로 연결됨

---

## 10. Antigravity AI 작업 팁

작업 단위를 작게 쪼개서 하나씩 요청할 것.

**✅ 좋은 예시:**
> "desktop-app/src/main/collectors/clipboard.ts 만들어줘. Electron clipboard API로 1.5초마다 폴링하고, 변경 감지 시 마스킹 후 daily_log에 저장하는 코드."

**❌ 나쁜 예시:**
> "전체 앱 만들어줘"

---

## 11. Claude Code 투입 시점

다음 4가지 상황에서만 Claude Code 사용:

1. **버그가 잡히지 않을 때** — Antigravity가 못 찾는 버그
2. **OS별 네이티브 코드** — Windows API, macOS Keychain 직접 호출
3. **성능 최적화** — CPU/메모리 누수 진단
4. **빌드/패키징 이슈** — electron-builder 코드 사이닝, 공증

그 외는 Antigravity로 진행.
