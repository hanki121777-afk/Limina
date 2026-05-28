import { useTranslations } from 'next-intl';

export default function Workflow() {
  const t = useTranslations();

  return (
    <section className="workflow-section" id="workflow">
      <div className="inner">
        <div className="workflow-header">
          <p className="section-label">{t('workflow.label')}</p>
          <h2 className="h-section">
            {t('workflow.title').split('자동으로')[0]}<br />
            <em>자동으로</em>
          </h2>
          <p>{t('workflow.desc')}</p>
        </div>
        <div className="workflow-steps">
          <div className="workflow-step">
            <p className="step-num">STEP 01</p>
            <h3>{t('workflow.steps.step1.title')}</h3>
            <p>{t('workflow.steps.step1.desc')}</p>
            <span className="step-tag">{t('workflow.steps.step1.tag')}</span>
          </div>
          <div className="workflow-step">
            <p className="step-num">STEP 02</p>
            <h3>{t('workflow.steps.step2.title')}</h3>
            <p>{t('workflow.steps.step2.desc')}</p>
            <span className="step-tag">{t('workflow.steps.step2.tag')}</span>
          </div>
          <div className="workflow-step">
            <p className="step-num">STEP 03</p>
            <h3>{t('workflow.steps.step3.title')}</h3>
            <p>{t('workflow.steps.step3.desc')}</p>
            <span className="step-tag">{t('workflow.steps.step3.tag')}</span>
          </div>
          <div className="workflow-step">
            <p className="step-num">STEP 04</p>
            <h3>{t('workflow.steps.step4.title')}</h3>
            <p>{t('workflow.steps.step4.desc')}</p>
            <span className="step-tag">{t('workflow.steps.step4.tag')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
