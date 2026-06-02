import { useTranslations } from 'next-intl';

export default function CTA() {
  const t = useTranslations();

  return (
    <section className="cta-section" id="download">
      <div className="cta-inner">
        <h2>
          {t.rich('cta.title', {
            highlight: (chunks) => <><br /><em>{chunks}</em><br /></>
          })}
        </h2>
        <p style={{ whiteSpace: 'pre-line' }}>
          {t('cta.desc')}
        </p>
        <div className="cta-buttons">
          <a href="/downloads/Limina-Setup-Windows.exe" className="btn-primary">{t('cta.buttons.win')}</a>
          <a href="/downloads/Limina-Setup-Mac.dmg" className="btn-secondary">{t('cta.buttons.mac')}</a>
          <a href="/downloads/Limina-Setup-Linux.AppImage" className="btn-secondary">{t('cta.buttons.linux')}</a>
        </div>
        <p style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.35)', fontFamily: 'var(--font-ko)' }}>
          {t('cta.meta')}
        </p>
      </div>
    </section>
  );
}
