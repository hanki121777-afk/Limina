# Agent Workflow: IdeaTok 시스템 제어 가이드 (agent.md)

> 이 문서는 IdeaTok의 **시스템 작동 규칙**을 정의합니다.
> "유저가 앱을 사용하면 시스템이 어떻게 반응해야 하는가"에 대한 모든 답이 여기 있습니다.
> 코드를 짤 때 이 문서의 흐름을 그대로 구현하세요.

---

## 1. 프로젝트 한 줄 요약

IdeaTok은 유저의 PC 사용 중 발생하는 텍스트 데이터를 초경량으로 수집하고,
AI가 비즈니스 아이디어를 도출해 **조건부 팝업**으로 전달하는 **온디바이스 글로벌 SaaS**다.

### 핵심 철학 (절대 어기지 말 것)
- **억지로 아이디어를 쥐어짜지 않는다** — 진짜 가치 있을 때만 알린다
- **PC 렉 제로** — 유저가 존재를 인식하지 못해야 한다
- **온디바이스 우선** — 일상 데이터는 PC를 떠나지 않는다
- **말맛으로 포장** — 좋은 아이디어도 표현이 밋밋하면 흘려진다

---

## 2. 전체 프로젝트 구조

```
ideatok/
│
├── desktop-app/               # 🖥️ Electron 데스크톱 앱 (Win/Mac/Linux)
│   ├── src/
│   │   ├── main/              # Electron 메인 프로세스 (Node.js)
│   │   │   ├── index.ts       # 진입점
│   │   │   ├── local-server.ts        # localhost:7421 HTTP 서버
│   │   │   ├── tray.ts        # 트레이 아이콘 + 알림
│   │   │   ├── auto-update.ts # 자동 업데이트 (electron-updater)
│   │   │   ├── collectors/
│   │   │   │   ├── clipboard.ts       # 클립보드 모니터링
│   │   │   │   ├── office.ts          # 오피스 파일 추출
│   │   │   │   ├── pdf.ts             # PDF 텍스트 추출
│   │   │   │   └── local-folder.ts    # 옵트인 로컬 폴더 감시
│   │   │   ├── analyzer/
│   │   │   │   ├── gate-keeper.ts     # 2단계 게이트키퍼
│   │   │   │   ├── idle-monitor.ts    # Idle 타임 감지
│   │   │   │   ├── api-caller.ts      # Claude API 호출
│   │   │   │   ├── prompt-builder.ts  # 프롬프트 생성
│   │   │   │   └── masking.ts         # 개인정보 마스킹
│   │   │   ├── storage/
│   │   │   │   ├── daily-log.ts       # daily_log.txt 읽기/쓰기
│   │   │   │   ├── config.ts          # config.json 관리
│   │   │   │   └── rolling-data.ts    # 7일 롤링 관리
│   │   │   └── sync/
│   │   │       └── idea-upload.ts     # 아이디어 → Supabase 업로드
│   │   ├── renderer/          # Electron 렌더러 (React UI)
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Onboarding.tsx     # 첫 설치 온보딩
│   │   │   │   ├── Settings.tsx       # 설정 화면
│   │   │   │   └── Tray-Menu.tsx      # 트레이 메뉴
│   │   │   ├── components/
│   │   │   ├── i18n/                  # 다국어 (6개 언어)
│   │   │   │   ├── ko.json
│   │   │   │   ├── en.json
│   │   │   │   ├── ja.json
│   │   │   │   ├── zh-CN.json
│   │   │   │   ├── zh-TW.json
│   │   │   │   └── es.json
│   │   │   └── styles/
│   │   └── preload/           # contextBridge (보안 격리)
│   ├── package.json
│   └── electron-builder.yml   # 빌드 설정 (Win/Mac/Linux)
│
├── chrome-extension/          # 🌐 크롬 + Edge 익스텐션
│   ├── manifest.json          # MV3
│   ├── background.js          # 서비스 워커
│   ├── content.js             # 페이지 텍스트 수집
│   ├── collectors/
│   │   ├── youtube.js
│   │   ├── news.js
│   │   ├── ai-chat.js         # Claude/ChatGPT/Gemini
│   │   ├── search.js          # Google/Naver/Bing
│   │   └── generic.js         # 그 외 도메인
│   ├── popup/                 # 익스텐션 옵션 페이지
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── _locales/              # 익스텐션 다국어
│       ├── ko/messages.json
│       ├── en/messages.json
│       └── ...
│
├── web-dashboard/             # 💻 웹 대시보드 (Next.js)
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── dashboard/     # 메인 (아이디어 그리드)
│   │   │   ├── ideas/[id]/    # 아이디어 상세
│   │   │   ├── settings/      # 계정/구독 관리
│   │   │   └── pricing/       # 가격 페이지
│   │   └── api/               # API Route
│   ├── messages/              # 다국어 번역
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── i18n.ts
│   │   └── payment/
│   │       ├── portone.ts     # 한국 결제
│   │       └── stripe.ts      # 글로벌 결제
│   └── components/
│
├── landing-page/              # 🚀 랜딩페이지 (Next.js)
│   ├── app/
│   │   └── [locale]/
│   │       ├── page.tsx       # 히어로 + 기능 + 가격
│   │       ├── download/      # 다운로드 페이지
│   │       └── docs/          # 사용 가이드
│   └── messages/
│
└── shared/                    # 📦 공통 TypeScript 타입
    ├── types/
    │   ├── idea.ts            # Idea 타입 정의
    │   ├── user.ts
    │   └── analysis.ts
    └── constants/
        ├── grades.ts
        └── tiers.ts
```

---

## 3. 수집 시스템

### 3-1. 수집 원칙

- **텍스트만 수집** — 이미지, 영상, 화면 캡처 절대 금지
- **로컬 저장만** — 외부 서버 전송 없음 (AI API 호출 시에만 일시 전송)
- **블랙리스트 자동 차단** — 결제/금융/비밀번호 입력창
- **개인정보 자동 마스킹** — 이메일, 전화번호, 신용카드, 주민번호 패턴
- **메신저 자동 수집 금지** — 클립보드를 통한 수동 복사만 OK

### 3-2. 수집 소스

| 수집 도구 | 수집 대상 |
|-----------|-----------|
| **크롬·Edge 익스텐션** | 유튜브 (제목+상위 댓글), 뉴스, 블로그, 웹툰, AI 대화(Claude/ChatGPT/Gemini), 지메일 (제목+미리보기), 강의 플랫폼, 구글/네이버/Bing 검색어, 브라우저 PDF |
| **데스크톱 앱 — 클립보드** | 유저가 직접 복사(Ctrl+C)한 모든 텍스트 (카톡/LINE/Discord 등 메신저 메시지 포함) |
| **데스크톱 앱 — 오피스** | 엑셀, 파워포인트, 워드 (변경 감지 시 텍스트 추출) |
| **데스크톱 앱 — PDF** | Adobe Acrobat에서 열린 PDF 파일명 + 메타데이터 |
| **데스크톱 앱 — 로컬 폴더 (옵트인)** | 유저 지정 폴더의 .txt, .md 파일 변경 감지 |

### 3-3. daily_log.txt 포맷

```
[2026-05-23 09:14:30+09:00 youtube] {"title":"드론 배달 규제 완화 2026","top_comment":"이제 진짜 되는건가","url":"youtube.com/watch?v=..."}
[2026-05-23 11:30:12+09:00 clipboard] 택배 또 도난당했다고 뉴스에서 봤는데...
[2026-05-23 13:05:01+09:00 news] {"title":"아파트 스마트 보안 시장 3조 돌파","source":"chosun.com"}
[2026-05-23 15:22:45+09:00 ai_chat] User: 드론 물류 어떻게 보고 있어? | AI: ...
[2026-05-23 17:10:20+09:00 word] file: 물류_스타트업_분석.docx | content: 드론 배달의 미래...
```

**저장 위치**:
- Windows: `%APPDATA%/IdeaTok/daily_log.txt`
- Mac: `~/Library/Application Support/IdeaTok/daily_log.txt`
- Linux: `~/.config/IdeaTok/daily_log.txt`

---

## 4. 데이터 보관 정책

- **기본 보관 기간: 7일** (롤링 윈도우)
- 8일째 데이터 **자동 소각** (덮어쓰기 + 빈 공간 zero-fill)
- 보관 기간은 config.json에서 **3~14일로 조정 가능**
- 단독으로 별로인 데이터도 다른 날 데이터와 시너지 가능 → **즉시 소각 금지**
- 블랙리스트 도메인 접속 시 **수집 자체를 안 함** (저장도 안 됨)

---

## 5. 첫 설치 온보딩 (5단계)

신규 유저가 첫 실행 시 거치는 화면.

### Step 1 — 언어 선택 (자동 감지)

OS 언어를 자동 감지해서 기본값 설정. 유저는 드롭다운으로 변경 가능.

지원 언어:
- 🇰🇷 한국어 (ko)
- 🇺🇸 English (en) — 기본값 (OS가 6개 외 언어일 때)
- 🇯🇵 日本語 (ja)
- 🇨🇳 简体中文 (zh-CN)
- 🇹🇼 繁體中文 (zh-TW)
- 🇪🇸 Español (es)

선택값은 `config.json`의 `user.language` 필드에 저장.

### Step 2 — 환영 + 권한 안내

- 무엇을 수집하는지 설명
- "당신의 일상 데이터는 PC를 떠나지 않습니다" 강조
- "생성된 아이디어만 안전하게 클라우드에 보관됩니다" 안내
- 카테고리별 수집 On/Off 스위치 (기본: 전부 ON)

### Step 3 — 관심 분야 선택 (3~5개)

유저가 체크박스로 선택:
- 창업/스타트업
- 재테크/투자
- IT/AI/테크
- 푸드/요식업
- 라이프스타일/인테리어
- 헬스/뷰티
- 교육/강의
- 콘텐츠/미디어
- 부동산
- 여행/레저

### Step 4 — 퀄리티 모드 선택

| 모드 | 알림 빈도 | 설명 |
|------|-----------|------|
| 엄격 모드 | 가끔 (대박만) | 9점 이상 GOLD만 알림 |
| 밸런스 모드 (기본) | 주 1~2회 | 6점 이상 알림 |
| 민감 모드 | 자주 | 4점 이상 가벼운 영감도 |

### Step 5 — 첫 사용자 빠른 첫 알림

신규 유저는 데이터 임계치를 **일시 완화** (1일치 데이터로도 분석 시도).
첫 알림을 빠르게 경험하게 해서 앱 가치 즉시 체감.

---

## 6. 분석 시스템

### 6-1. 분석 실행 시점

**기본 트리거 (AND 조건):**
1. 앱 부팅 후 5분 경과
2. CPU 점유율 20% 미만
3. 마우스/키보드 입력 없는 상태 30초 이상 지속
4. 1단계 게이트 통과 (데이터 밀도 충분)

분석은 **야간 1순위, 낮 Idle 2순위**로 아무 때나 실행 가능.
점심시간, 자리 비운 시간, 가벼운 콘텐츠 보는 시간 등.

**즉시 트리거 (옵션, 기본 OFF):**
- 유저가 등록한 트리거 키워드가 수집되는 순간 즉시 분석
- 예: "드론", "구독", "AI" 등 핫 키워드 매치 시
- 설정 → 고급 → 트리거 키워드에서 활성화

### 6-2. 2단계 게이트키퍼

**1단계 — 데이터 밀도 검사 (로컬, AI 호출 없음)**
- 의미있는 텍스트 임계치 미달 시 분석 SKIP
- 기간 무관 — 30분이라도 풍부한 데이터면 통과
- 단순 음악 재생, 배경 영상만 있으면 SKIP

**2단계 — AI 점수제 (Claude API 호출)**
- Claude API로 최근 7일 롤링 데이터 분석
- AI가 자체 평가한 점수(1~10) 반환
- 유저의 퀄리티 모드 커트라인과 비교
- 커트라인 미달 시 **조용히 소각** 후 재누적

### 6-3. 등급 vs 퀄리티 모드 구분

**등급 (AI가 자체 평가하는 라벨):**
- **GOLD**: 8~10점 → 특급 아이디어
- **SILVER**: 6~7점 → 가벼운 영감
- **BRONZE**: 4~5점 → 트렌드성 아이디어
- **BURN**: 1~3점 → 무조건 소각

**퀄리티 모드 (유저가 설정하는 알림 기준):**
- 엄격: GOLD(9점 이상)만 알림
- 밸런스: GOLD + SILVER 알림
- 민감: GOLD + SILVER + BRONZE 알림

### 6-4. 최대 침묵 기한 (Max Silence Cap)

- 5일 이상 알림 없으면 **REPORT 등급으로 강제 출력**
- "이번 주 특별한 아이디어는 없었지만, 당신의 관심사 키워드는 이렇습니다"
- 유저가 "프로그램 고장"으로 오인하는 것 방지

---

## 7. 출력 등급 및 팝업 로직

```typescript
// desktop-app/src/main/notifier/handle-result.ts
function handleAnalysisResult(result: AnalysisResult, userConfig: UserConfig) {
  const threshold = {
    strict: 9,
    balance: 6,
    sensitive: 4
  }[userConfig.qualityMode];
  
  if (result.score < threshold && result.grade !== 'REPORT') {
    return silentBurn(); // 조용히 소각, 재누적
  }
  
  // 1. Supabase에 아이디어 업로드
  const ideaId = uploadIdeaToSupabase(result);
  
  // 2. 등급별 트레이 팝업 표시
  showTrayNotification({
    grade: result.grade,
    title: result.title,
    body: getTitleByGrade(result.grade, locale),
    onClick: () => openDashboard(ideaId)
  });
}

function getTitleByGrade(grade: Grade, locale: string): string {
  // i18n 키 사용
  return t(`notification.${grade.toLowerCase()}.body`, { locale });
}
```

### 팝업 메시지 (다국어, 예시)

| 등급 | 한국어 | English | 日本語 |
|---|---|---|---|
| GOLD | 💡 특급 아이디어 포착 | 💡 Premium Idea Detected | 💡 特級アイデア発見 |
| SILVER | 아이디어 도착 | New Idea Arrived | アイデア到着 |
| BRONZE | 가벼운 영감 | Light Inspiration | 軽いインスピレーション |
| REPORT | 최근 관심사 요약 | Weekly Interest Summary | 関心事まとめ |

### 팝업 클릭 시 동작

```typescript
// 브라우저 기본 앱으로 대시보드 열기
shell.openExternal(`https://ideatok.com/dashboard/ideas/${ideaId}?lang=${userConfig.language}`);
```

---

## 8. 아이디어 데이터 흐름

```
유저 PC                                      클라우드
─────────────────────────────────────────────────────────
크롬 익스텐션 ──┐
                ├─→ 데스크톱 앱
데스크톱 수집 ──┘     │
                      ├─→ daily_log.txt (로컬, 7일 롤링)
                      │
                      ├─→ Idle 감지
                      │
                      ├─→ 1단계 게이트 (로컬)
                      │
                      ├─→ Claude API 호출 ────→ Anthropic
                      │     ↑ 분석 후 즉시 폐기
                      │
                      ├─→ 등급 판정 + 말맛 포장
                      │
                      ├─→ Supabase ideas ────→ Supabase DB
                      │   (결과물만 저장)
                      │
                      ├─→ 트레이 팝업
                      │
                      └─→ 유저 클릭 시
                              ↓
                          웹 대시보드 열림 ←── ideatok.com
                              ↓
                          아이디어 상세 표시
                          (단계별 프롬프트 복사 가능)
```

---

## 9. 웹 대시보드 (ideatok.com/dashboard)

팝업 클릭 시 브라우저로 열리는 페이지. **로그인 필수.**

### 9-1. 기능 범위 (딱 이것만)

- **아이디어 목록** — 지금까지 생성된 아이디어 카드 나열 (최신순)
- **관심 체크 (★)** — 중요한 아이디어 별표 표시, 필터링 가능
- **삭제** — 불필요한 아이디어 삭제 (soft delete)
- **언어 변경** — 우측 상단 드롭다운으로 즉시 변경

### 9-2. 아이디어 카드 표시 항목

```
┌──────────────────────────────────┐
│ [GOLD · 9.2/10]    ★ ⋮          │
│                                  │
│ 아파트 드론 전용 도난 방지 수거함  │
│                                  │
│ 새벽 3시, 드론이 베란다에 조용히  │
│ 착륙합니다. 당신은 잠에서 깨지... │
│                                  │
│ 2026-05-23 15:30                │
└──────────────────────────────────┘
```

### 9-3. 아이디어 상세 화면

- 헤더: 등급 뱃지 + 점수 + 제목
- 컨텍스트: "어떤 데이터들이 융합되어 이 아이디어가 나왔는지"
- 아이디어 설명 (말맛 포장된 3~5줄)
- 비즈니스 뼈대: 타겟 / 문제 / 해결 / 수익모델
- **단계별 프롬프트 3~5개** (각각 복사 버튼)
- 액션: 관심 체크(★), 삭제

### 9-4. 대시보드 범위 밖 (유저가 AI와 직접 해결할 영역)

온도계, 실행 난이도, 유사 사례 검색, 시장 분석, 사업계획 구체화, 게시판/공유 등은 **IdeaTok이 제공하지 않음.**

유저가 프롬프트를 복사해서 본인이 쓰는 AI(ChatGPT, Claude, Gemini 등)에게 직접 물어보는 방식으로 처리.

> **IdeaTok은 "아이디어 생성 + 전달"까지만 책임진다. 그 이상은 유저의 AI 영역.**

---

## 10. 단계별 프롬프트 (예시)

각 아이디어마다 5개의 단계별 프롬프트가 자동 생성됨.
유저는 복사해서 자기가 쓰는 AI에 붙여넣고 사업 구체화.

```
[1단계 시장 검증]
→ "아파트 드론 전용 도난 방지 수거함이라는 아이디어의 국내외 시장 규모와 
   타겟 고객층을 분석해줘. 특히 드론 배달 규제 완화 이후의 시장 전망 포함해서."

[2단계 경쟁사 분석]
→ "이 아이디어와 유사한 해외 서비스를 찾고, 우리만의 차별점 3가지를 제안해줘.
   미국 Boxlock, 독일 Package Guard 같은 기존 솔루션과 비교해줘."

[3단계 수익 모델]
→ "월 9,900원 구독 모델을 기준으로, 현실적인 가격 정책과 
   초기 6개월 수익 시뮬레이션을 짜줘. 손익분기점 도달 시점도 계산해줘."

[4단계 MVP 설계]
→ "최소 비용으로 3개월 안에 테스트할 프로토타입 계획을 세워줘.
   초기 자본 500만원 이하 기준."

[5단계 마케팅 전략]
→ "초기 100명 고객을 모을 게릴라 마케팅 전략을 짜줘.
   특히 아파트 단지 단위 베타 테스터 모집 방법 중심으로."
```

---

## 11. 수익 모델 (글로벌)

| 티어 | 한국 | 미국 | 일본 | 중국 | 유럽 | 기타 |
|---|---|---|---|---|---|---|
| Free | 무료 | Free | 無料 | 免费 | Free | Free |
| Pro 월 | 9,900원 | $7.99 | ¥980 | ¥45 | €6.99 | $5.99 |
| Pro 연 | 69,000원 | $59.99 | ¥6,800 | ¥320 | €49.99 | $39.99 |

### 등급별 기능 차이

| 항목 | Free | Pro |
|---|---|---|
| 분석 모델 | Claude Haiku | Claude Sonnet |
| 알림 횟수 | 월 10회 | 무제한 |
| 등급 | SILVER + REPORT | GOLD + SILVER + BRONZE 전부 |
| 대시보드 보관 기한 | 30일 | 무제한 |
| 트리거 키워드 | 1개 | 무제한 |
| 로컬 폴더 모니터링 | 1개 | 무제한 |

### 결제 분기 로직

```typescript
function selectPaymentMethod(userLocale: string): 'portone' | 'stripe' {
  if (userLocale === 'ko' || detectRegion() === 'KR') {
    return 'portone'; // 한국 유저는 카카오페이/네이버페이/카드
  }
  return 'stripe'; // 그 외 글로벌
}
```

---

## 12. 개발 우선순위 (MVP)

이 순서대로 만드세요. **각 단계 완료 후 사용자에게 확인 받고 다음 단계로.**

| # | 작업 | 폴더 | 의존성 |
|---|---|---|---|
| 1 | Supabase 셋업 + 4개 테이블 생성 | (외부) | - |
| 2 | shared/types 공통 타입 정의 | `shared/` | - |
| 3 | 크롬 익스텐션 기본 수집 + manifest | `chrome-extension/` | - |
| 4 | Electron 앱 보일러플레이트 + i18n | `desktop-app/` | - |
| 5 | 데스크톱 앱 로컬 HTTP 서버 (7421) | `desktop-app/` | 4 |
| 6 | 데스크톱 앱 클립보드 + 오피스 수집 | `desktop-app/` | 4 |
| 7 | 7일 롤링 데이터 관리 | `desktop-app/` | 6 |
| 8 | Idle 감지 모듈 | `desktop-app/` | 4 |
| 9 | Claude API 연동 + 2단계 게이트키퍼 | `desktop-app/` | 7, 8 |
| 10 | 등급별 트레이 알림 + 다국어 | `desktop-app/` | 9 |
| 11 | 아이디어 Supabase 업로드 | `desktop-app/` | 1, 9 |
| 12 | 첫 설치 온보딩 4단계 | `desktop-app/` | 4 |
| 13 | Next.js 웹 대시보드 + 다국어 | `web-dashboard/` | 1 |
| 14 | 대시보드 아이디어 목록/상세/★/삭제 | `web-dashboard/` | 13 |
| 15 | 랜딩페이지 + 다국어 | `landing-page/` | - |
| 16 | 포트원 결제 연동 (한국) | `web-dashboard/` | 1, 13 |
| 17 | Stripe 결제 연동 (글로벌) | `web-dashboard/` | 1, 13 |
| 18 | electron-updater 자동 업데이트 | `desktop-app/` | 4 |
| 19 | 빌드 (Win/Mac/Linux) | `desktop-app/` | 18 |
| 20 | 익스텐션 웹스토어 배포 (Chrome/Edge) | `chrome-extension/` | 3 |

---

## 13. v1 출시 후 v2 로드맵

`roadmap.md` 파일 참조. MVP 이후 추가할 기능들:
- 모바일 앱 (Capacitor)
- Firefox/Safari 익스텐션
- 유튜브 자막 분석
- 추가 언어 (포르투갈어, 독일어, 프랑스어 등)
- 음성 메모 분석
- 트렌드 키워드, 카테고리별 알림

**MVP 동안에는 v2 기능 절대 손대지 마세요.**
