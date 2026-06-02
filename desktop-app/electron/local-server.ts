import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app, BrowserWindow } from 'electron';
import { createClient } from '@supabase/supabase-js';


// ─────────────────────────────────────────────────────────
// 1. 보안 토큰 및 설정값 초기화 (config.json)
// ─────────────────────────────────────────────────────────
const userDataPath = app.getPath('userData');
const configFilePath = path.join(userDataPath, 'config.json');
const logFilePath = path.join(userDataPath, 'daily_log.txt');

interface AppConfig {
  apiToken: string;
  user: {
    language: string;
  };
}

// config.json에서 보안 토큰 로드 또는 신규 발급
function getOrInitializeToken(): string {
  try {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    if (fs.existsSync(configFilePath)) {
      const fileData = fs.readFileSync(configFilePath, 'utf-8');
      const parsed: AppConfig = JSON.parse(fileData);
      if (parsed.apiToken) {
        return parsed.apiToken;
      }
    }

    // 파일이 없거나 토큰이 비어있다면 32자 보안 토큰 발급
    const newToken = crypto.randomBytes(16).toString('hex');
    const newConfig: AppConfig = {
      apiToken: newToken,
      user: {
        language: 'ko'
      }
    };
    fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 2), 'utf-8');
    console.log('[Limina] Initialized new config and generated token.');
    return newToken;
  } catch (error) {
    console.error('[Limina] Error initializing configuration:', error);
    return 'FALLBACK_LOCAL_SECURITY_TOKEN_7421';
  }
}

// ─────────────────────────────────────────────────────────
// 2. 타임스탬프 변환 포맷 유틸리티
// ─────────────────────────────────────────────────────────
function getFormattedTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // timezone offset 포맷 계산
  const offset = -now.getTimezoneOffset();
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  
  return `[${year}-${month}-${date} ${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}]`;
}

// ─────────────────────────────────────────────────────────
// 2.5. Supabase 클라이언트 초기화 및 백그라운드 적재 셔틀
// ─────────────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL || (import.meta.env && (import.meta.env.VITE_SUPABASE_URL as string));
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || (import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY as string));

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    });
    console.log('[Limina LocalServer] Supabase client successfully initialized (without ws dependency).');
  } catch (err) {
    console.error('[Limina LocalServer] Failed to initialize Supabase client (isolated):', (err as Error).message);
  }
} else {
  console.warn('[Limina LocalServer] Supabase configuration missing from env vars.');
}

function getUserId(): string {
  const envTestUserId = process.env.VITE_TEST_USER_ID || (import.meta.env && (import.meta.env.VITE_TEST_USER_ID as string));
  if (envTestUserId) {
    return envTestUserId;
  }

  try {
    if (fs.existsSync(configFilePath)) {
      const raw = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.supabaseUserId) {
        return parsed.supabaseUserId;
      }
    }
  } catch (err) {
    console.error('[Limina LocalServer] Error reading supabaseUserId from config (isolated):', err);
  }

  return ''; // userId 없음 → 업로드 건너뜀
}

export async function uploadToSupabaseBackground(payload: { title: string; content: string }): Promise<void> {
  if (!supabase) {
    console.warn('[Limina LocalServer] Supabase client not initialized. Skipping upload.');
    return;
  }

  try {
    const userId = getUserId();
    if (!userId) {
      console.warn('[Limina LocalServer] No valid user ID found. Skipping upload.');
      return;
    }
    const title = payload.title || (payload.content.length > 50 ? payload.content.slice(0, 50) + '...' : payload.content);
    const summary = payload.content;

    console.log(`[Limina LocalServer] Background upload started for user: ${userId}`);

    const { error } = await supabase
      .from('ideas')
      .insert({
        user_id: userId,
        grade: 'BRONZE',
        score: 4.0,
        title: title,
        context: 'On-device logged stream',
        idea: summary,
        business: {},
        prompts: [],
        locale: 'ko',
        score_breakdown: {},
        reality_check: {}
      });

    if (error) {
      console.warn('[Limina LocalServer] Background upload failed (isolated):', error.message);
    } else {
      console.log('[Limina LocalServer] Background upload succeeded.');
    }
  } catch (err) {
    console.warn('[Limina LocalServer] Background upload caught exception (isolated):', (err as Error).message);
  }
}


// 수집 활성화 상태 관리 변수 및 설정 함수
export let isServerCollecting = true;

export function setServerCollecting(value: boolean) {
  isServerCollecting = value;
  console.log(`[Limina] Local server collection status updated: ${value}`);
}

// ─────────────────────────────────────────────────────────
// 3. 로컬 서버 기동 메인 함수
// ─────────────────────────────────────────────────────────
export function startLocalServer() {
  const targetToken = getOrInitializeToken();
  const PORT = 7421;
  const HOST = '127.0.0.1'; // 127.0.0.1 외의 외부 IP 접근을 완벽히 차단

  const server = http.createServer((req, res) => {
    const origin = req.headers.origin || '';

    // CORS 기본 헤더 설정 (chrome-extension:// 도메인만 통과 허용)
    if (origin.startsWith('chrome-extension://')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Limina-Token');

    // Preflight (CORS 사전 안전 검사) 처리
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // GET /status - 서버 상태 조회
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running', service: 'Limina Local Service' }));
      return;
    }

    // POST /collect - 데이터 수집 포워딩 엔드포인트
    if (req.method === 'POST' && req.url === '/collect') {
      // 0. 수집 활성화 여부 검증
      if (!isServerCollecting) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service Unavailable', message: 'Collection is stopped' }));
        return;
      }

      // 1. 헤더 토큰 검증 (X-Limina-Token)
      const clientToken = req.headers['x-limina-token'];
      if (!clientToken || clientToken !== targetToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }));
        return;
      }

      // 2. 요청 바디 데이터 스트림 수집
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body);

          // 데이터 구조 유효성 검사
          if (!payload.source || !payload.title || !payload.content) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bad Request', message: 'Missing fields' }));
            return;
          }

          // 3. daily_log.txt 파일에 시간별 타임스탬프와 함께 누적(Append) 저장
          const timestamp = getFormattedTimestamp();
          const logPayload = {
            title: payload.title,
            content: payload.content,
            url: payload.url || ''
          };
          
          const logLine = `${timestamp} [${payload.source}] ${JSON.stringify(logPayload)}\n`;

          fs.appendFileSync(logFilePath, logLine, 'utf-8');

          // 4. 화면 IPC 전달 루프 (렌더러 프로세스로 실시간 로그 전송)
          try {
            const win = BrowserWindow.getAllWindows()[0];
            if (win && !win.isDestroyed()) {
              const timeString = new Date().toTimeString().split(' ')[0];
              win.webContents.send('clipboard-copied-data', {
                id: Date.now().toString(),
                time: timeString,
                source: payload.source,
                content: payload.content.length > 55 ? payload.content.slice(0, 55) + '...' : payload.content
              });
            }
          } catch (ipcErr) {
            console.error('[Limina LocalServer] IPC transmission error (isolated):', ipcErr);
          }

          // 5. 로컬 파일 적재 및 IPC 완료 즉시 선제 응답 반환 (논블로킹)
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', logged: true }));

          // [온디바이스 프라이버시 가드레일] 날것의 수집 데이터는 무조건 클라우드로 전송하지 않고
          // 오직 로컬 파일 적재 및 화면 IPC 전달만 수행하여 사생활을 완벽히 보호합니다.

        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body' }));
        }
      });
      return;
    }

    // 그 외 매칭되지 않는 주소
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(PORT, HOST, () => {
    console.log(`[Limina] Local HTTP Server running at http://${HOST}:${PORT}`);
  });
}
