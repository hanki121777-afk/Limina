'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function Demo() {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const prompt1 = t('demo.card.prompts.p1');
    const prompt2 = t('demo.card.prompts.p2');
    const prompt3 = t('demo.card.prompts.p3');
    const fullPrompt = `${prompt1}\n${prompt2}\n${prompt3}`;

    navigator.clipboard.writeText(fullPrompt)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <section className="demo-section" id="how">
      <div className="inner">
        <div className="demo-text">
          <p className="section-label">{t('demo.label')}</p>
          <h2 className="h-section">
            {t('demo.title').split('모든 것이')[0]}<br />
            <em>모든 것이</em><br />
            {t('demo.title').split('모든 것이')[1]}
          </h2>
          <p>{t('demo.desc1')}</p>
          <p>{t('demo.desc2')}</p>
        </div>
        <div className="popup-demo">
          <div className="popup-card animate-float-card">
            <div className="popup-header">
              <div className="popup-logo">
                <Image 
                  src="/assets/ideatik-icon-cyan.png" 
                  alt="IdeaTok Logo" 
                  width={22} 
                  height={22} 
                  className="rounded-[5px]"
                />
                <span>{t('demo.card.logo')}</span>
              </div>
              <span className="grade-badge">{t('demo.card.gradeBadge')}</span>
            </div>
            <div className="popup-body">
              <div className="popup-score">{t('demo.card.score')}</div>
              <div className="popup-title whitespace-pre-line">{t('demo.card.title')}</div>
              <div className="popup-context">{t('demo.card.context')}</div>
              <div className="popup-desc">{t('demo.card.desc')}</div>
              <div className="popup-prompts">
                <div className="prompt-item">
                  <span className="prompt-num">01</span>
                  <span className="prompt-text">{t('demo.card.prompts.p1')}</span>
                </div>
                <div className="prompt-item">
                  <span className="prompt-num">02</span>
                  <span className="prompt-text">{t('demo.card.prompts.p2')}</span>
                </div>
                <div className="prompt-item">
                  <span className="prompt-num">03</span>
                  <span className="prompt-text">{t('demo.card.prompts.p3')}</span>
                </div>
              </div>
            </div>
            <div className="popup-footer">
              <button 
                className={`btn-copy transition-all duration-200 ${copied ? 'bg-cyan text-black scale-95' : ''}`}
                onClick={handleCopy}
              >
                {copied ? t('demo.card.copiedText') || '복사 완료 ✓' : t('demo.card.btnCopy')}
              </button>
              <button className="btn-save">{t('demo.card.btnSave')}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
