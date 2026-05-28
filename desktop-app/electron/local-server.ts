import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';

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
    console.log('[IdeaTok] Initialized new config and generated token:', newToken);
    return newToken;
  } catch (error) {
    console.error('[IdeaTok] Error initializing configuration:', error);
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-IdeaTok-Token');

    // Preflight (CORS 사전 안전 검사) 처리
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // GET /status - 서버 상태 조회
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running', service: 'IdeaTok Local Service' }));
      return;
    }

    // POST /collect - 데이터 수집 포워딩 엔드포인트
    if (req.method === 'POST' && req.url === '/collect') {
      // 1. 헤더 토큰 검증 (X-IdeaTok-Token)
      const clientToken = req.headers['x-ideatok-token'];
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

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', logged: true }));
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
    console.log(`[IdeaTok] Local HTTP Server running at http://${HOST}:${PORT}`);
  });
}
