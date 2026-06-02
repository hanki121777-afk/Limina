import { useTranslations } from 'next-intl';

export default function Features() {
  const t = useTranslations();

  return (
    <section className="features-section" id="features">
      <div className="features-header">
        <p className="section-label">{t('features.label')}</p>
        <h2 className="h-section">
          {t.rich('features.title', {
            highlight: (chunks) => <><br /><em>{chunks}</em><br /></>
          })}
        </h2>
        <p>{t('features.desc')}</p>
      </div>
      <div className="features-grid">
        <div className="feature-card">
          <p className="feature-num">FIG 0.1</p>
          <div className="feature-icon">⬡</div>
          <h3>{t('features.items.gatekeeper.title')}</h3>
          <p>{t('features.items.gatekeeper.desc')}</p>
        </div>
        <div className="feature-card">
          <p className="feature-num">FIG 0.2</p>
          <div className="feature-icon">◈</div>
          <h3>{t('features.items.rolling.title')}</h3>
          <p>{t('features.items.rolling.desc')}</p>
        </div>
        <div className="feature-card">
          <p className="feature-num">FIG 0.3</p>
          <div className="feature-icon">⚡</div>
          <h3>{t('features.items.idle.title')}</h3>
          <p>{t('features.items.idle.desc')}</p>
        </div>
        <div className="feature-card">
          <p className="feature-num">FIG 0.4</p>
          <div className="feature-icon">◎</div>
          <h3>{t('features.items.custom.title')}</h3>
          <p>{t('features.items.custom.desc')}</p>
        </div>
        <div className="feature-card">
          <p className="feature-num">FIG 0.5</p>
          <div className="feature-icon">⬢</div>
          <h3>{t('features.items.ondevice.title')}</h3>
          <p>{t('features.items.ondevice.desc')}</p>
        </div>
        <div className="feature-card">
          <p className="feature-num">FIG 0.6</p>
          <div className="feature-icon">▣</div>
          <h3>{t('features.items.prompts.title')}</h3>
          <p>{t('features.items.prompts.desc')}</p>
        </div>
      </div>
    </section>
  );
}
