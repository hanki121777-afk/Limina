'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Analysis() {
  const t = useTranslations();

  // ─────────────────────────────────────────────
  // INTERACTIVE AI ANALYSIS STATE MACHINE (CODE WINDOW)
  // ─────────────────────────────────────────────
  const [animating, setAnimating] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [leftLinesActive, setLeftLinesActive] = useState<number[]>([]);
  const [leftLinesDone, setLeftLinesDone] = useState<number[]>([]);
  const [rightLinesActive, setRightLinesActive] = useState<number[]>([]);
  const [rightLinesDone, setRightLinesDone] = useState<number[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [iconSpin, setIconSpin] = useState(false);
  const [scoreText, setScoreText] = useState('score: --- / 10');
  const [badgePulse, setBadgePulse] = useState(false);

  const startAnalysisAnimation = async () => {
    if (animating) return;
    setAnimating(true);

    // Reset
    setScanActive(false);
    setLeftLinesActive([]);
    setLeftLinesDone([]);
    setRightLinesActive([]);
    setRightLinesDone([]);
    setIsComputing(false);
    setIconSpin(false);
    setScoreText('score: --- / 10');
    setBadgePulse(false);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    await sleep(500);

    // Phase 1: Scan beam sweeps down left panel
    setScanActive(true);

    for (let i = 0; i < 11; i++) {
      setLeftLinesActive([i]);
      await sleep(180);
      setLeftLinesActive([]);
      setLeftLinesDone(prev => [...prev, i]);
    }
    await sleep(400);
    setScanActive(false);

    // Phase 2: Right panel line-by-line typing
    for (let i = 0; i < 11; i++) {
      setRightLinesActive([i]);
      const dwell = [4, 5, 6, 7].includes(i) ? 320 : 180;
      await sleep(dwell);
      setRightLinesActive([]);
      setRightLinesDone(prev => [...prev, i]);
    }
    await sleep(280);

    // Phase 3: Result row highlight & score roll-up
    setIsComputing(true);
    setIconSpin(true);

    let currentScore = 0;
    const targetScore = 9.2;
    while (currentScore < targetScore - 0.01) {
      currentScore = Math.min(currentScore + 0.25 + Math.random() * 0.4, targetScore);
      setScoreText(`score: ${currentScore.toFixed(1)} / 10`);
      await sleep(38);
    }
    setScoreText('score: 9.2 / 10');
    setBadgePulse(true);

    // Hold the final state
    await sleep(3200);

    // Reset loop
    setAnimating(false);
  };

  useEffect(() => {
    let active = true;
    const runLoop = async () => {
      while (active) {
        await startAnalysisAnimation();
        await new Promise(r => setTimeout(r, 900));
      }
    };
    runLoop();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="analysis-section">
      <div className="inner">
        <div className="analysis-text">
          <p className="section-label">{t('analysis.label')}</p>
          <h2 className="h-section">
            {t('analysis.title').split('아이디어로')[0]}<br />
            <em>아이디어로</em><br />
            {t('analysis.title').split('아이디어로')[1]}
          </h2>
          <p>{t('analysis.desc')}</p>
          <div className="analysis-stats">
            <div className="stat">
              <span className="stat-num">{t('analysis.stats.retention.num').replace('일', '')}<span className="ko">일</span></span>
              <span className="stat-label"><span className="ko-label">{t('analysis.stats.retention.label')}</span></span>
            </div>
            <div className="stat">
              <span className="stat-num">{t('analysis.stats.alert.num').replace('점+', '')}<span className="ko">점+</span></span>
              <span className="stat-label"><span className="ko-label">{t('analysis.stats.alert.label')}</span></span>
            </div>
            <div className="stat">
              <span className="stat-num">{t('analysis.stats.lag.num').replace('렉', '')}<span className="ko">렉</span></span>
              <span className="stat-label"><span className="ko-label">{t('analysis.stats.lag.label')}</span></span>
            </div>
          </div>
        </div>
        <div className={`code-window ${animating ? 'animating' : ''}`}>
          <div className="code-header">
            <div className="code-dot red"></div>
            <div className="code-dot yellow"></div>
            <div className="code-dot green"></div>
            <span className="code-title">{t('analysis.code.title')}</span>
            <span className="code-badge">IDEA TOK ◈</span>
          </div>
          <div className="code-split">
            <div className="code-panel left">
              <div className="panel-label">{t('analysis.code.panelLeftLabel')}</div>
              <div className={`scan-beam ${scanActive ? 'active' : ''}`}></div>
              <div className="code-lines">
                {Object.entries(t.raw('analysis.code.linesLeft')).map(([key, val], idx) => {
                  const lineNum = (idx + 1).toString().padStart(2, '0');
                  const isRemoved = ['l3', 'l5', 'l9'].includes(key);
                  const isActive = leftLinesActive.includes(idx);
                  const isDone = leftLinesDone.includes(idx);
                  return (
                    <div 
                      key={key} 
                      className={`code-line ${isRemoved ? 'removed' : 'dim'} ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    >
                      <span className="ln">{lineNum}</span>
                      <span className="code-text">{val as string}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="code-panel right">
              <div className="panel-label">{t('analysis.code.panelRightLabel')}</div>
              <div className="code-lines">
                {[
                  <span key="r1"><span className="code-text kw">def </span><span className="code-text fn">analyze</span>(log):</span>,
                  <span key="r2">  density = <span className="code-text fn">count</span>(log.events)</span>,
                  <span key="r3">  recency = <span className="code-text fn">within_days</span>(log, <span className="code-text num">7</span>)</span>,
                  <span key="r4">  score = density <span className="code-text op">*</span> recency <span className="code-text op">*</span> <span className="code-text fn">ai_match</span>()</span>,
                  <span key="r5" className="added-line"><span className="code-text kw">  if </span>score <span className="code-text op">&gt;=</span><span className="code-text num"> 8</span>:</span>,
                  <span key="r6" className="added-line">    idea = <span className="code-text str">"드론 스마트 수거함"</span></span>,
                  <span key="r7" className="added-line">    prompts = <span className="code-text fn">build_prompts</span>(idea, n=<span className="code-text num">5</span>)</span>,
                  <span key="r8" className="added-line">    notify(<span className="code-text str">GOLD</span>, score=<span className="code-text num">9.2</span>)</span>,
                  <span key="r9"><span className="code-text kw">  elif </span>score <span className="code-text op">&gt;=</span><span className="code-text num"> 5</span>:</span>,
                  <span key="r10">    archive(log, tag=<span className="code-text str">"SILVER"</span>)</span>,
                  <span key="r11"><span className="code-text kw">  else</span>: silent_burn(log)</span>
                ].map((element, idx) => {
                  const lineNum = (idx + 1).toString().padStart(2, '0');
                  const isAdded = [4, 5, 6, 7].includes(idx);
                  const isActive = rightLinesActive.includes(idx);
                  const isDone = rightLinesDone.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      className={`code-line ${isAdded ? 'added' : 'dim'} ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    >
                      <span className="ln">{lineNum}</span>
                      {element}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={`code-result ${isComputing ? 'computing' : ''}`}>
            <div className="result-line">
              <span className={`result-icon ${iconSpin ? 'spin' : ''}`}>▶</span>
              <span className="result-text">
                GOLD {t('hero.subTitle').split(' ').pop()} {t('demo.card.btnCopy').split(' ')[0]}
                <span className="result-score">{scoreText}</span>
              </span>
              <span className={`result-badge ${badgePulse ? 'pulse' : ''}`}>{t('analysis.code.resultBadge')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
