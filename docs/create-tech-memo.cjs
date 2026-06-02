const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  LevelFormat
} = require('docx');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const C = {
  bg: '0D1117', surface: '161B22', card: '1E2530',
  accent: '3ECFAC', accentDark: '2BA888',
  gold: 'F0B429', silver: 'A0AEC0', bronze: 'C77B3A',
  text: 'E6EDF3', textMuted: '8B949E',
  white: 'FFFFFF', border: '30363D', red: 'FF6B6B', green: '3ECFAC'
};

const mono  = (t, col) => new TextRun({ text: t, font: 'Consolas', size: 18, color: col || C.accent });
const bold  = (t, sz, col) => new TextRun({ text: t, bold: true, size: sz||22, color: col||C.text, font: 'Malgun Gothic' });
const normal= (t, sz, col) => new TextRun({ text: t, size: sz||20, color: col||C.text, font: 'Malgun Gothic' });
const dim   = (t) => new TextRun({ text: t, size: 18, color: C.textMuted, font: 'Malgun Gothic' });
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const rowBorder = { style: BorderStyle.SINGLE, size: 1, color: C.border };

const gap = (n=1) => Array.from({length:n}, ()=>
  new Paragraph({ children:[new TextRun('')], spacing:{before:0,after:0} })
);

const sectionTitle = (num, title) => new Paragraph({
  spacing: { before: 400, after: 200 },
  border: { left: { style: BorderStyle.SINGLE, size: 20, color: C.accent, space: 8 } },
  indent: { left: 180 },
  children: [
    new TextRun({ text: `${num}. `, size: 28, bold: true, color: C.accent, font: 'Arial' }),
    new TextRun({ text: title, size: 28, bold: true, color: C.white, font: 'Malgun Gothic' }),
  ]
});

const subTitle = (title) => new Paragraph({
  spacing: { before: 240, after: 120 },
  children: [
    new TextRun({ text: '▶ ', size: 22, color: C.accent, font: 'Arial' }),
    new TextRun({ text: title, size: 22, bold: true, color: C.text, font: 'Malgun Gothic' }),
  ]
});

const bullet = (text, col) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { before: 40, after: 40 },
  children: [normal(text, 20, col || C.text)]
});

const codeBlock = (lines) => lines.map(line =>
  new Paragraph({
    shading: { fill: C.surface, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: C.accentDark, space: 6 } },
    indent: { left: 200, right: 200 },
    spacing: { before: 20, after: 20 },
    children: [mono(line, C.accent)]
  })
);

const th = (text, w) => new TableCell({
  width: { size: w||0, type: WidthType.DXA },
  shading: { fill: C.accent, type: ShadingType.CLEAR },
  margins: { top: 100, bottom: 100, left: 160, right: 160 },
  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold: true, size: 18, color: C.bg, font: 'Malgun Gothic' })]
  })]
});

const td = (text, isFirst, isOk, isDanger) => {
  const color = isOk ? C.accent : isDanger ? C.red : isFirst ? C.white : C.text;
  return new TableCell({
    shading: { fill: isFirst ? C.card : C.surface, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    borders: { top: rowBorder, bottom: rowBorder, left: noBorder, right: noBorder },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 18, bold: isFirst, color, font: 'Malgun Gothic' })]
    })]
  });
};

async function main() {
  // SVG → PNG 변환 (80×80)
  const svgPath = path.join(__dirname, '..', 'limina-icon.svg');
  const logoData = await sharp(svgPath).resize(80, 80).png().toBuffer();

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '›', alignment: AlignmentType.LEFT,
          style: { run: { color: C.accent, font: 'Arial', size: 22 },
                   paragraph: { indent: { left: 400, hanging: 280 } } } }]
      }]
    },
    styles: {
      default: { document: { run: { font: 'Malgun Gothic', size: 20, color: C.text } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, color: C.white, font: 'Malgun Gothic' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: {
        default: new Header({ children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({ text: 'LIMINA', bold: true, size: 18, color: C.accent, font: 'Arial' }),
              new TextRun({ text: '  |  기술 메모 Tech Memo v3.0  |  2026년 6월', size: 16, color: C.textMuted, font: 'Malgun Gothic' }),
              new TextRun({ text: '\t', font: 'Arial' }),
              new TextRun({ text: 'limina.app', size: 16, color: C.textMuted, font: 'Arial' }),
            ],
            tabStops: [{ type: 'right', position: 9026 }]
          })
        ]})
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 } },
            spacing: { before: 160, after: 0 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Page ', size: 16, color: C.textMuted, font: 'Arial' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.accent, font: 'Arial' }),
              new TextRun({ text: '  ·  Internal Only  ·  © 2026 Limina', size: 16, color: C.textMuted, font: 'Arial' }),
            ]
          })
        ]})
      },
      children: [

        // ── 커버 ──────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 500, after: 200 },
          children: [new ImageRun({
            type: 'png', data: logoData,
            transformation: { width: 80, height: 80 },
            altText: { title: 'Limina', description: 'Limina Logo', name: 'LiminaLogo' }
          })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: 'LIMINA', bold: true, size: 64, color: C.accent, font: 'Arial' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          children: [bold('기술 메모 (Tech Memo)  v3.0', 28, C.text)]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 300 },
          children: [dim('2026년 6월  |  상세 스펙: CLAUDE.md / agent.md / dev.md / api.md 참조')]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 1 }
          },
          shading: { fill: C.card, type: ShadingType.CLEAR },
          spacing: { before: 100, after: 300 },
          children: [new TextRun({ text: '이 문서는 빠른 참고용 기술 구조 요약입니다. 코딩 작업 전 항상 CLAUDE.md를 먼저 읽으세요.', size: 18, italics: true, color: C.textMuted, font: 'Malgun Gothic' })]
        }),

        // ── 1. 핵심 원칙 ──────────────────────────────────────
        sectionTitle('1', '핵심 원칙'),
        new Paragraph({ spacing:{before:80,after:80}, children:[normal('Limina은 온디바이스 우선 글로벌 SaaS입니다.')] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2600, 6426],
          rows: [
            new TableRow({ children: [th('데이터 종류', 2600), th('처리 방식', 6426)] }),
            new TableRow({ children: [
              td('일상 데이터 (daily_log.txt)', true),
              td('100% 로컬 PC에만 저장 — 절대 서버 전송 없음', false, true),
            ]}),
            new TableRow({ children: [
              td('AI 분석 시 전송', true),
              td('Claude API에 일시 전송 후 즉시 폐기 (Anthropic 정책상 학습 미사용)', false),
            ]}),
            new TableRow({ children: [
              td('아이디어 결과물', true),
              td('Supabase ideas 테이블에 저장 (웹 대시보드용)', false),
            ]}),
            new TableRow({ children: [
              td('계정/구독 정보', true),
              td('Supabase — 결제 검증, 라이선스, 업데이트만', false),
            ]}),
          ]
        }),

        // ── 2. 기술 스택 ──────────────────────────────────────
        sectionTitle('2', '기술 스택 한눈에'),
        subTitle('2-1. 클라이언트 (유저 PC)'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2200, 3200, 3626],
          rows: [
            new TableRow({ children: [th('컴포넌트',2200), th('기술',3200), th('비고',3626)] }),
            new TableRow({ children: [td('데스크톱 앱',true), td('Electron + React + TypeScript + Vite',false), td('Win / Mac / Linux 동시 지원',false)] }),
            new TableRow({ children: [td('UI 스타일',true), td('Tailwind CSS',false), td('design.md 기준',false)] }),
            new TableRow({ children: [td('크롬·Edge 익스텐션',true), td('JavaScript Manifest V3',false), td('동일 코드로 두 브라우저 지원',false)] }),
            new TableRow({ children: [td('앱 다국어',true), td('i18next + react-i18next',false), td('6개 언어 JSON 파일',false)] }),
            new TableRow({ children: [td('OS별 자격증명',true), td('keytar (Win/Mac/Linux 자동 분기)',false), td('Anthropic API 키 암호화 저장',false)] }),
          ]
        }),
        ...gap(1),
        new Paragraph({ spacing:{before:120,after:60}, children:[bold('Electron 선택 이유', 20, C.textMuted)] }),
        bullet('Win/Mac/Linux 크로스 플랫폼 — 처음부터 가능'),
        bullet('JS 하나로 통일 — 초보자 친화, 익스텐션과 언어 일치'),
        bullet('Slack, VSCode, Notion, Linear 모두 Electron 사용 → 검증된 스택'),
        bullet('AI 코딩 도구 학습 데이터 풍부 (Claude Code / Cursor 등)'),

        subTitle('2-2. 클라우드 (최소한만)'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 4026, 3000],
          rows: [
            new TableRow({ children: [th('서비스',2000), th('용도',4026), th('비용',3000)] }),
            new TableRow({ children: [td('Supabase',true), td('계정 / 구독 / 라이선스 / 아이디어 결과물',false), td('Free → $25/월',false)] }),
            new TableRow({ children: [td('Claude API',true), td('AI 분석 (Haiku/Sonnet 자동 분기)',false), td('종량제',false)] }),
            new TableRow({ children: [td('포트원 v2',true), td('한국 결제 (카카오페이/네이버페이/카드)',false), td('거래액 3.3%',false)] }),
            new TableRow({ children: [td('Stripe',true), td('글로벌 결제 (6개 통화)',false), td('거래액 3.4% + $0.30',false)] }),
            new TableRow({ children: [td('Vercel',true), td('웹 대시보드 + 랜딩페이지 배포',false), td('Free → $20/월',false)] }),
            new TableRow({ children: [td('GitHub Releases',true), td('데스크톱 앱 자동 업데이트',false), td('무료',false,true)] }),
          ]
        }),

        subTitle('2-3. 웹 (limina.app)'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 3800, 3226],
          rows: [
            new TableRow({ children: [th('컴포넌트',2000), th('기술',3800), th('비고',3226)] }),
            new TableRow({ children: [td('웹 대시보드',true), td('Next.js (App Router) + TypeScript + Tailwind',false), td('아이디어 목록 / 상세 / 결제',false)] }),
            new TableRow({ children: [td('랜딩페이지',true), td('Next.js + TypeScript + Tailwind',false), td('마케팅 + OS별 다운로드',false)] }),
            new TableRow({ children: [td('다국어',true), td('next-intl',false), td('6개 언어, /[locale]/... 구조',false)] }),
            new TableRow({ children: [td('배포',true), td('Vercel',false), td('자동 CI/CD (GitHub 연동)',false)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 3. 로컬 데이터 ────────────────────────────────────
        sectionTitle('3', '로컬 데이터 구조'),
        subTitle('저장 위치 (OS별 자동 분기)'),
        ...codeBlock([
          'Windows : %APPDATA%/Limina/',
          'Mac     : ~/Library/Application Support/Limina/',
          'Linux   : ~/.config/Limina/',
        ]),
        subTitle('로컬 파일 구조'),
        ...codeBlock([
          'Limina/',
          '├── daily_log.txt   # 수집 데이터 (7일 롤링, 8일째 자동 소각)',
          '└── config.json     # 유저 설정값',
        ]),
        ...gap(1),
        new Paragraph({
          spacing:{before:80,after:80},
          border:{ left:{style:BorderStyle.SINGLE,size:16,color:C.red,space:8} },
          shading:{fill:C.surface,type:ShadingType.CLEAR},
          indent:{left:200,right:200},
          children:[new TextRun({text:'아이디어 결과물은 로컬에 저장하지 않습니다. Supabase ideas 테이블에 저장 → 팝업 클릭 시 웹 대시보드로 이동. 크로스 디바이스 확인 가능.',size:18,color:C.textMuted,font:'Malgun Gothic'})]
        }),

        // ── 4. Supabase DB ────────────────────────────────────
        sectionTitle('4', 'Supabase DB 테이블 (4개)'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [1800, 4226, 3000],
          rows: [
            new TableRow({ children: [th('테이블',1800), th('주요 컬럼',4226), th('용도',3000)] }),
            new TableRow({ children: [td('users',true,true), td('id, email, language, region, created_at',false), td('유저 계정',false)] }),
            new TableRow({ children: [td('subscriptions',true,true), td('user_id, tier, expires_at, payment_provider',false), td('구독 정보',false)] }),
            new TableRow({ children: [td('licenses',true,true), td('key, user_id, expires_at, device_id',false), td('라이선스 키',false)] }),
            new TableRow({ children: [td('ideas',true,true), td('id, user_id, grade, score, title, prompts, starred, deleted, locale',false), td('아이디어 결과물',false)] }),
          ]
        }),
        ...gap(1),
        new Paragraph({
          spacing:{before:80,after:80},
          border:{left:{style:BorderStyle.SINGLE,size:16,color:C.red,space:8}},
          shading:{fill:C.surface,type:ShadingType.CLEAR},
          indent:{left:200,right:200},
          children:[new TextRun({text:'daily_log.txt (수집 원본)는 절대 서버에 저장하지 않습니다. ideas 테이블은 AI가 생성한 결과물만 저장합니다.',size:18,bold:true,color:C.red,font:'Malgun Gothic'})]
        }),

        // ── 5. AI 분석 엔진 ───────────────────────────────────
        sectionTitle('5', 'AI 분석 엔진'),
        subTitle('모델 자동 분기'),
        ...codeBlock([
          "const model = tier === 'pro' || tier === 'yearly'",
          "  ? 'claude-sonnet-4-6'   // Pro 유저 (최신 Sonnet)",
          "  : 'claude-haiku-4-5-20251001'; // Free 유저",
        ]),
        subTitle('API 비용 (분석 1회 = API 1회 호출)'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [3026, 3000, 3000],
          rows: [
            new TableRow({ children: [th('구분',3026), th('Haiku (Free)',3000), th('Sonnet (Pro)',3000)] }),
            new TableRow({ children: [td('1회 분석 비용',true), td('≈ 6원',false), td('≈ 24원',false)] }),
            new TableRow({ children: [td('월 기준',true), td('10회 = 60원/유저',false), td('12회 = 290원/유저',false)] }),
          ]
        }),
        subTitle('비용 0원 작업 vs 비용 발생 작업'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          rows: [
            new TableRow({ children: [th('비용 0원 (로컬 처리)',4513), th('비용 발생 (Claude API 1회 호출)',4513)] }),
            new TableRow({ children: [td('크롬·Edge 익스텐션 텍스트 수집',false,true), td('2단계 게이트키퍼 AI 채점 (1~10점)',false,false,true)] }),
            new TableRow({ children: [td('클립보드 / 오피스 파일 수집',false,true), td('아이디어 제목 + 설명 + 사업계획 뼈대 생성',false,false,true)] }),
            new TableRow({ children: [td('daily_log.txt 저장 및 관리',false,true), td('단계별 프롬프트 5개 생성',false,false,true)] }),
            new TableRow({ children: [td('7일 롤링 데이터 자동 소각',false,true), td('REPORT 등급 관심사 키워드 요약',false,false,true)] }),
            new TableRow({ children: [td('Idle 감지 (CPU + 무입력)',false,true), td('→ 이 4가지가 API 1번 호출에 묶임',false)] }),
            new TableRow({ children: [td('트레이 팝업 알림 표시',false,true), td('유저가 뷰어 100번 열어도 추가 비용 없음',false,false)] }),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 6. 익스텐션 연결 ──────────────────────────────────
        sectionTitle('6', '익스텐션 ↔ 데스크톱 앱 연결'),
        ...codeBlock([
          '크롬·Edge 익스텐션',
          '  │  HTTP POST',
          '  ▼',
          'localhost:7421  (데스크톱 앱 내부 HTTP 서버)',
          '  │  X-Limina-Token 헤더 검증',
          '  ▼',
          'daily_log.txt에 저장',
        ]),
        ...gap(1),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 7026],
          rows: [
            new TableRow({ children: [th('항목',2000), th('상세',7026)] }),
            new TableRow({ children: [td('포트',true), td('7421 (고정, 충돌 시 7422 → 7423 자동 시도)',false)] }),
            new TableRow({ children: [td('인증 토큰',true), td('첫 실행 시 32자 랜덤 생성 → config.json 저장 → 익스텐션 옵션에서 입력',false)] }),
            new TableRow({ children: [td('외부 차단',true), td('127.0.0.1만 바인딩 — 외부 IP 접근 불가',false,true)] }),
            new TableRow({ children: [td('CORS',true), td('chrome-extension:// 도메인만 허용',false)] }),
          ]
        }),

        // ── 7. 수집 원칙 ──────────────────────────────────────
        sectionTitle('7', '수집 원칙'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          rows: [
            new TableRow({ children: [th('수집 OK ✅',4513), th('수집 금지 🚫',4513)] }),
            new TableRow({ children: [td('유튜브 제목 + 상위 댓글',false,true), td('이미지, 영상, 화면 캡처',false,false,true)] }),
            new TableRow({ children: [td('뉴스, 블로그, 웹툰',false,true), td('결제 / 금융 / 비밀번호 입력창',false,false,true)] }),
            new TableRow({ children: [td('AI 대화 (Claude/ChatGPT/Gemini)',false,true), td('메신저 메시지 자동 수집 (법적 금지)',false,false,true)] }),
            new TableRow({ children: [td('지메일 제목 + 미리보기',false,true), td('개인식별정보 — 마스킹 후 저장',false,false)] }),
            new TableRow({ children: [td('구글/네이버/Bing 검색어',false,true), td('—',false)] }),
            new TableRow({ children: [td('클립보드 복사 텍스트 (20자+)',false,true), td('—',false)] }),
            new TableRow({ children: [td('오피스 파일 텍스트 (Word/Excel/PPT)',false,true), td('—',false)] }),
            new TableRow({ children: [td('로컬 폴더 .txt/.md (옵트인)',false,true), td('—',false)] }),
          ]
        }),
        ...gap(1),
        new Paragraph({
          spacing:{before:80,after:80},
          border:{left:{style:BorderStyle.SINGLE,size:16,color:C.accent,space:8}},
          shading:{fill:C.surface,type:ShadingType.CLEAR},
          indent:{left:200,right:200},
          children:[new TextRun({text:'메신저 처리: 카카오톡/LINE/Discord 등 자동 수집 불가 (법적 리스크). 유저가 직접 Ctrl+C로 복사하면 클립보드 모듈이 감지해서 저장합니다.',size:18,color:C.textMuted,font:'Malgun Gothic'})]
        }),

        // ── 8. 결제 분기 ──────────────────────────────────────
        sectionTitle('8', '결제 분기'),
        ...codeBlock([
          "// 한국 유저 → 포트원 v2",
          "// 그 외 → Stripe",
          "function selectPaymentProvider(locale: string): 'portone' | 'stripe' {",
          "  if (locale === 'ko' || detectRegion() === 'KR') return 'portone';",
          "  return 'stripe';",
          "}",
        ]),
        subTitle('글로벌 가격 정책'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [1000, 1504, 1504, 1504, 1504, 1505, 1505],
          rows: [
            new TableRow({ children: [th('',1000), th('한국',1504), th('미국',1504), th('일본',1504), th('중국',1504), th('유럽',1505), th('기타',1505)] }),
            new TableRow({ children: [td('월',true), td('9,900원',false), td('$7.99',false), td('¥980',false), td('¥45',false), td('€6.99',false), td('$5.99',false)] }),
            new TableRow({ children: [td('연',true), td('69,000원',false,true), td('$59.99',false,true), td('¥6,800',false,true), td('¥320',false,true), td('€49.99',false,true), td('$39.99',false,true)] }),
          ]
        }),

        // ── 9. 업데이트 ───────────────────────────────────────
        sectionTitle('9', '업데이트 배포'),
        bullet('새 버전 빌드 → GitHub Release에 업로드'),
        bullet('앱이 자동 감지 → 트레이 알림 → 백그라운드 다운로드'),
        bullet('다음 재시작 시 자동 적용'),
        subTitle('빌드 명령'),
        ...codeBlock([
          'npm run build:win    # Windows (.exe, NSIS 설치 파일)',
          'npm run build:mac    # Mac (.dmg, Intel + Apple Silicon 동시)',
          'npm run build:linux  # Linux (.AppImage + .deb)',
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 10. i18n ──────────────────────────────────────────
        sectionTitle('10', '6개 언어 지원 (i18n)'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2400, 1200, 5426],
          rows: [
            new TableRow({ children: [th('언어',2400), th('코드',1200), th('비고',5426)] }),
            new TableRow({ children: [td('한국어',true), td('ko',false,true), td('본진 — 포트원 결제, 카카오 로그인',false)] }),
            new TableRow({ children: [td('English',true), td('en',false,true), td('글로벌 기본값 (OS 언어 미지원 시)',false)] }),
            new TableRow({ children: [td('日本語',true), td('ja',false,true), td('한국과 유사한 직장인 문화, 구독 시장 큼',false)] }),
            new TableRow({ children: [td('简体中文',true), td('zh-CN',false,true), td('중국 본토',false)] }),
            new TableRow({ children: [td('繁體中文',true), td('zh-TW',false,true), td('대만 / 홍콩 (간체와 반드시 분리)',false)] }),
            new TableRow({ children: [td('Español',true), td('es',false,true), td('스페인 + 중남미 5억 명',false)] }),
          ]
        }),
        ...gap(1),
        bullet('OS 언어 자동 감지 → 기본값 설정'),
        bullet('온보딩 첫 화면(Step 1)에서 변경 가능'),
        bullet('상단 드롭다운으로 언제든 즉시 변경'),
        bullet('Claude API 프롬프트에 language 파라미터 → 아이디어 출력 언어 분기'),
        bullet('모든 UI 텍스트는 하드코딩 금지 — 반드시 i18n 번역 키 사용', C.red),

        // ── 11. 손익 요약 ─────────────────────────────────────
        sectionTitle('11', '손익 요약'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [5026, 4000],
          rows: [
            new TableRow({ children: [th('항목',5026), th('금액',4000)] }),
            new TableRow({ children: [td('Pro 1,000명 월 총 수익',true), td('≈ 9,490,000원',false)] }),
            new TableRow({ children: [td('월 총 비용 (API + 인프라 + 수수료)',true), td('≈ 680,000원',false,false,true)] }),
            new TableRow({ children: [
              new TableCell({ shading:{fill:C.accent,type:ShadingType.CLEAR}, margins:{top:100,bottom:100,left:160,right:160}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},
                children:[new Paragraph({children:[new TextRun({text:'순이익 (마진 93%)',bold:true,size:20,color:C.bg,font:'Malgun Gothic'})]})] }),
              new TableCell({ shading:{fill:C.accent,type:ShadingType.CLEAR}, margins:{top:100,bottom:100,left:160,right:160}, borders:{top:noBorder,bottom:noBorder,left:noBorder,right:noBorder},
                children:[new Paragraph({children:[new TextRun({text:'≈ 8,810,000원/월',bold:true,size:20,color:C.bg,font:'Malgun Gothic'})]})] }),
            ]}),
            new TableRow({ children: [td('얼리버드 목표 (300명 × 69,000원)',true), td('= 20,700,000원 초기 자금',false,true)] }),
            new TableRow({ children: [td('얼리버드 1년 운영 후 잔여',true), td('≈ 14,000,000원 (v2 개발 자금)',false)] }),
          ]
        }),

        // ── 12. 변경 이력 ─────────────────────────────────────
        sectionTitle('12', '주요 변경 이력'),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [1800, 7226],
          rows: [
            new TableRow({ children: [th('날짜',1800), th('변경 내용',7226)] }),
            new TableRow({ children: [td('2026-05-23',true), td('초기 기획 (Python + PyInstaller + 한국 전용)',false)] }),
            new TableRow({ children: [td('2026-05-24',true), td('Python → Electron 전환 (Win/Mac/Linux 크로스 플랫폼)',false)] }),
            new TableRow({ children: [td('2026-05-24',true), td('글로벌 출시 결정 — 6개 언어 + Stripe 결제 추가',false)] }),
            new TableRow({ children: [td('2026-05-24',true), td('로컬 PyQt 뷰어 제거 → 웹 대시보드 (Next.js)로 통합',false)] }),
            new TableRow({ children: [td('2026-05-24',true), td('대시보드 심플화 — 목록 / ★ / 삭제만 (게시판·협업 제외)',false)] }),
            new TableRow({ children: [td('2026-05-24',true), td('카카오톡 자동 수집 제거 → 클립보드 복사만 (법적 안전)',false)] }),
            new TableRow({ children: [td('2026-05-24',true), td('Supabase ideas 테이블 추가 (아이디어 결과물 저장)',false)] }),
            new TableRow({ children: [td('2026-05-25',true), td('얼리버드 전략 + 페이월 전략 (GOLD 잠금) 정리',false)] }),
            new TableRow({ children: [td('2026-06-02',true,true), td('IdeaTok → Limina 브랜드 리네임, 전 플랫폼 적용',false,true)] }),
            new TableRow({ children: [td('2026-06-02',true,true), td('Tech Memo v3.0 발행 — 로고 통합, 모델 ID 최신화',false,true)] }),
          ]
        }),

        ...gap(2),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:{before:200,after:100},
          border:{top:{style:BorderStyle.SINGLE,size:4,color:C.border,space:1}},
          children:[new TextRun({text:'상세 스펙 참조 순서: CLAUDE.md → agent.md → dev.md → api.md',size:18,color:C.textMuted,font:'Malgun Gothic'})]
        }),
      ]
    }]
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync('C:/dev/Limina/docs/Limina-기술메모-v3.0.docx', buf);
  console.log('완료! → docs/Limina-기술메모-v3.0.docx');
}

main().catch(e => console.error('오류:', e.message));
