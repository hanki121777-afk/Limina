import { app, clipboard, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastClipboardText = '';

// daily_log.txt 경로 및 포맷 유틸리티
const userDataPath = app.getPath('userData');
const logFilePath = path.join(userDataPath, 'daily_log.txt');

function getFormattedTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const offset = -now.getTimezoneOffset();
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  
  return `[${year}-${month}-${date} ${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}]`;
}

/**
 * 전역 클립보드 감시 시작
 * @param win 메인 윈도우 인스턴스 (IPC 전송용)
 */
export function startClipboardMonitor(win: BrowserWindow | null) {
  if (pollTimer) return;

  // 최초 기동 시점의 클립보드 값을 미리 넣어두어, 기동하자마자 이전 내역이 오작동으로 추가되는 것 방지
  lastClipboardText = clipboard.readText().trim();

  pollTimer = setInterval(() => {
    try {
      const currentText = clipboard.readText().trim();

      // 조건: 비어있지 않고, 이전 문장과 상이할 때만 기록
      if (currentText && currentText !== lastClipboardText) {
        lastClipboardText = currentText;

        // 1. daily_log.txt 파일에 수집 양식으로 누적
        const timestamp = getFormattedTimestamp();
        const logPayload = {
          title: 'Clipboard Copied',
          content: currentText,
          url: ''
        };
        const logLine = `${timestamp} [Clipboard Monitor] ${JSON.stringify(logPayload)}\n`;
        
        fs.appendFileSync(logFilePath, logLine, 'utf-8');
        console.log(`[Limina ClipboardMonitor] New inspiration captured: "${currentText.slice(0, 30)}..."`);

        // 2. 프론트엔드로 실시간 수집 IPC 전송
        if (win && !win.isDestroyed()) {
          const timeString = new Date().toTimeString().split(' ')[0];
          win.webContents.send('clipboard-copied-data', {
            id: Date.now().toString(),
            time: timeString,
            source: 'Clipboard Monitor',
            content: `Copied text: "${currentText.length > 55 ? currentText.slice(0, 55) + '...' : currentText}"`
          });
        }
      }
    } catch (error) {
      console.error('[Limina ClipboardMonitor] Exception occurred during sniffing:', error);
    }
  }, 1000); // 1초 주기로 감시 (CPU 리소스 최저 수준 소모)

  console.log('[Limina ClipboardMonitor] Sniffer engine activated.');
}

/**
 * 전역 클립보드 감시 일시 정지 및 클리어
 */
export function stopClipboardMonitor() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[Limina ClipboardMonitor] Sniffer engine deactivated.');
}
