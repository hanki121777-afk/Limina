import { app, powerMonitor } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// ─────────────────────────────────────────────────────────
// 상수 정의
// ─────────────────────────────────────────────────────────
const IDLE_THRESHOLD_SECONDS = 120; // 2분 = 마우스/키보드 무입력 기준
const POLL_INTERVAL_MS = 1_000;     // 1초마다 폴링 (CPU 점유 0% 수렴)
const ACTIVE_RESUME_SECONDS = 5;    // 이 값 미만으로 idle이 내려오면 유저 복귀로 판단

// ─────────────────────────────────────────────────────────
// 내부 상태
// ─────────────────────────────────────────────────────────
let isSystemIdle = false;
let currentAbortController: AbortController | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─────────────────────────────────────────────────────────
// 콜백 타입 정의
// onSystemIdle에 등록된 함수는 Idle 감지 시 호출됩니다.
// logFilePath: daily_log.txt 경로 (파싱 시작 기준점)
// signal:      유저 복귀 시 즉시 abort() 가 호출될 AbortSignal
// ─────────────────────────────────────────────────────────
type SystemIdleCallback = (logFilePath: string, signal: AbortSignal) => void;

let registeredIdleCallback: SystemIdleCallback | null = null;

/**
 * Idle 이벤트 리스너 등록.
 * gate-keeper 또는 api-caller 모듈이 이 함수로 콜백을 등록합니다.
 */
export function onSystemIdle(callback: SystemIdleCallback): void {
  registeredIdleCallback = callback;
}

/**
 * Idle 모니터 시작.
 * app.whenReady() 이후 메인 프로세스에서 딱 1회 호출합니다.
 */
export function startIdleMonitor(): void {
  const userDataPath = app.getPath('userData');
  const logFilePath = path.join(userDataPath, 'daily_log.txt');

  pollTimer = setInterval(() => {
    const idleSeconds = powerMonitor.getSystemIdleTime();

    // ── 케이스 A: Idle 진입 ──────────────────────────────
    if (!isSystemIdle && idleSeconds >= IDLE_THRESHOLD_SECONDS) {
      isSystemIdle = true;
      currentAbortController = new AbortController();

      console.log(
        `[Limina IdleMonitor] 2-min idle detected (${idleSeconds}s). Triggering analysis pipeline...`
      );

      if (registeredIdleCallback) {
        // daily_log.txt가 없어도 콜백은 전달 (게이트키퍼가 내부에서 판단)
        const logExists = fs.existsSync(logFilePath);
        if (logExists) {
          registeredIdleCallback(logFilePath, currentAbortController.signal);
        } else {
          console.log('[Limina IdleMonitor] daily_log.txt not found. Skipping analysis.');
          // abort controller 정리
          currentAbortController = null;
          isSystemIdle = false;
        }
      }
      return;
    }

    // ── 케이스 B: 유저 복귀 → 즉각 중단 ─────────────────
    if (isSystemIdle && idleSeconds < ACTIVE_RESUME_SECONDS) {
      isSystemIdle = false;

      if (currentAbortController) {
        console.log(
          '[Limina IdleMonitor] User activity resumed. Aborting in-progress analysis...'
        );
        currentAbortController.abort();
        currentAbortController = null;
      }
    }
  }, POLL_INTERVAL_MS);

  console.log(
    `[Limina IdleMonitor] Started. Idle threshold: ${IDLE_THRESHOLD_SECONDS}s, poll: ${POLL_INTERVAL_MS}ms`
  );
}

/**
 * Idle 모니터 정지 및 리소스 해제.
 * app.before-quit 이벤트 등에서 호출합니다.
 */
export function stopIdleMonitor(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  isSystemIdle = false;
  console.log('[Limina IdleMonitor] Stopped.');
}
