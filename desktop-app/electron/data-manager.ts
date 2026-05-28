import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { app } from 'electron';

const userDataPath = app.getPath('userData');
const logFilePath = path.join(userDataPath, 'daily_log.txt');
const tempLogFilePath = path.join(userDataPath, 'daily_log.tmp');

// 7일(168시간)을 밀리초 단위로 변환
const ROLL_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; 

/**
 * daily_log.txt 파일을 읽어 7일이 지난 데이터를 소각하고 남은 데이터를 보존합니다.
 */
export async function performDataRollingCleanup(): Promise<void> {
  try {
    if (!fs.existsSync(logFilePath)) {
      return; // 로그 파일이 없으면 정리할 것도 없으므로 조용히 스킵
    }

    console.log('[IdeaTok DataManager] Starting 7-day rolling data cleanup...');

    const readStream = fs.createReadStream(logFilePath, 'utf-8');
    const writeStream = fs.createWriteStream(tempLogFilePath, 'utf-8');

    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity
    });

    const now = new Date();
    let keptCount = 0;
    let purgedCount = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;

      // 정규식을 사용해 매 라인의 맨 앞 타임스탬프 파싱
      // 포맷 예시: [2026-05-28 08:06:00+09:00]
      const tsMatch = line.match(/^\[([\d\-]+\s[\d\:]+[\+\-\d\:]+)\]/);

      if (tsMatch && tsMatch[1]) {
        // 타임스탬프의 공백을 'T'로 치환하여 정확한 ISO 8601 포맷으로 파싱
        const logTimeStr = tsMatch[1].replace(' ', 'T');
        const logTime = new Date(logTimeStr);

        if (!isNaN(logTime.getTime())) {
          const ageMs = now.getTime() - logTime.getTime();

          if (ageMs < ROLL_LIMIT_MS) {
            // 7일 이내의 로그 데이터는 보존
            writeStream.write(line + '\n');
            keptCount++;
          } else {
            // 7일 초과 로그 데이터는 소각 (파일에 기록하지 않음)
            purgedCount++;
          }
          continue;
        }
      }

      // 파싱 실패 또는 날짜 형식이 올바르지 않은 라인은 안전하게 보존
      writeStream.write(line + '\n');
      keptCount++;
    }

    // 스트림 종료 처리
    writeStream.end();

    // 임시 파일로 원래 로그 파일을 안전하게 덮어쓰기 (원자적 교체)
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        try {
          fs.renameSync(tempLogFilePath, logFilePath);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    console.log(`[IdeaTok DataManager] Rolling cleanup completed. Kept: ${keptCount} lines, Purged (7 days older): ${purgedCount} lines.`);
  } catch (error) {
    console.error('[IdeaTok DataManager] Error during data rolling cleanup:', error);
    // 에러 발생 시 임시 파일 안전하게 정리
    if (fs.existsSync(tempLogFilePath)) {
      try {
        fs.unlinkSync(tempLogFilePath);
      } catch (e) {
        // 무시
      }
    }
  }
}

/**
 * 백그라운드 데이터 소각 스케줄러 가동 함수
 */
export function startDataCleanupScheduler() {
  // 1. 앱 구동 즉시 1회 실행
  performDataRollingCleanup();

  // 2. 매 12시간마다 백그라운드에서 한 번씩 조용히 실행 (CPU 점유 0% 수렴)
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    performDataRollingCleanup();
  }, TWELVE_HOURS_MS);
}
