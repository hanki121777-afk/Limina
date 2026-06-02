import { useTranslations } from 'next-intl';

export default function Pricing() {
  const t = useTranslations();

  return (
    <section className="pricing-section" id="pricing">
      <div className="inner">
        <div className="pricing-header">
          <p className="section-label">{t('pricing.label')}</p>
          <h2 className="h-section">
            {t.rich('pricing.title', {
              highlight: (chunks) => <><br /><em>{chunks}</em></>
            })}
          </h2>
          <p>{t('pricing.desc')}</p>
        </div>
        <div className="pricing-grid">
          {/* FREE */}
          <div className="price-card">
            <p className="price-tier">{t('pricing.free.tier')}</p>
            <div className="price-amount">
              <span className="num">{t('pricing.free.amount')}</span>
              <span className="unit">{t('pricing.free.unit')}</span>
            </div>
            <p className="price-period">{t('pricing.free.period')}</p>
            <div className="price-divider"></div>
            <ul className="price-features">
              <li><span className="check">→</span> {t('pricing.free.features.f1')}</li>
              <li><span className="check">→</span> {t('pricing.free.features.f2')}</li>
              <li><span className="check">→</span> {t('pricing.free.features.f3')}</li>
              <li><span className="check">→</span> {t('pricing.free.features.f4')}</li>
            </ul>
            <a href="#" className="btn-price btn-price-outline">{t('pricing.free.btn')}</a>
          </div>
          {/* PRO */}
          <div className="price-card featured">
            <p className="price-tier">{t('pricing.pro.tier')}</p>
            <div className="price-amount">
              <span className="num">{t('pricing.pro.amount')}</span>
              <span className="unit">{t('pricing.pro.unit')}</span>
            </div>
            <p className="price-period">{t('pricing.pro.period')}</p>
            <div className="price-divider"></div>
            <ul className="price-features">
              <li><span className="check">→</span> {t('pricing.pro.features.f1')}</li>
              <li><span className="check">→</span> {t('pricing.pro.features.f2')}</li>
              <li><span className="check">→</span> {t('pricing.pro.features.f3')}</li>
              <li><span className="check">→</span> {t('pricing.pro.features.f4')}</li>
              <li><span className="check">→</span> {t('pricing.pro.features.f5')}</li>
            </ul>
            <a href="#" className="btn-price btn-price-filled">{t('pricing.pro.btn')}</a>
          </div>
          {/* YEARLY */}
          <div className="price-card">
            <p className="price-tier ko">{t('pricing.yearly.tier')}</p>
            <div className="price-amount">
              <span className="num">{t('pricing.yearly.amount')}</span>
              <span className="unit">{t('pricing.yearly.unit')}</span>
            </div>
            <p className="price-period">{t('pricing.yearly.period')}</p>
            <div className="price-divider"></div>
            <ul className="price-features">
              <li><span className="check">→</span> {t('pricing.yearly.features.f1')}</li>
              <li><span className="check">→</span> {t('pricing.yearly.features.f2')}</li>
              <li><span className="check">→</span> {t('pricing.yearly.features.f3')}</li>
              <li><span className="check">→</span> {t('pricing.yearly.features.f4')}</li>
            </ul>
            <a href="#" className="btn-price btn-price-outline">{t('pricing.yearly.btn')}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
