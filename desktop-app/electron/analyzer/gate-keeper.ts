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
  const language = user.language ?? 'en';
  const isNewUser = user.isNewUser ?? false;
  const daysSinceLastPopup = user.lastPopupAt
    ? Math.floor((Date.now() - new Date(user.lastPopupAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // 최신 데이터 우선 — 로그가 길면 뒤쪽(최신) 8000자만 전달
  const logSlice = maskedLog.length > 8000
    ? '...[earlier entries truncated]\n' + maskedLog.slice(-7800)
    : maskedLog;

  return `You are IdeaTok's core AI analysis engine. Extract high-quality business ideas from the user's daily activity log.

USER CONTEXT:
${JSON.stringify({
    interest_categories: interests.split(', '),
    quality_mode: user.qualityMode ?? 'balance',
    language,
    days_since_last_popup: daysSinceLastPopup,
    trigger_keyword_matched: null,
    is_new_user: isNewUser,
  }, null, 2)}

DAILY LOG (PII masked, last 7 days):
\`\`\`
${logSlice}
\`\`\`

INSTRUCTIONS:
1. Analyze patterns, keyword synergies, and pain points across multiple days.
2. Score the best idea using the 5-criteria rubric:
   - Feasibility: 0-3 pts (3=start now, 2=6mo, 1=1yr+, 0=impossible)
   - Market size: 0-2 pts (2=TAM>1T KRW, 1=niche, 0=too small)
   - Revenue clarity: 0-2 pts (2=clear model, 1=needs validation, 0=unclear)
   - Differentiation: 0-2 pts (2=10x better/new category, 1=incremental, 0=none)
   - User fit: 0-1 pt (1=exact match to interests, 0.5=adjacent, 0=unrelated)
3. Grade: GOLD(8-10), SILVER(6-7), BRONZE(4-5), BURN(1-3), EMPTY(no meaningful data).
4. If days_since_last_popup >= 5 AND no GOLD/SILVER/BRONZE: output REPORT grade.
5. Apply storytelling: scene description, user as protagonist, specific numbers.
6. ALL output text MUST be in the user's language: "${language}". No exceptions.
7. Do NOT output anything outside the specified format below.

OUTPUT FORMAT (strict — system parses this with regex):

For GOLD/SILVER/BRONZE:
[GRADE: GOLD|SILVER|BRONZE]
[SCORE: X.X/10]
[TITLE] Single impactful title
[CONTEXT] 1-2 lines: which data points fused to create this idea
[IDEA] 3-5 lines with storytelling rules applied
[BUSINESS]
- 타겟: who this is for
- 핵심 문제: what problem is solved
- 해결 방식: how it's solved
- 수익 모델: how it makes money
[PROMPTS]
1. "Complete standalone prompt for market validation"
2. "Complete standalone prompt for competitor analysis"
3. "Complete standalone prompt for revenue model"
4. "Complete standalone prompt for MVP design"
5. "Complete standalone prompt for marketing strategy"

For REPORT:
[GRADE: REPORT]
[SUMMARY] Summary text
[KEYWORDS] #keyword1, #keyword2, #keyword3, #keyword4, #keyword5
[TREND] 1-2 line trend summary

For BURN:
[GRADE: BURN]
[REASON] One-line reason (English OK)

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
      max_tokens: 2000,
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

  const title = extractBetween(text, '[TITLE]', ['[CONTEXT]', '[IDEA]', '[BUSINESS]', '[PROMPTS]', '[GRADE:']);
  const context = extractBetween(text, '[CONTEXT]', ['[IDEA]', '[BUSINESS]', '[PROMPTS]', '[GRADE:']);
  const idea = extractBetween(text, '[IDEA]', ['[BUSINESS]', '[PROMPTS]', '[GRADE:']);

  // Business 섹션 파싱
  const businessRaw = extractBetween(text, '[BUSINESS]', ['[PROMPTS]', '[GRADE:']);
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
  console.log(`[IdeaTok GateKeeper] Notification shown: [${result.grade}] ${body.slice(0, 50)}`);
}

// ─────────────────────────────────────────────────────────
// runGateKeeper — idle-monitor의 onSystemIdle 콜백에서 호출
// ─────────────────────────────────────────────────────────
export async function runGateKeeper(
  logFilePath: string,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) return;

  console.log('[IdeaTok GateKeeper] Analysis pipeline started.');

  // ── 설정 로드 ──────────────────────────────────────────
  const config = readConfig();

  // Anthropic API 키 확인 (.env VITE_ANTHROPIC_API_KEY 또는 config.json)
  const envVars = import.meta.env as Record<string, string | undefined>;
  const apiKey = config.anthropicApiKey ?? envVars.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[IdeaTok GateKeeper] No Anthropic API key found. Set VITE_ANTHROPIC_API_KEY in .env or anthropicApiKey in config.json.');
    return;
  }

  // ── 로그 파일 읽기 ─────────────────────────────────────
  let logContent: string;
  try {
    logContent = fs.readFileSync(logFilePath, 'utf-8');
  } catch {
    console.log('[IdeaTok GateKeeper] Could not read daily_log.txt.');
    return;
  }

  if (signal.aborted) return;

  // ── 1단계: 데이터 밀도 검사 (로컬, AI 없음) ────────────
  if (!checkDataDensity(logContent)) {
    console.log('[IdeaTok GateKeeper] Stage 1 FAILED: Insufficient data density. Skipping.');
    return;
  }
  console.log('[IdeaTok GateKeeper] Stage 1 PASSED: Data density OK.');

  if (signal.aborted) return;

  // ── PII 마스킹 (Claude 전송 전 필수) ──────────────────
  const maskedLog = maskPII(logContent);

  // ── 모델 + 프롬프트 준비 ───────────────────────────────
  const model = selectModel(config.user.tier ?? 'free');
  const prompt = buildPrompt(maskedLog, config);

  // ── 2단계: Claude API 호출 ──────────────────────────────
  let responseText: string;
  try {
    console.log(`[IdeaTok GateKeeper] Stage 2: Calling Claude API (model: ${model})...`);
    responseText = await callClaudeApi(prompt, model, apiKey, signal);
  } catch (err) {
    if (signal.aborted) {
      console.log('[IdeaTok GateKeeper] API call aborted by user activity.');
    } else {
      console.error('[IdeaTok GateKeeper] Claude API error:', (err as Error).message);
    }
    return;
  }

  if (signal.aborted) return;

  // ── 응답 파싱 ──────────────────────────────────────────
  const result = parseApiResponse(responseText);
  console.log(`[IdeaTok GateKeeper] Parsed result — Grade: ${result.grade}, Score: ${result.score}`);

  // ── BURN / EMPTY → 조용히 소각 ────────────────────────
  if (result.grade === 'BURN' || result.grade === 'EMPTY') {
    console.log('[IdeaTok GateKeeper] Result discarded (BURN/EMPTY).');
    return;
  }

  // ── 점수 임계치 검사 (REPORT는 항상 통과) ────────────
  const threshold = QUALITY_THRESHOLDS[config.user.qualityMode ?? 'balance'];
  if (result.grade !== 'REPORT' && result.score < threshold) {
    console.log(`[IdeaTok GateKeeper] Score ${result.score} < threshold ${threshold}. Silent discard.`);
    return;
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
    };
    await uploadIdeaToSupabase(uploadPayload);
  } else {
    console.log('[IdeaTok GateKeeper] Supabase credentials not set — skipping upload.');
  }

  // ── 마지막 팝업 시간 갱신 ──────────────────────────────
  updateLastPopupTime();
  console.log('[IdeaTok GateKeeper] Pipeline complete.');
}
