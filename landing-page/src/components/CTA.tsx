import { useTranslations } from 'next-intl';

export default function CTA() {
  const t = useTranslations();

  return (
    <section className="cta-section" id="download">
      <div className="cta-inner">
        <h2>
          {t('cta.title').split('아이디어를')[0]}<br />
          <em>아이디어를</em><br />
          {t('cta.title').split('아이디어를')[1]}
        </h2>
        <p>
          {t('cta.desc').split('\n')[0]}<br />
          {t('cta.desc').split('\n')[1]}
        </p>
        <div className="cta-buttons">
          <a href="#" className="btn-primary">{t('cta.buttons.win')}</a>
          <a href="#" className="btn-secondary">{t('cta.buttons.mac')}</a>
          <a href="#" className="btn-secondary">{t('cta.buttons.linux')}</a>
        </div>
        <p style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.35)', fontFamily: 'var(--font-ko)' }}>
          {t('cta.meta')}
        </p>
      </div>
    </section>
  );
}
