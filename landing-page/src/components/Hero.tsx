'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export default function Hero() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
  const loginUrl = `${dashboardUrl}/${locale}/login`;

  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      op: number;
      cyan: boolean;
    }> = [];

    const DPR = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const build = () => {
      particles = [];
      const w = window.innerWidth;
      const h = window.innerHeight;
      const area = w * h;
      const targetCount = Math.min(140, Math.max(70, Math.floor(area / 14000)));
      const cols = Math.ceil(Math.sqrt(targetCount * (w / h)));
      const rows = Math.ceil(targetCount / cols);
      const cellW = w / cols;
      const cellH = h / rows;

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          particles.push({
            x: j * cellW + Math.random() * cellW,
            y: i * cellH + Math.random() * cellH,
            r: Math.random() * 1.6 + 0.4,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
            op: Math.random() * 0.6 + 0.3,
            cyan: Math.random() > 0.78,
          });
        }
      }
    };

    resize();
    build();

    const handleResize = () => {
      resize();
      build();
    };
    window.addEventListener('resize', handleResize);

    const MAX_DIST = 90;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Lines
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_DIST * MAX_DIST) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / MAX_DIST) * 0.18;
            const cyan = a.cyan || b.cyan;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = cyan
              ? `rgba(39, 224, 161, ${alpha})`
              : `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Dots
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.cyan
          ? `rgba(39, 224, 161, ${p.op})`
          : `rgba(255, 255, 255, ${p.op * 0.55})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        if (p.y > h + 5) p.y = -5;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="hero">
      <canvas id="particles" ref={particlesCanvasRef}></canvas>
      <div className="hero-badge animate-fade-down">
        <span className="dot"></span>
        {t('hero.badge')}
      </div>
      <h1 className="hero-title en animate-fade-up">
        <span className="line dim">YOUR</span>
        <span className="line accent">IDEA</span>
        <span className="line">LIMINA</span>
      </h1>
      <p className="hero-sub-title animate-fade-up" style={{ animationDelay: '0.3s' }}>
        {t.rich('hero.subTitle', {
          highlight: (chunks) => <span style={{ color: '#fd9547' }}>{chunks}</span>
        })}
      </p>
      <p className="hero-desc animate-fade-up" style={{ animationDelay: '0.45s', whiteSpace: 'pre-line' }}>
        {t('hero.desc')}
        <span className="block mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85em' }}>{t('hero.descMeta')}</span>
      </p>
      <div className="hero-buttons animate-fade-up" style={{ animationDelay: '0.6s' }}>
        <a href="#download" className="btn-primary">
          {t('hero.buttons.download')}
        </a>
        <a href={loginUrl} className="btn-secondary text-cyan-400 border border-cyan-400/20 hover:border-cyan-400/50 transition-all">{t('hero.buttons.dashboard') || 'Go to Dashboard'}</a>
        <a href="#how" className="btn-secondary">{t('hero.buttons.how')}</a>
      </div>
      <div className="scroll-hint">
        <span>SCROLL</span>
        <div className="scroll-line"></div>
      </div>
    </section>
  );
}
