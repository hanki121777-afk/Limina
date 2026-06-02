# Limina 디자인 시스템 (design.md)

> 이 문서는 Limina의 모든 UI에서 **일관된 비주얼**을 유지하기 위한 디자인 시스템입니다.
> 데스크톱 앱, 크롬·Edge 익스텐션, 웹 대시보드, 랜딩페이지 — 4개 컴포넌트 모두 동일하게 적용됩니다.

---

## 1. 디자인 철학

- **Linear.app 스타일 다크 SaaS** — 심플하고 임팩트 있게
- **그리드 + 파티클 배경** — 정적이지 않은 살아있는 분위기
- **시안 포인트** — 무채색 + 단일 포인트 컬러로 통일감
- **여백의 미** — 빽빽하게 채우지 않음
- **글로벌 친화** — 다국어 텍스트가 자연스럽게 들어가는 레이아웃

---

## 2. 컬러 시스템

### 2-1. 배경 컬러

```css
--bg-0:       #0a0a0a    /* 페이지 배경 */
--bg-1:       #0d0d0d    /* 섹션 구분 */
--bg-card:    #111111    /* 카드 배경 */
--bg-card-2:  #131313    /* 강조 카드 / 호버 상태 */
--bg-input:   #0f0f0f    /* 입력 필드 배경 */
```

### 2-2. 보더

```css
--border:         rgba(255,255,255,0.08)   /* 기본 보더 */
--border-strong:  rgba(255,255,255,0.14)   /* 호버/강조 보더 */
--border-focus:   #27E0A1                  /* 포커스 시 시안 */
```

### 2-3. 포인트 컬러 (시안)

```css
--cyan:        #27E0A1               /* 메인 포인트 */
--cyan-hover:  #4de8b3               /* 호버 시 약간 밝게 */
--cyan-dim:    rgba(39,224,161,0.5)   /* 흐린 시안 */
--cyan-soft:   rgba(39,224,161,0.08)  /* 배경 틴트 */
--cyan-glow:   rgba(39,224,161,0.25)  /* 글로우/그림자 */
```

### 2-4. 텍스트 컬러

```css
--text:    #ffffff                 /* 메인 텍스트 */
--muted:   rgba(255,255,255,0.55)  /* 부가 설명 */
--muted-2: rgba(255,255,255,0.35)  /* 더 흐린 메타 */
--dim:     rgba(255,255,255,0.18)  /* 매우 흐린 장식 */
```

### 2-5. 등급 컬러 (Grade)

```css
--grade-gold:   #27E0A1    /* GOLD = 시안 (대박 강조) */
--grade-silver: #94a3b8    /* SILVER = 차분한 회색 */
--grade-bronze: #64748b    /* BRONZE = 더 흐린 회색 */
--grade-report: #475569    /* REPORT = 가장 차분 */
```

### 2-6. 시스템 컬러 (오류/성공/경고)

```css
--error:    #ef4444    /* 빨강 — 결제 실패, 삭제 확인 모달 */
--success:  #10b981    /* 초록 — 결제 성공, 저장 완료 */
--warning:  #f59e0b    /* 노랑 — 주의, 라이선스 만료 임박 */
```

### 2-7. 사용 원칙

- **모든 화면 배경은 `--bg-0` (#0a0a0a)**
- **카드/패널은 `--bg-card` 또는 `--bg-card-2`**
- **시안은 강조점에만 사용** — 버튼, GOLD 등급, 링크, 포커스
- **노란색/빨간색은 시스템 상태에만 사용** (오류, 경고, 성공)
- 상태 표시는 시안 농도로 구분 (활성 100%, 비활성 35%)

---

## 3. 타이포그래피 (다국어 폰트)

### 3-1. 폰트 패밀리 (언어별 자동 분기)

```css
/* 헤딩용 영문 (Unbounded는 영문/숫자만!) */
--font-heading-en:  'Unbounded', 'Inter', sans-serif;

/* 본문용 영문 */
--font-body-en:     'Inter', 'Segoe UI', sans-serif;

/* 한글 */
--font-ko:          'Pretendard', 'Apple SD Gothic Neo', sans-serif;

/* 일본어 */
--font-ja:          'Noto Sans JP', 'Hiragino Sans', sans-serif;

/* 중국어 간체 */
--font-zh-cn:       'Noto Sans SC', 'PingFang SC', sans-serif;

/* 중국어 번체 */
--font-zh-tw:       'Noto Sans TC', 'PingFang TC', sans-serif;

/* 스페인어 (기본 영문 폰트 사용) */
--font-es:          'Inter', sans-serif;

/* 코드/레이블 */
--font-mono:        'JetBrains Mono', 'Courier New', monospace;
```

### 3-2. 자동 분기 (CSS 변수 + locale 클래스)

```css
/* 기본 (영어) */
:root {
  --font-body: var(--font-body-en);
  --font-heading: var(--font-heading-en);
}

/* 언어별 오버라이드 */
html[lang="ko"] {
  --font-body: var(--font-ko);
  --font-heading: var(--font-ko);  /* 한글은 헤딩도 Pretendard */
}

html[lang="ja"] {
  --font-body: var(--font-ja);
  --font-heading: var(--font-ja);
}

html[lang="zh-CN"] {
  --font-body: var(--font-zh-cn);
  --font-heading: var(--font-zh-cn);
}

html[lang="zh-TW"] {
  --font-body: var(--font-zh-tw);
  --font-heading: var(--font-zh-tw);
}

html[lang="es"] {
  --font-body: var(--font-es);
  --font-heading: var(--font-heading-en);  /* Unbounded OK (라틴 문자) */
}
```

### 3-3. 절대 원칙

- **Unbounded는 영문/숫자 전용** — 한글/일본어/중국어에 절대 적용 금지
- 헤딩에 영문과 다국어가 섞여 있으면 → 본문 폰트(다국어 폰트) 사용
- 숫자는 가능하면 Unbounded로 (`9,900원`의 `9,900`만 영문 폰트, `원`은 한글 폰트)
- 레이블 (GOLD, SILVER, STEP 01) → JetBrains Mono

### 3-4. 헤딩 크기

| 용도 | 크기 (clamp) | 굵기 | letter-spacing |
|---|---|---|---|
| 히어로 메인 (영문) | `clamp(56px, 9vw, 110px)` | 700 | -2px |
| 히어로 메인 (한/일/중) | `clamp(48px, 8vw, 88px)` | 800 | -1px |
| 섹션 헤딩 H2 | `clamp(36px, 5vw, 56px)` | 700 | -1px |
| 서브 헤딩 H3 | `22px` | 700 | 0 |
| 카드 타이틀 | `17px` | 600 | 0.3px |

> 다국어는 영문보다 약간 작게. 한자/일본어가 영문보다 시각적으로 크게 보이기 때문.

### 3-5. 본문 크기

| 용도 | 크기 | 굵기 | line-height |
|---|---|---|---|
| 메인 본문 | 16px | 400 | 1.6 (한/일/중은 1.75) |
| 카드 설명 | 14px | 300 | 1.8 |
| 메타 텍스트 | 13px | 400 | 1.6 |
| 레이블 (모노) | 11px | 500 | 1 |

### 3-6. 레이블 스타일

```css
.section-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--cyan);
  letter-spacing: 3px;
  text-transform: uppercase;
}
```

예시: `01 — HERO`, `STEP 01`, `GOLD · 9.2`

---

## 4. 레이아웃 & 스페이싱

### 4-1. 컨테이너

```css
--container:        1200px       /* 최대 컨텐츠 너비 */
--container-narrow: 720px        /* 아이디어 상세, 폼 */
--section-pad-y:    120px        /* 섹션 위아래 */
--section-pad-x:    60px         /* 섹션 좌우 (데스크톱) */
```

### 4-2. 스페이싱 스케일

- 카드 내부 padding: `32~40px`
- 컴포넌트 간 gap: `16~20px`
- 텍스트 간 margin: `8~16px`

### 4-3. 보더 라디우스

```css
border-radius: 4px    /* 버튼, 작은 요소 */
border-radius: 8px    /* 입력 필드, 프롬프트 아이템 */
border-radius: 12px   /* 카드 */
border-radius: 100px  /* 뱃지, 둥근 버튼 */
```

---

## 5. 컴포넌트 스펙

### 5-1. 버튼

**Primary (시안 채움)**
```css
background: var(--cyan);
color: #000;
padding: 16px 40px;
border-radius: 4px;
font-size: 15px;
font-weight: 700;
letter-spacing: 1px;
box-shadow: 0 0 32px var(--cyan-glow);
transition: all 0.2s ease;

&:hover {
  background: var(--cyan-hover);
  transform: translateY(-2px);
  box-shadow: 0 0 48px var(--cyan-glow);
}

&:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**Secondary (아웃라인)**
```css
background: transparent;
color: #fff;
border: 1px solid var(--border-strong);
padding: 16px 40px;
border-radius: 4px;

&:hover {
  border-color: var(--cyan);
  background: var(--cyan-soft);
}
```

**Danger (삭제, 구독 취소)**
```css
background: transparent;
color: var(--error);
border: 1px solid var(--error);
```

### 5-2. 카드

**기본 카드**
```css
background: var(--bg-card);
border: 1px solid var(--border);
border-radius: 12px;
padding: 32px;
transition: all 0.2s ease;

&:hover {
  border-color: var(--cyan-dim);
  background: var(--bg-card-2);
}
```

**카드 상단 시안 라인 (강조 카드)**
```css
.card-emphasized::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cyan), transparent);
}
```

### 5-3. 등급 뱃지

**GOLD**
```css
background: var(--cyan-soft);
border: 1px solid var(--cyan-dim);
color: var(--cyan);
padding: 4px 12px;
border-radius: 100px;
font-family: var(--font-mono);
font-size: 11px;
font-weight: 700;
letter-spacing: 1px;
```
표시 예: `GOLD · 9.2`

**SILVER**
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.15);
color: var(--muted);
```

**BRONZE**
```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.1);
color: var(--muted-2);
```

**REPORT**
```css
background: rgba(255,255,255,0.02);
border: 1px solid rgba(255,255,255,0.08);
color: var(--muted-2);
```

**GOLD 잠금 상태 (Free 유저)**
```css
.grade-locked {
  filter: blur(8px);
  pointer-events: none;
}
.grade-locked-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  border-radius: inherit;
}
/* 자물쇠 아이콘 + "Pro로 업그레이드하면 볼 수 있습니다" 메시지 */
```

### 5-4. 입력 필드

```css
background: var(--bg-input);
border: 1px solid var(--border);
border-radius: 8px;
padding: 12px 16px;
color: #fff;
font-family: var(--font-body);
font-size: 14px;
width: 100%;
transition: all 0.2s ease;

&:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--cyan-soft);
}

&::placeholder {
  color: var(--muted-2);
}
```

### 5-5. 윈도우 트레이 팝업 (네이티브)

OS 알림 시스템 사용. 좌측 라인 컬러로 등급 구분.

```
┌──────────────────────────────────┐
│ ▎💡 특급 아이디어 포착             │  ← 좌측 시안 4px 라인
│                                  │
│ 지난 4일간 분석 결과...           │
│ 드디어 특급 아이템 1개 포착!     │
│                                  │
│ [확인하기 →]                     │
└──────────────────────────────────┘
```

| 등급 | 좌측 라인 컬러 | 톤앤매너 |
|---|---|---|
| GOLD | var(--cyan) | 흥분, 펄스 애니메이션 |
| SILVER | rgba(255,255,255,0.4) | 차분 |
| BRONZE | rgba(255,255,255,0.25) | 더 차분 |
| REPORT | rgba(255,255,255,0.18) | 정보 톤, 무채색 |

### 5-6. 웹 대시보드 — 아이디어 카드 (목록)

```
┌──────────────────────────────────┐
│ [GOLD · 9.2]              ★  ⋮  │
│                                  │
│ 아파트 드론 전용 도난 방지 수거함  │
│                                  │
│ 새벽 3시, 드론이 베란다에 조용히  │
│ 착륙합니다. 당신은 잠에서 깨지... │
│                                  │
│ 2026-05-23 15:30                │
└──────────────────────────────────┘
```

- 너비: 그리드 3열 (데스크톱), 2열 (태블릿), 1열 (모바일)
- 카드 클릭 → 아이디어 상세 페이지
- 우상단 ★: 관심 토글
- 우상단 ⋮: 삭제 메뉴 (커스텀 모달로 확인 후 삭제)

### 5-7. 웹 대시보드 — 아이디어 상세

전체 너비: 720px (`--container-narrow`).

```
┌────────────────────────────────────┐
│ ←  목록으로                        │
├────────────────────────────────────┤
│ [GOLD · 9.2/10]              ★    │
│                                    │
│ 아파트 드론 전용 도난 방지 수거함    │
│                                    │
│ ┃ 드론 배달 규제 완화 뉴스 +        │
│ ┃ 택배 도난 클립보드 데이터 융합    │
│                                    │
│ 새벽 3시, 드론이 베란다에...        │
│ (말맛 포장된 3~5줄 설명)            │
│                                    │
│ ─────────────────────────────────  │
│                                    │
│ BUSINESS                           │
│   타겟    : ...                    │
│   문제    : ...                    │
│   해결    : ...                    │
│   수익모델 : ...                   │
│                                    │
│ ─────────────────────────────────  │
│                                    │
│ STEP-BY-STEP PROMPTS               │
│                                    │
│ ┌─────────────────────┐  [복사 📋]│
│ │ 01  시장 검증        │           │
│ │     "...분석해줘"    │           │
│ └─────────────────────┘           │
│                                    │
│ ┌─────────────────────┐  [복사 📋]│
│ │ 02  경쟁사 분석      │           │
│ └─────────────────────┘           │
│ ...                                │
│                                    │
├────────────────────────────────────┤
│              [삭제]  [공유 X]      │  ← 삭제는 모달 확인 후
└────────────────────────────────────┘
```

### 5-8. 데스크톱 앱 — 온보딩 (5단계)

**상단 진행바 (5등분 시안 fill)**

```
[●●●○○]  STEP 03 / 05
         Choose Your Interests
         관심 분야를 선택해주세요 (3~5개)
```

각 단계:
- Step 1: 언어 선택 (드롭다운 + 6개 언어 미리보기)
- Step 2: 환영 + 권한 안내 (체크박스 그리드)
- Step 3: 관심 분야 선택 (체크박스, 3x4 그리드)
- Step 4: 퀄리티 모드 (라디오, 3개 카드)
- Step 5: 완료 + "지금 시작하기" 버튼

하단: "건너뛰기" (텍스트 링크) | "다음 →" (Primary 버튼)

### 5-9. 데스크톱 앱 — 설정 화면

좌측 사이드바 + 우측 컨텐츠 2단 구조.

```
┌──────────┬─────────────────────────┐
│ 일반     │ 수집 카테고리            │
│ 수집 ★   │                        │
│ 분석     │ [ON] YouTube            │
│ 알림     │ [ON] 뉴스               │
│ 관심분야 │ [ON] 클립보드           │
│ 트리거   │ [ON] AI 대화            │
│ 언어     │ [OFF] 로컬 폴더 (Pro)   │
│ 계정     │                        │
│ 정보     │                        │
└──────────┴─────────────────────────┘
```

토글 스위치: 시안(ON) / 회색(OFF).

### 5-10. 언어 선택 드롭다운 (상단 우측)

웹 대시보드 + 데스크톱 앱 설정 모두 동일.

```
🌐  한국어  ▾
    ────────────
    🇰🇷 한국어         ✓
    🇺🇸 English
    🇯🇵 日本語
    🇨🇳 简体中文
    🇹🇼 繁體中文
    🇪🇸 Español
```

---

## 6. 모션 / 애니메이션

### 6-1. 전환 (Transition)

- 모든 hover transition: `0.2~0.3s ease`
- 클릭 시 살짝 위로: `translateY(-2px)`
- 페이지 전환: Framer Motion `AnimatePresence` 사용

### 6-2. 페이지 진입

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 6-3. GOLD 등급 펄스 (트레이 팝업)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.95); }
}
.grade-gold-pulse {
  animation: pulse 2s ease infinite;
}
```

### 6-4. 카드 float (히어로 강조)

```css
@keyframes floatCard {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

### 6-5. 사용 금지

- 과도한 회전, 튀는 bounce 효과
- 0.5초 초과 transition (UX 답답함 유발)
- 의미 없는 깜빡임
- 자동 재생 캐러셀 (글로벌 UX 안 좋음)

---

## 7. 배경 효과

### 7-1. 그리드 (히어로 영역)

```css
background-image:
  linear-gradient(rgba(39,224,161,0.05) 1px, transparent 1px),
  linear-gradient(90deg, rgba(39,224,161,0.05) 1px, transparent 1px);
background-size: 64px 64px;
mask: linear-gradient(to bottom,
  rgba(0,0,0,0.85) 0%,
  rgba(0,0,0,0.55) 25%,
  rgba(0,0,0,0.15) 55%,
  transparent 85%);
```

### 7-2. 파티클 (전체 영역, 선택적)

- Canvas 기반, 약 130개 점
- 80px 이내 거리는 가는 선으로 연결
- 시안 25% : 화이트 75% 비율
- 매우 느린 속도로 떠다님 (성능 고려)

### 7-3. 카드 그라디언트 페이드 (Linear 스타일)

```css
.code-window::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    90deg,
    rgba(10,10,10,0.85) 0%,
    transparent 18%,
    transparent 75%,
    rgba(10,10,10,0.95) 100%
  );
  pointer-events: none;
}
```

---

## 8. 아이콘

### 8-1. 가이드라인

- **단색 아웃라인 스타일** — **Lucide React** 권장
- 두께: 1.5~2px
- 크기: 16px (인라인), 20~24px (강조)
- 컬러: 활성 시 시안, 비활성 시 muted

### 8-2. 로고

- 전구(💡) 아이콘 + "Limina" 텍스트
- 전구는 시안 단색
- "Limina" 전체 흰색
- 아이콘과 텍스트 사이 gap 0~4px (붙여서)
- 다국어 환경에서도 "Limina" 영문 유지 (브랜드명 고정)

---

## 9. 글로벌 UX 고려사항

### 9-1. 텍스트 길이 가변성

언어마다 텍스트 길이가 매우 다름. 레이아웃 짤 때 주의:

| 언어 | 영어 100% 기준 길이 |
|---|---|
| 한국어 | 약 80% (더 짧음) |
| 일본어 | 약 90% |
| 중국어 | 약 60% (가장 짧음) |
| 스페인어 | 약 130% (가장 김) |
| 독일어 (v4) | 약 140% |

**대응 규칙:**
- 버튼은 `min-width` 지정, `padding` 여유 두기
- 카드 제목은 2줄까지 허용 (3줄부터 `...` 처리)
- 네비게이션은 가로 스크롤 회피 — 햄버거 메뉴 대안 준비

### 9-2. RTL (Right-to-Left) 대비

v4에서 아랍어/히브리어 추가 가능성 있음. 미리 대비:

```css
/* Tailwind RTL plugin 활용 */
[dir="rtl"] .ml-4 { margin-right: 1rem; margin-left: 0; }
```

CSS 작성 시 가능하면 `margin-inline-start` / `margin-inline-end` 사용.

### 9-3. 숫자/통화 표기

- 한국: `9,900원`
- 미국: `$7.99`
- 일본: `¥980`
- 유럽: `€6.99` (콤마는 소수점 — `6,99`로 표기되는 국가도 있음)

`Intl.NumberFormat`으로 자동 처리. 하드코딩 금지.

```typescript
new Intl.NumberFormat(locale, { style: 'currency', currency: 'KRW' }).format(9900);
// → "₩9,900"
```

---

## 10. 반응형

### 10-1. 브레이크포인트

- Desktop: 1200px+
- Tablet: 768~1199px
- Mobile: ~767px

### 10-2. 적용 규칙

- 768px 이하: 모든 그리드 1열 스택
- 사이드바 → 햄버거 메뉴
- 섹션 패딩 60px → 40px → 24px
- 헤딩 크기 자동 조정 (clamp 사용)
- 다국어 폰트 자동 변경

---

## 11. 다크 모드 전용

Limina은 **다크 모드 전용**입니다.
라이트 모드 지원 안 함. 모든 컴포넌트는 #0a0a0a 배경 기준으로만 디자인.

라이트 모드 요청은 v3 이후 검토.

---

## 12. 접근성 (Accessibility)

글로벌 출시이므로 WCAG 2.1 AA 수준 준수.

- 텍스트 명도 대비 4.5:1 이상
- 포커스 상태 명확히 표시 (`outline` 또는 `box-shadow`)
- 모든 인터랙티브 요소 키보드 접근 가능
- 이미지에 `alt` 속성 필수
- 폼 요소에 `<label>` 또는 `aria-label`
- 모달 열릴 때 포커스 트랩 적용

---

## 13. 사용 금지 사항

- ❌ 그라디언트 텍스트 (로고 외)
- ❌ 형광 컬러, 네온 효과
- ❌ 노란색/빨간색/보라색 (시스템 상태 외)
- ❌ 둥근 코너 + 단일 보더 조합 (border-left + border-radius 충돌)
- ❌ 폰트 굵기 800, 900 (700까지만 — 한글 일본어 가독성)
- ❌ 12px 미만 폰트 (다국어 글자 깨짐)
- ❌ Unbounded를 한글/일본어/중국어에 적용
- ❌ 시스템 alert/confirm 사용 (반드시 커스텀 모달)
- ❌ 자동 캐러셀 (글로벌 UX 안 좋음)

---

## 14. 디자인 토큰 적용 위치

이 디자인 시스템은 4곳에 동일하게 적용됩니다:

| 위치 | 적용 방법 |
|---|---|
| 데스크톱 앱 (Electron) | `desktop-app/src/renderer/styles/tokens.css` |
| 크롬·Edge 익스텐션 옵션 페이지 | `chrome-extension/popup/popup.css` |
| 웹 대시보드 (Next.js) | `web-dashboard/src/app/globals.css` + Tailwind config |
| 랜딩페이지 (Next.js) | `landing-page/src/app/globals.css` + Tailwind config |

`shared/styles/tokens.css` 파일로 만들어서 모든 곳에서 import 권장.
