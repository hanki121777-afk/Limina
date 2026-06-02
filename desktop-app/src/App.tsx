import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy, ExternalLink, Globe, Shield, Info, Terminal, RefreshCw, Minus, X, Sparkles, Bell, Settings as SettingsIcon
} from 'lucide-react';
import './i18n';
import Settings from './Settings';

interface LogLine {
  id: string;
  time: string;
  source: string;
  content: string;
}

interface IdeaData {
  grade: string;
  score: number;
  title?: string;
  idea?: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const [isRunning, setIsRunning] = useState(true);
  const [token, setToken] = useState('••••••••••••••••••••••••••••••••');
  const [copied, setCopied] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'ko');
  const [showToast, setShowToast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [latestIdea, setLatestIdea] = useState<IdeaData | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ status: string, version?: string, error?: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 커스텀 토스트 알림 발사 함수
  const fireToast = () => {
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 4000);
  };

  // 예시 로컬 수집 로그 데이터
  const [logs, setLogs] = useState<LogLine[]>([
    { id: '1', time: '12:44:02', source: 'Chrome Extension', content: 'User read business article on TechCrunch: "SaaS growth in 2026..."' },
    { id: '2', time: '12:44:15', source: 'Clipboard Monitor', content: 'Copied text: "How to validate business ideas without spending money on ads"' },
    { id: '3', time: '12:44:50', source: 'Chrome Extension', content: 'User watched YouTube: "10 Profitable Micro-SaaS Business Ideas"' },
  ]);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
  };

  // 자동 스크롤 마감 (Scroll-to-Bottom)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 주기적으로 mock 로그 추가 (작동 중일 때만)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const mockSources = ['Chrome Extension', 'Clipboard Monitor', 'Word Extractor'];
      const mockContents = [
        'User search: "SaaS pricing strategies for global market"',
        'Copied paragraph: "AI-driven customer support tools will replace traditional ticketing systems."',
        'Extracted docx: "Limina product roadmap 2026.docx - core values definition"',
        'User watch: "Why bootstrapped startups fail in their first year"'
      ];
      
      const newLog: LogLine = {
        id: Date.now().toString(),
        time: new Date().toTimeString().split(' ')[0],
        source: mockSources[Math.floor(Math.random() * mockSources.length)],
        content: mockContents[Math.floor(Math.random() * mockContents.length)]
      };

      setLogs(prev => [...prev.slice(-19), newLog]);
    }, 7000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // 클립보드 실시간 수집 IPC 감지
  useEffect(() => {
    const handleClipboardCopied = (_event: any, data: any) => {
      setLogs(prev => [...prev.slice(-19), data]);
    };

    window.ipcRenderer.on('clipboard-copied-data', handleClipboardCopied);

    return () => {
      window.ipcRenderer.off('clipboard-copied-data', handleClipboardCopied);
    };
  }, []);

  // 새 아이디어 수신 + 초기 로드
  useEffect(() => {
    window.ipcRenderer.invoke('get-latest-idea').then((data: IdeaData | null) => {
      if (data) setLatestIdea(data);
    });

    window.ipcRenderer.invoke('config-read').then((config: any) => {
      if (config?.apiToken) setToken(config.apiToken);
    });

    const handleNewIdea = (_event: any, data: IdeaData) => {
      setLatestIdea(data);
      fireToast();
    };
    window.ipcRenderer.on('new-idea', handleNewIdea);

    const handleUpdateStatus = (_event: any, data: any) => {
      setUpdateStatus(data);
    };
    window.ipcRenderer.on('update-status', handleUpdateStatus);

    return () => { 
      window.ipcRenderer.off('new-idea', handleNewIdea);
      window.ipcRenderer.off('update-status', handleUpdateStatus);
    };
  }, []);

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-0 text-white p-5 font-ko select-none">
      {/* 헤더 (Frameless 드래그 활성화) */}
      <header 
        className="flex justify-between items-center pb-3 border-b border-border mb-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* 로고 (드래그 제외) */}
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <img src="icon.png" alt="Limina" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-sm font-semibold tracking-wide font-en text-white">Limina</h1>
            <p className="text-[10px] text-zinc-500 font-mono">v0.1.0 (Local Agent)</p>
          </div>
        </div>

        {/* 상단 컨트롤 영역 (언어 설정 + 최소화/닫기, 드래그 제외) */}
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          
          {/* 업데이트 알림 */}
          {updateStatus && updateStatus.status === 'downloaded' && (
            <button
              onClick={() => window.ipcRenderer.send('restart-app')}
              className="flex items-center gap-1.5 px-2 py-1 bg-cyan text-black rounded text-[10px] font-bold hover:bg-cyan/90 transition-all animate-pulse cursor-pointer"
              title="Click to restart and install update"
            >
              <RefreshCw className="w-3 h-3" />
              Update v{updateStatus.version} Ready
            </button>
          )}
          {updateStatus && updateStatus.status === 'available' && (
            <span className="flex items-center gap-1 px-2 py-1 bg-zinc-800 text-cyan rounded text-[10px] border border-cyan/20">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Downloading v{updateStatus.version}...
            </span>
          )}

          {/* 언어 설정 */}
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500 mr-1">{t('langLabel')}</span>
            <select 
              value={currentLang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="bg-bg-card border border-zinc-800 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan text-zinc-300 cursor-pointer"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* 설정 + 창 제어 */}
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200 flex items-center justify-center cursor-pointer"
              title={t('settingsBtn')}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.ipcRenderer.send('window-minimize')}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200 flex items-center justify-center cursor-pointer"
              title="최소화"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.ipcRenderer.send('window-close')}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 flex items-center justify-center cursor-pointer"
              title="닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐트 */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        
        {/* 왼쪽 패널: 상태 및 설정 */}
        <div className="space-y-4 md:col-span-1">
          
          {/* 수집기 상태 카드 */}
          <div className="bg-bg-card border border-border p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-400">{t('statusLabel')}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                isRunning 
                  ? 'bg-cyan/10 text-cyan border border-cyan/20' 
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-cyan animate-pulse' : 'bg-zinc-500'}`} />
                {isRunning ? t('running') : t('stopped')}
              </span>
            </div>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] ${
                isRunning
                  ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                  : 'bg-cyan text-black hover:bg-cyan/95'
              }`}
            >
              {isRunning ? t('toggleOff') : t('toggleOn')}
            </button>
          </div>

          {/* 인증 토큰 카드 */}
          <div className="bg-bg-card border border-border p-4 rounded-xl space-y-2">
            <span className="text-xs font-semibold text-zinc-400">{t('tokenLabel')}</span>
            <div className="flex items-center justify-between gap-2 bg-bg-0 border border-zinc-800 px-3 py-2 rounded-lg">
              <span className="text-xs font-mono text-zinc-400 truncate flex-1">{token}</span>
              {copied ? (
                <span className="text-[11px] font-semibold text-cyan flex items-center gap-1 shrink-0 select-none px-1 py-0.5 animate-pulse">
                  Copied ✓
                </span>
              ) : (
                <button
                  onClick={handleCopyToken}
                  className="p-1.5 rounded text-zinc-500 hover:text-cyan hover:bg-zinc-800/50 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                  title={t('copyToken')}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 정보 안내 카드 */}
          <div className="bg-cyan/5 border border-cyan/10 p-3.5 rounded-xl flex gap-2.5">
            <Shield className="w-5 h-5 text-cyan shrink-0" />
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-zinc-300">On-Device Privacy</span>
              <p className="text-[12px] text-orange-400 font-semibold leading-normal">
                {t('dataInfo')}
              </p>
            </div>
          </div>
        </div>

        {/* 오른쪽 패널 컨테이너 (정밀 픽셀 고정으로 레이아웃 핏 복구 및 하단 고정 보장) */}
        <div className="md:col-span-2 flex flex-col justify-between h-[490px]">
          
          {/* 수집 로그 모니터링 (고정 높이 320px 락 및 오버플로우 제어) */}
          <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col h-[320px]">
            <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan" />
                <span className="text-xs font-semibold text-zinc-300">{t('recentLogs')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className={`w-3 h-3 text-zinc-600 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                <span className="text-[10px] text-zinc-600 font-mono">Live</span>
              </div>
            </div>

            <div ref={logContainerRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2.5 pr-2">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600">
                  {t('noLogs')}
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-2.5 leading-relaxed py-1 border-b border-zinc-900/50 hover:bg-zinc-950/20 px-1 rounded transition-colors">
                    <span className="text-zinc-600 shrink-0 select-none">[{log.time}]</span>
                    <span className="text-cyan font-semibold shrink-0 select-none">[{log.source}]</span>
                    <span className="text-zinc-300 break-all">{log.content}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 최근 생성된 아이디어 미니 프리뷰 */}
          <div
            onClick={() => {
              window.ipcRenderer.send('open-external-url', import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000');
            }}
            className="bg-bg-card border border-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group h-[150px] shrink-0 cursor-pointer hover:border-cyan/30 transition-all active:scale-[0.99]"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan/5 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none group-hover:bg-cyan/10 transition-all duration-300" />

            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-300">💡 {t('recentIdea')}</span>
                <span className="text-[9px] text-zinc-500 font-mono tracking-wider font-semibold">ON-DEVICE FILTERED</span>
              </div>
              {latestIdea && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                  latestIdea.grade === 'GOLD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  latestIdea.grade === 'SILVER' ? 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/20' :
                  'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {latestIdea.grade}
                </span>
              )}
            </div>

            {latestIdea ? (
              <>
                <div className="flex-1 flex flex-col justify-center py-1">
                  <h4 className="text-xs font-bold text-cyan leading-tight mb-1 truncate">
                    {latestIdea.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 leading-normal line-clamp-2">
                    {latestIdea.idea}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-border/30 pt-2 text-[9px] font-mono text-zinc-500">
                  <span>Score: <strong className="text-cyan font-bold">{latestIdea.score}/10</strong></span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-zinc-500">{t('noIdea')}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{t('noIdeaDesc')}</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* 💡 커스텀 토스트 알림 팝업 (OS 알림 대체 — 앱 내부에서 직접 렌더링) */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-4 shadow-[0_8px_32px_rgba(245,158,11,0.15),0_0_0_1px_rgba(245,158,11,0.1)] w-[340px] backdrop-blur-xl">
            {/* 상단 헤더 */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <span className={`text-[11px] font-bold tracking-wide font-mono ${
                  latestIdea?.grade === 'GOLD' ? 'text-amber-400' :
                  latestIdea?.grade === 'SILVER' ? 'text-zinc-300' : 'text-orange-400'
                }`}>{latestIdea?.grade ?? 'IDEA'} ALERT</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowToast(false); }}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* 본문 */}
            <h4 className="text-sm font-bold text-white leading-tight mb-1.5">
              💡 {latestIdea?.title || t('noIdea')}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3 line-clamp-2">
              {latestIdea?.idea || ''}
            </p>
            {/* 하단 배지 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  Score {latestIdea?.score ?? 0}/10
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan/10 text-cyan border border-cyan/20 font-mono">
                  {latestIdea?.grade ?? '—'}
                </span>
              </div>
              <Bell className="w-3.5 h-3.5 text-amber-400/50 animate-pulse" />
            </div>
            {/* 하단 프로그레스 바 (자동 사라짐 타이머 시각화) */}
            <div className="mt-3 h-[2px] bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full animate-shrink-bar" />
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="flex justify-between items-center pt-3 border-t border-border mt-auto">
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <Info className="w-3.5 h-3.5" />
          <span>Local Server: http://127.0.0.1:7421</span>
        </div>
        
        <button
          onClick={() => window.ipcRenderer.send('open-external-url', import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan/20 bg-cyan/5 text-cyan hover:bg-cyan/20 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
        >
          {t('openDashboard')}
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  );
}

export default App;
