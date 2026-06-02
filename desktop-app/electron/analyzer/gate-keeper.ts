import { app, Notification as ElectronNotification } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { maskPII } from './masking';
import { uploadIdeaToSupabase, type IdeaUploadPayload } from '../sync/idea-upload';

// ─────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────
type Grade = 'GOLD' | 'SILVER' | 'BRONZE' | 'BURN' | 'EMPTY' | 'REPORT';
type Tier = 'free' | 'pro' | 'yearly';
type QualityMode = 'strict' | 'balance' | 'sensitive';

interface BusinessPlan {
  target: string;
  problem: string;
  solution: string;
  revenue_model: string;
}

interface StepPrompt {
  step: number;
  title: string;
  content: string;
}

interface ScoreItem {
  score: number;
  reason: string;
}

interface ScoreBreakdown {
  feasibility?: ScoreItem;
  market_size?: ScoreItem;
  revenue_clarity?: ScoreItem;
  differentiation?: ScoreItem;
  user_fit?: ScoreItem;
}

interface RealityCheck {
  initial_cost?: string;
  monthly_cost?: string;
  breakeven_point?: string;
  difficulty?: string;
  first_action?: string;
}

interface AnalysisResult {
  grade: Grade;
  score: number;
  title?: string;
  context?: string;
  idea?: string;
  business?: BusinessPlan;
  prompts?: StepPrompt[];
  summary?: string;
  keywords?: string[];
  score_breakdown?: ScoreBreakdown;
  reality_check?: RealityCheck;
}

interface AppConfig {
  apiToken: string;
  anthropicApiKey?: string;
  supabaseAccessToken?: string;
  supabaseUserId?: string;
  user: {
    language: string;
    interests?: string[];
    qualityMode?: QualityMode;
    tier?: Tier;
    isNewUser?: boolean;
    lastPopupAt?: string;
    budget?: string;
    investTime?: string;
    businessType?: string;
    onlinePreference?: string;
    revenueGoal?: string;
  };
}

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const QUALITY_THRESHOLDS: Record<QualityMode, number> = {
  strict: 9.0,
  balance: 8.0,    // 유저 요구사항: 8점 이상 알림
  sensitive: 6.0,
};

const STEP_TITLES: Record<string, string> = {
  '1': '시장 검증',
  '2': '경쟁사 분석',
  '3': '수익 모델',
  '4': 'MVP 설계',
  '5': '마케팅 전략',
};

// ─────────────────────────────────────────────────────────
// 설정 읽기
// ─────────────────────────────────────────────────────────
function getDefaultConfig(): AppConfig {
  return {
    apiToken: '',
    user: {
      language: 'en',
      interests: [],
      qualityMode: 'balance',
      tier: 'free',
      isNewUser: true,
    },
  };
}

function readConfig(): AppConfig {
  const defaults = getDefaultConfig();
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (!fs.existsSync(configPath)) return defaults;
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...defaults,
      ...parsed,
      user: { ...defaults.user, ...(parsed.user ?? {}) },
    };
  } catch {
    return defaults;
  }
}

function updateLastPopupTime(): void {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readConfig();
    config.user.lastPopupAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // 비핵심 동작, 무시
  }
}

// ─────────────────────────────────────────────────────────
// 1단계 게이트 — 데이터 밀도 검사 (로컬, AI 호출 없음)
// ─────────────────────────────────────────────────────────
function checkDataDensity(logContent: string): boolean {
  const lines = logContent.split('\n').filter(l => l.trim().length > 20);

  // 최소 5줄의 의미있는 수집 데이터 필요
  if (lines.length < 5) return false;

  // 최근 48시간 내 수집 데이터 1건 이상 필요
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
  const hasRecentEntry = lines.some(line => {
    const m = line.match(/^\[([\d-]+\s[\d:]+[+\-\d:]+)/);
    if (!m) return false;
    const ts = new Date(m[1].replace(' ', 'T'));
    return !isNaN(ts.getTime()) && ts.getTime() > twoDaysAgo;
  });

  return hasRecentEntry;
}

// ─────────────────────────────────────────────────────────
// 모델 선택 — api.md 4-2 기준
// ─────────────────────────────────────────────────────────
function selectModel(tier: Tier): string {
  if (tier === 'pro' || tier === 'yearly') return 'claude-sonnet-4-6';
  return 'claude-haiku-4-5-20251001';
}

// ─────────────────────────────────────────────────────────
// 프롬프트 빌더 — claude-prompt.md 템플릿 기반
// ─────────────────────────────────────────────────────────
function buildPrompt(maskedLog: string, config: AppConfig): string {
  const { user } = config;
  const interests = (user.interests ?? []).join(', ') || 'startup, tech';
  const language = user.language ?? 'ko';
  const isNewUser = user.isNewUser ?? false;
  const daysSinceLastPopup = user.lastPopupAt
    ? Math.floor((Date.now() - new Date(user.lastPopupAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // 최신 데이터 우선 — 로그가 길면 뒤쪽(최신) 8000자만 전달
  const logSlice = maskedLog.length > 8000
    ? '...[earlier entries truncated]\n' + maskedLog.slice(-7800)
    : maskedLog;

  const businessConditions = {
    budget: user.budget ?? '',
    time: user.investTime ?? '',
    type: user.businessType ?? '',
    online: user.onlinePreference ?? '',
    goal: user.revenueGoal ?? '',
  };

  return `당신은 Limina의 핵심 AI 분석 엔진입니다. 유저의 PC 사용 중 수집된 일상 데이터 로그(daily_log.txt)를 분석하여 유저가 "오, 이거 나쁘지 않은데!" 라고 감탄할 만한 고품질 창업 아이디어를 도출하는 것이 목적입니다.

USER CONTEXT:
${JSON.stringify({
    interest_categories: interests.split(', '),
    quality_mode: user.qualityMode ?? 'balance',
    language,
    days_since_last_popup: daysSinceLastPopup,
    trigger_keyword_matched: null,
    is_new_user: isNewUser,
    business_conditions: businessConditions,
  }, null, 2)}

DAILY LOG (PII masked, last 7 days):
\`\`\`
${logSlice}
\`\`\`

INSTRUCTIONS & ABSOLUTE RULES:
1. 억지 아이디어 금지: 데이터가 부족하거나 비즈니스 가치가 없으면 절대 아이디어를 만들지 마세요.
   - 데이터 부족 시 -> [GRADE: EMPTY]
   - 점수 1~3점 시 -> [GRADE: BURN]
2. 일반인 실현 가능성 필터 적용 (최고 중요):
   - "코딩을 모르는 평범한 직장인 1명이, 500만원 이하 초기 자본으로, 3개월 안에 첫 번째 고객을 만들 수 있는가?" 통과하지 못하면 무조건 BURN 처리하세요.
   - 드론 제조, 로봇 개발, 하드웨어 양산, 인허가 필수 사업 등은 실현가능성 0점 및 BURN 처리됩니다.
3. 채점 루브릭 (10점 만점): 아래 5개 기준으로만 합산하세요.
   - 실현 가능성 (3점): 3=당장 시작/노코드/100만 이하, 2=3개월 내/독학/500만 이하, 1=6개월~1년/팀/500~2000만, 0=일반인 불가/인허가/1억 이상(BURN)
   - 시장 규모 (2점): 2=TAM 1조원 이상/고성장, 1=1000억~1조원/니치, 0=너무 작음
   - 수익 명확성 (2점): 2=명확한 모델(구독, 커미션 등)+구체금액, 1=수익 모델 존재하나 검증 필요, 0=불명확
   - 차별점 (2점): 2=기존 대비 10배 개선/신규 카테고리, 1=점진적 개선/의미있는 기능, 0=차이 없음
   - 유저 적합성 (1점): 1=유저 관심사와 일치, 0.5=인접 카테고리, 0=무관
4. 사업화 조건(business_conditions) 반영 가중치:
   - budget: "100만원이하" 등 조건에 부합하지 않는 초기비용 필요 시 감점.
   - time/type/online/goal 설정 방향에 맞춰 채점 및 아이디어를 유도하세요.
5. 말맛 원칙 (Storytelling Rules):
   - 제목은 혜택형("퇴근 후 1시간으로 月 50만원 버는 구조"), 장면형("엄마가 새벽에 혼자 병원 가는 문제를 해결했어요"), 질문형 중 하나를 따르며, 기술 문서 느낌("XXX 플랫폼")은 절대 금지합니다.
   - IDEA 첫 문장은 장면 묘사로 시작하며 유저를 "당신"으로 칭해 주인공으로 만드세요. 구체적 숫자를 활용하세요. 딱딱한 종결어(~합니다) 대신 "~해요/~네요/~까요"를 사용하세요.
6. 단계별 프롬프트 작성 규칙:
   - 복사해서 외부 AI에 그대로 붙여넣을 수 있는 완성형 문장 5개로 구성하세요.
   - 기술 용어, 비즈니스 약어(CAPEX, GTM, TAM 등), 개발 용어(서버리스, 아키텍처 등)는 절대 금지합니다.
   - 4단계 MVP는 "컴퓨터 없이도 할 수 있는 가장 작은 실험"으로 작성하세요.
7. 모든 출력 텍스트는 반드시 유저 언어("${language}")로만 작성되어야 합니다.

OUTPUT FORMAT (Strictly match regex parsers, no markdown blocks outside the structure):

For GOLD/SILVER/BRONZE:
[GRADE: GOLD|SILVER|BRONZE]
[SCORE: X.X/10]
[SCORE_BREAKDOWN]
- 실현가능성: X/3 | 근거: (한 줄)
- 시장규모: X/2 | 근거: (한 줄)
- 수익명확성: X/2 | 근거: (한 줄)
- 차별점: X/2 | 근거: (한 줄)
- 유저적합성: X/1 | 근거: (한 줄)
[TITLE] 아이디어 제목
[CONTEXT] 데이터 융합 맥락 1~2줄
[IDEA] 설명 3~5줄 (장면 묘사로 시작, 친근한 종결어)
[BUSINESS]
- 타겟: 누구를 위한 것인가 (구체적 숫자 포함)
- 핵심 문제: 어떤 문제를 해결하는가 (구체적 사례)
- 해결 방식: 어떻게 해결하는가 (첫 단계 구체적 제시)
- 수익 모델: 어떻게 돈을 버는가 (금액+구조)
[REALITY_CHECK]
- 초기 비용: ~XXX만원 (주요 항목 명시)
- 월 운영비: ~XXX만원
- 손익분기점: 고객 약 XX명 (월 수익 XX만원)
- 난이도: ★★★☆☆ (이유 한 줄)
- 지금 당장 할 수 있는 첫 번째 행동: 구체적 행동 1개
[PROMPTS]
1. (시장 검증 프롬프트)
2. (경쟁사 분석 프롬프트)
3. (수익 모델 프롬프트)
4. (MVP 설계 프롬프트 - 컴퓨터 없이 가능한 작은 실험)
5. (마케팅 전략 프롬프트)

For REPORT (days_since_last_popup >= 5 이고 분석 점수가 낮을 때):
[GRADE: REPORT]
[SUMMARY] 요약 텍스트
[KEYWORDS] #키워드1, #키워드2, #키워드3, #키워드4, #키워드5
[TREND] 트렌드 요약 1~2줄

For BURN:
[GRADE: BURN]
[REASON] 소각 사유 한 줄 (영문/한글 가능)

For EMPTY:
[GRADE: EMPTY]`;
}

// ─────────────────────────────────────────────────────────
// 2단계 게이트 — Claude API 호출
// AbortSignal로 언제든지 중단 가능
// ─────────────────────────────────────────────────────────
async function callClaudeApi(
  prompt: string,
  model: string,
  apiKey: string,
  signal: AbortSignal
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };
  const textBlock = data.content.find(c => c.type === 'text');
  if (!textBlock) throw new Error('No text block in Claude API response');
  return textBlock.text;
}

// ─────────────────────────────────────────────────────────
// 응답 파싱 — claude-prompt.md 7장 출력 포맷 기준
// ─────────────────────────────────────────────────────────
function extractBetween(text: string, start: string, ends: string[]): string {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return '';
  const after = text.slice(startIdx + start.length);
  let endIdx = after.length;
  for (const end of ends) {
    const idx = after.indexOf(end);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  return after.slice(0, endIdx).trim();
}

function parseApiResponse(text: string): AnalysisResult {
  const gradeMatch = text.match(/\[GRADE:\s*(\w+)\]/);
  const grade = (gradeMatch?.[1] ?? 'EMPTY') as Grade;

  if (grade === 'EMPTY') return { grade: 'EMPTY', score: 0 };
  if (grade === 'BURN') return { grade: 'BURN', score: 0 };

  if (grade === 'REPORT') {
    const summary = extractBetween(text, '[SUMMARY]', ['[KEYWORDS]', '[TREND]', '[GRADE:']);
    const kwRaw = extractBetween(text, '[KEYWORDS]', ['[TREND]', '[GRADE:']);
    const keywords = kwRaw.split(/,\s*/).map(k => k.trim()).filter(Boolean);
    return { grade: 'REPORT', score: 0, summary, keywords };
  }

  const scoreMatch = text.match(/\[SCORE:\s*([\d.]+)/);
  const score = parseFloat(scoreMatch?.[1] ?? '0');

  const title = extractBetween(text, '[TITLE]', ['[CONTEXT]', '[IDEA]', '[BUSINESS]', '[SCORE_BREAKDOWN]', '[REALITY_CHECK]', '[PROMPTS]', '[GRADE:']);
  const context = extractBetween(text, '[CONTEXT]', ['[IDEA]', '[BUSINESS]', '[SCORE_BREAKDOWN]', '[REALITY_CHECK]', '[PROMPTS]', '[GRADE:']);
  const idea = extractBetween(text, '[IDEA]', ['[BUSINESS]', '[SCORE_BREAKDOWN]', '[REALITY_CHECK]', '[PROMPTS]', '[GRADE:']);

  // Score Breakdown 파싱
  const scoreBreakdownRaw = extractBetween(text, '[SCORE_BREAKDOWN]', ['[TITLE]', '[CONTEXT]', '[IDEA]', '[BUSINESS]', '[REALITY_CHECK]', '[PROMPTS]', '[GRADE:']);
  const scoreBreakdown: ScoreBreakdown = {};
  if (scoreBreakdownRaw) {
    const lines = scoreBreakdownRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const sbLines = lines.filter(l => /^[-*]/.test(l));
    const keys: (keyof ScoreBreakdown)[] = ['feasibility', 'market_size', 'revenue_clarity', 'differentiation', 'user_fit'];
    sbLines.forEach((line, idx) => {
      if (idx >= keys.length) return;
      const match = line.match(/^[-*]\s*([^:]+):\s*([\d.]+)\s*\/\s*\d+(?:\s*\|\s*(?:근거|Reason|根拠|依据|依据|Motivo)?:?\s*(.+))?/i);
      if (match) {
        const itemScore = parseFloat(match[2]);
        const reason = match[3] ? match[3].trim() : '';
        scoreBreakdown[keys[idx]] = { score: itemScore, reason };
      }
    });
  }

  // Business 섹션 파싱
  const businessRaw = extractBetween(text, '[BUSINESS]', ['[SCORE_BREAKDOWN]', '[REALITY_CHECK]', '[PROMPTS]', '[GRADE:']);
  const businessLines = businessRaw.split('\n');
  const biz: Partial<BusinessPlan> = {};
  for (const line of businessLines) {
    const t = line.trim().replace(/^[-*]\s*/, '');
    if (/^(타겟|Target):/i.test(t)) biz.target = t.replace(/^[^:]+:\s*/, '');
    else if (/^(핵심\s*문제|Problem):/i.test(t)) biz.problem = t.replace(/^[^:]+:\s*/, '');
    else if (/^(해결\s*방식|Solution):/i.test(t)) biz.solution = t.replace(/^[^:]+:\s*/, '');
    else if (/^(수익\s*모델|Revenue):/i.test(t)) biz.revenue_model = t.replace(/^[^:]+:\s*/, '');
  }
  const business: BusinessPlan = {
    target: biz.target ?? '',
    problem: biz.problem ?? '',
    solution: biz.solution ?? '',
    revenue_model: biz.revenue_model ?? '',
  };

  // Reality Check 파싱
  const realityCheckRaw = extractBetween(text, '[REALITY_CHECK]', ['[PROMPTS]', '[GRADE:']);
  const realityCheck: RealityCheck = {};
  if (realityCheckRaw) {
    const lines = realityCheckRaw.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cleanLine = line.replace(/^[-*]\s*/, '').trim();
      if (/(초기\s*비용|initial\s*cost|costo\s*inicial|初期費用|初期成本|cost)/i.test(cleanLine)) {
        realityCheck.initial_cost = cleanLine.replace(/^[^:]+:\s*/, '').trim();
      } else if (/(월\s*운영비|monthly\s*cost|costo\s*mensual|月間運営費|月度运营成本|operating)/i.test(cleanLine)) {
        realityCheck.monthly_cost = cleanLine.replace(/^[^:]+:\s*/, '').trim();
      } else if (/(손익분기점|breakeven|break-even|punto\s*de\s*equilibrio|損益分岐点|盈亏平衡点)/i.test(cleanLine)) {
        realityCheck.breakeven_point = cleanLine.replace(/^[^:]+:\s*/, '').trim();
      } else if (/(난이도|difficulty|dificultad|難易度|难度)/i.test(cleanLine)) {
        realityCheck.difficulty = cleanLine.replace(/^[^:]+:\s*/, '').trim();
      } else if (/(첫\s*번째\s*행동|행동|first\s*action|primer\s*paso|今すぐできる|第一步|action)/i.test(cleanLine)) {
        realityCheck.first_action = cleanLine.replace(/^[^:]+:\s*/, '').trim();
      }
    }
  }

  // Prompts 섹션 파싱
  const promptsRaw = extractBetween(text, '[PROMPTS]', ['[GRADE:', '[SUMMARY]']);
  const prompts: StepPrompt[] = [];
  for (const line of promptsRaw.split('\n')) {
    const m = line.trim().match(/^(\d+)\.\s+(.+)/);
    if (!m) continue;
    const step = parseInt(m[1], 10);
    if (step < 1 || step > 5) continue;
    prompts.push({
      step,
      title: STEP_TITLES[m[1]] ?? `Step ${step}`,
      content: m[2].trim().replace(/^[""]|[""]$/g, '').replace(/^"|"$/g, ''),
    });
  }

  return {
    grade,
    score,
    title: title || undefined,
    context: context || undefined,
    idea: idea || undefined,
    business,
    score_breakdown: Object.keys(scoreBreakdown).length > 0 ? scoreBreakdown : undefined,
    reality_check: Object.keys(realityCheck).length > 0 ? realityCheck : undefined,
    prompts: prompts.length > 0 ? prompts : undefined,
  };
}

// ─────────────────────────────────────────────────────────
// 알림 표시 — agent.md 7장 팝업 메시지 기준
// ─────────────────────────────────────────────────────────
function getNotificationTitle(grade: Grade, locale: string): string {
  const map: Partial<Record<string, Partial<Record<Grade, string>>>> = {
    ko: { GOLD: '💡 특급 아이디어 포착', SILVER: '아이디어 도착', BRONZE: '가벼운 영감', REPORT: '최근 관심사 요약' },
    en: { GOLD: '💡 Premium Idea Detected', SILVER: 'New Idea Arrived', BRONZE: 'Light Inspiration', REPORT: 'Weekly Interest Summary' },
    ja: { GOLD: '💡 特級アイデア発見', SILVER: 'アイデア到着', BRONZE: '軽いインスピレーション', REPORT: '関心事まとめ' },
    'zh-CN': { GOLD: '💡 顶级创业想法', SILVER: '新想法到达', BRONZE: '轻量灵感', REPORT: '关注点摘要' },
    'zh-TW': { GOLD: '💡 頂級創業想法', SILVER: '新想法到達', BRONZE: '輕量靈感', REPORT: '關注點摘要' },
    es: { GOLD: '💡 Idea Premium Detectada', SILVER: 'Nueva Idea Llegó', BRONZE: 'Inspiración Ligera', REPORT: 'Resumen Semanal' },
  };
  return map[locale]?.[grade] ?? map['en']?.[grade] ?? '';
}

function showNotification(result: AnalysisResult, locale: string): void {
  if (!ElectronNotification.isSupported()) return;

  const title = getNotificationTitle(result.grade, locale);
  if (!title) return;

  const body = result.title ?? result.summary ?? '';
  const n = new ElectronNotification({ title, body });
  n.show();
  console.log(`[Limina GateKeeper] Notification shown: [${result.grade}] ${body.slice(0, 50)}`);
}

// ─────────────────────────────────────────────────────────
// runGateKeeper — idle-monitor의 onSystemIdle 콜백에서 호출
// ─────────────────────────────────────────────────────────
export async function runGateKeeper(
  logFilePath: string,
  signal: AbortSignal
): Promise<AnalysisResult | null> {
  if (signal.aborted) return null;

  console.log('[Limina GateKeeper] Analysis pipeline started.');

  // ── 설정 로드 ──────────────────────────────────────────
  const config = readConfig();

  // Anthropic API 키 확인 (.env VITE_ANTHROPIC_API_KEY 또는 config.json)
  const envVars = import.meta.env as Record<string, string | undefined>;
  const apiKey = config.anthropicApiKey ?? envVars.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[Limina GateKeeper] No Anthropic API key found. Set VITE_ANTHROPIC_API_KEY in .env or anthropicApiKey in config.json.');
    return null;
  }

  // ── 로그 파일 읽기 ─────────────────────────────────────
  let logContent: string;
  try {
    logContent = fs.readFileSync(logFilePath, 'utf-8');
  } catch {
    console.log('[Limina GateKeeper] Could not read daily_log.txt.');
    return null;
  }

  if (signal.aborted) return null;

  // ── 1단계: 데이터 밀도 검사 (로컬, AI 없음) ────────────
  if (!checkDataDensity(logContent)) {
    console.log('[Limina GateKeeper] Stage 1 FAILED: Insufficient data density. Skipping.');
    return null;
  }
  console.log('[Limina GateKeeper] Stage 1 PASSED: Data density OK.');

  if (signal.aborted) return null;

  // ── PII 마스킹 (Claude 전송 전 필수) ──────────────────
  const maskedLog = maskPII(logContent);

  // ── 모델 + 프롬프트 준비 ───────────────────────────────
  const model = selectModel(config.user.tier ?? 'free');
  const prompt = buildPrompt(maskedLog, config);

  // ── 2단계: Claude API 호출 ──────────────────────────────
  let responseText: string;
  try {
    console.log(`[Limina GateKeeper] Stage 2: Calling Claude API (model: ${model})...`);
    responseText = await callClaudeApi(prompt, model, apiKey, signal);
  } catch (err) {
    if (signal.aborted) {
      console.log('[Limina GateKeeper] API call aborted by user activity.');
    } else {
      console.error('[Limina GateKeeper] Claude API error:', (err as Error).message);
    }
    return null;
  }

  if (signal.aborted) return null;

  // ── 응답 파싱 ──────────────────────────────────────────
  const result = parseApiResponse(responseText);
  console.log(`[Limina GateKeeper] Parsed result — Grade: ${result.grade}, Score: ${result.score}`);

  // ── BURN / EMPTY → 조용히 소각 ────────────────────────
  if (result.grade === 'BURN' || result.grade === 'EMPTY') {
    console.log('[Limina GateKeeper] Result discarded (BURN/EMPTY).');
    return null;
  }

  // ── 점수 임계치 검사 (REPORT는 항상 통과) ────────────
  const threshold = QUALITY_THRESHOLDS[config.user.qualityMode ?? 'balance'];
  if (result.grade !== 'REPORT' && result.score < threshold) {
    console.log(`[Limina GateKeeper] Score ${result.score} < threshold ${threshold}. Silent discard.`);
    return null;
  }

  // ── 알림 표시 ──────────────────────────────────────────
  const locale = config.user.language ?? 'en';
  showNotification(result, locale);

  // ── Supabase 업로드 (인증 정보 있을 때만) ─────────────
  if (config.supabaseAccessToken && config.supabaseUserId && result.title) {
    const uploadPayload: IdeaUploadPayload = {
      grade: result.grade,
      score: result.score,
      title: result.title,
      context: result.context,
      idea: result.idea,
      business: result.business as Record<string, string> | undefined,
      prompts: result.prompts,
      locale,
      userId: config.supabaseUserId,
      accessToken: config.supabaseAccessToken,
      score_breakdown: result.score_breakdown,
      reality_check: result.reality_check,
    };
    await uploadIdeaToSupabase(uploadPayload);
  } else {
    console.log('[Limina GateKeeper] Supabase credentials not set — skipping upload.');
  }

  // ── 마지막 팝업 시간 갱신 ──────────────────────────────
  updateLastPopupTime();
  console.log('[Limina GateKeeper] Pipeline complete.');
  return result;
}
