'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

export default function Insight() {
  const t = useTranslations();
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let chartFrameId: number;

    const seedRand = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };

    const gen = (rng: () => number, cnt: number, peakHigh: number, peakLow: number, spread: number) => {
      const arr = [];
      for (let i = 0; i < cnt; i++) {
        const r = rng();
        const base = r < 0.18 ? peakHigh : peakLow;
        const score = Math.max(0.3, Math.min(9.9, base + (rng() - 0.5) * spread));
        arr.push(score);
      }
      return arr;
    };

    const seedRng = seedRand(7);
    const categories = [
      { label: t('insight.chartCard.categories.news'), data: gen(seedRng, 38, 8.6, 5.2, 2.6) },
      { label: t('insight.chartCard.categories.youtube'), data: gen(seedRng, 46, 8.2, 4.4, 2.8) },
      { label: t('insight.chartCard.categories.ai'), data: gen(seedRng, 32, 8.8, 5.6, 2.4) },
    ];

    let dots: Array<{
      baseX: number;
      baseY: number;
      ampX: number;
      ampY: number;
      speedX: number;
      speedY: number;
      phaseX: number;
      phaseY: number;
      ampX2: number;
      ampY2: number;
      speedX2: number;
      speedY2: number;
      phaseX2: number;
      phaseY2: number;
      twinkleSpeed: number;
      twinklePhase: number;
      r: number;
      alpha: number;
      glow: boolean;
      score: number;
      isGold: boolean;
    }> = [];
    let medianLine: Array<{ cx: number; y: number }> = [];
    let layout: any = null;

    const setup = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * DPR;
      canvas.height = H * DPR;

      const padL = 18, padR = 44, padT = 20, padB = 32;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;
      const maxScore = 10;
      const colW = chartW / categories.length;

      dots = [];
      medianLine = [];

      categories.forEach((cat, ci) => {
        const cx = padL + ci * colW + colW / 2;
        const rng = seedRand(cat.label.charCodeAt(0) * 31 + ci * 17);

        cat.data.forEach((score) => {
          const jitter = (rng() - 0.5) * colW * 0.55;
          const baseX = cx + jitter;
          const baseY = padT + chartH - (score / maxScore) * chartH;

          const isGold = score >= 8;
          const ampX = (isGold ? 4.5 : 3.5) + rng() * 3.5;
          const ampY = (isGold ? 5.0 : 4.0) + rng() * 4.0;
          const speedX = 0.00028 + rng() * 0.00040;
          const speedY = 0.00022 + rng() * 0.00036;
          const phaseX = rng() * Math.PI * 2;
          const phaseY = rng() * Math.PI * 2;
          const ampX2 = 1.4 + rng() * 1.8;
          const ampY2 = 1.4 + rng() * 1.8;
          const speedX2 = speedX * (2.1 + rng() * 0.8);
          const speedY2 = speedY * (2.3 + rng() * 0.9);
          const phaseX2 = rng() * Math.PI * 2;
          const phaseY2 = rng() * Math.PI * 2;
          const twinkleSpeed = 0.0006 + rng() * 0.0010;
          const twinklePhase = rng() * Math.PI * 2;

          let r, alpha, glow;
          if (score >= 8) {
            r = 2.8;
            alpha = 0.95;
            glow = true;
          } else if (score >= 5) {
            r = 2.2;
            alpha = 0.42;
            glow = false;
          } else {
            r = 1.8;
            alpha = 0.16;
            glow = false;
          }

          dots.push({
            baseX, baseY,
            ampX, ampY, speedX, speedY, phaseX, phaseY,
            ampX2, ampY2, speedX2, speedY2, phaseX2, phaseY2,
            twinkleSpeed, twinklePhase,
            r, alpha, glow, score, isGold,
          });
        });

        const sorted = [...cat.data].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        medianLine.push({ cx, y: padT + chartH - (median / maxScore) * chartH });
      });

      layout = { W, H, DPR, padL, padR, padT, padB, chartW, chartH, maxScore, colW };
    };

    const drawStatic = (c: CanvasRenderingContext2D) => {
      if (!layout) return;
      const { W, padL, padR, padT, padB, chartH, maxScore } = layout;

      const yTicks = [0, 2, 4, 6, 8, 10];
      yTicks.forEach(v => {
        const y = padT + chartH - (v / maxScore) * chartH;
        c.beginPath();
        c.moveTo(padL, y);
        c.lineTo(W - padR, y);
        c.setLineDash([2, 4]);
        c.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        c.lineWidth = 1;
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = 'rgba(255, 255, 255, 0.28)';
        c.font = '10px JetBrains Mono, monospace';
        c.textBaseline = 'middle';
        c.textAlign = 'left';
        c.fillText(v.toString(), W - padR + 8, y);
      });

      const goldY = padT + chartH - (8 / maxScore) * chartH;
      c.beginPath();
      c.moveTo(padL, goldY);
      c.lineTo(W - padR, goldY);
      c.setLineDash([4, 4]);
      c.strokeStyle = 'rgba(39, 224, 161, 0.22)';
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);

      c.beginPath();
      medianLine.forEach((p, i) => {
        if (i === 0) c.moveTo(p.cx, p.y);
        else c.lineTo(p.cx, p.y);
      });
      c.strokeStyle = 'rgba(39, 224, 161, 0.35)';
      c.lineWidth = 1.4;
      c.stroke();

      c.beginPath();
      medianLine.forEach((p, i) => {
        if (i === 0) c.moveTo(p.cx, p.y);
        else c.lineTo(p.cx, p.y);
      });
      c.lineTo(medianLine[medianLine.length - 1].cx, padT + chartH);
      c.lineTo(medianLine[0].cx, padT + chartH);
      c.closePath();
      const fillGrad = c.createLinearGradient(0, padT, 0, padT + chartH);
      fillGrad.addColorStop(0, 'rgba(39, 224, 161, 0.10)');
      fillGrad.addColorStop(1, 'rgba(39, 224, 161, 0)');
      c.fillStyle = fillGrad;
      c.fill();

      const { H, padB: pb } = layout;
      medianLine.forEach((p, i) => {
        c.fillStyle = 'rgba(255, 255, 255, 0.45)';
        c.font = '11px Pretendard, sans-serif';
        c.textBaseline = 'top';
        c.textAlign = 'center';
        c.fillText(categories[i].label, p.cx, H - pb + 12);
      });
    };

    const render = (time: number) => {
      if (!layout) return;
      ctx.setTransform(layout.DPR, 0, 0, layout.DPR, 0, 0);
      ctx.clearRect(0, 0, layout.W, layout.H);

      drawStatic(ctx);

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const x = d.baseX
          + Math.sin(time * d.speedX + d.phaseX) * d.ampX
          + Math.sin(time * d.speedX2 + d.phaseX2) * d.ampX2;
        const y = d.baseY
          + Math.cos(time * d.speedY + d.phaseY) * d.ampY
          + Math.cos(time * d.speedY2 + d.phaseY2) * d.ampY2;
        const twinkle = 0.5 + 0.5 * Math.sin(time * d.twinkleSpeed + d.twinklePhase);

        if (d.glow) {
          const haloR = d.r + 3 + twinkle * 2.5;
          const haloA = 0.10 + twinkle * 0.18;
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(39, 224, 161, ${haloA.toFixed(3)})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(39, 224, 161, ${(d.alpha * (0.85 + twinkle * 0.15)).toFixed(3)})`;
          ctx.fill();
        } else {
          const a = d.alpha * (0.7 + twinkle * 0.3);
          ctx.beginPath();
          ctx.arc(x, y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(3)})`;
          ctx.fill();
        }
      }

      chartFrameId = requestAnimationFrame(render);
    };

    setup();
    chartFrameId = requestAnimationFrame(render);

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setup();
      }, 120);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(chartFrameId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="insight-section">
      <div className="inner">
        <div className="insight-header">
          <p className="section-label">{t('insight.label')}</p>
          <h2 className="h-section">
            {t.rich('insight.title', {
              highlight: (chunks) => <><br /><em>{chunks}</em></>
            })}
          </h2>
          <p>{t('insight.desc')}</p>
        </div>

        <div className="insight-grid">
          <div className="pulse-card">
            <div className="pulse-header">
              <span className="pulse-title">{t('insight.pulseCard.title')}</span>
              <span className="pulse-date">2026.05.19</span>
            </div>
            <div className="pulse-body">
              <div className="pulse-group-label">{t('insight.pulseCard.subLabel')}</div>
              <div className="pulse-item">
                <div className="pulse-item-header">
                  <span className="pulse-item-title">{t('insight.pulseCard.item1.title')}</span>
                  <span className="pulse-status">
                    <span className="status-dot gold"></span>
                    <span style={{ color: 'var(--cyan)' }}>GOLD · 9.2</span>
                  </span>
                </div>
                <div className="pulse-meta">{t('insight.pulseCard.item1.meta')}</div>
                <ul className="pulse-bullets">
                  <li>{t('insight.pulseCard.item1.b1')}</li>
                  <li>{t('insight.pulseCard.item1.b2')}</li>
                </ul>
              </div>
              <div className="pulse-item">
                <div className="pulse-item-header">
                  <span className="pulse-item-title">{t('insight.pulseCard.item2.title')}</span>
                  <span className="pulse-status">
                    <span className="status-dot silver"></span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>SILVER · 7.1</span>
                  </span>
                </div>
                <div className="pulse-meta">{t('insight.pulseCard.item2.meta')}</div>
                <ul className="pulse-bullets">
                  <li>{t('insight.pulseCard.item2.b1')}</li>
                  <li>{t('insight.pulseCard.item2.b2')}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <span className="chart-title">{t('insight.chartCard.title')}</span>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: 'var(--cyan)' }}></div>
                  {t('insight.chartCard.legend.gold')}
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: 'rgba(255, 255, 255, 0.35)' }}></div>
                  {t('insight.chartCard.legend.silver')}
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: 'rgba(255, 255, 255, 0.12)' }}></div>
                  {t('insight.chartCard.legend.burned')}
                </div>
              </div>
            </div>
            <div className="chart-body">
              <canvas className="chart-canvas" ref={chartCanvasRef}></canvas>
            </div>
            <div className="chart-footer">
              <div className="chart-stat">
                <span className="chart-stat-num" style={{ color: 'var(--cyan)' }}>3</span>
                <span className="chart-stat-label">{t('insight.chartCard.footer.gold')}</span>
              </div>
              <div className="chart-stat">
                <span className="chart-stat-num">8</span>
                <span className="chart-stat-label">{t('insight.chartCard.footer.silver')}</span>
              </div>
              <div className="chart-stat">
                <span className="chart-stat-num">5</span>
                <span className="chart-stat-label">{t('insight.chartCard.footer.starred')}</span>
              </div>
              <div className="chart-stat">
                <span className="chart-stat-num">9.2</span>
                <span className="chart-stat-label">{t('insight.chartCard.footer.best')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="insight-nav">
          <span className="insight-nav-item">{t('insight.nav.list')}</span>
          <span className="insight-nav-item">{t('insight.nav.starred')}</span>
          <span className="insight-nav-item">{t('insight.nav.detail')}</span>
        </div>
      </div>
    </section>
  );
}
