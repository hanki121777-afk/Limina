import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Eye, EyeOff, Key, Sliders, Globe, Heart } from 'lucide-react';

interface AppConfig {
  apiToken: string;
  anthropicApiKey?: string;
  supabaseAccessToken?: string;
  supabaseUserId?: string;
  user: {
    language: string;
    interests?: string[];
    qualityMode?: string;
    tier?: string;
    isNewUser?: boolean;
    budget?: string;
    investTime?: string;
    businessType?: string;
    onlinePreference?: string;
    revenueGoal?: string;
  };
}

const INTEREST_OPTIONS = [
  { key: 'saas', label: { ko: 'SaaS / 구독 서비스', en: 'SaaS / Subscription' } },
  { key: 'ecommerce', label: { ko: '이커머스 / 쇼핑몰', en: 'E-commerce / Shopping' } },
  { key: 'content', label: { ko: '콘텐츠 / 미디어', en: 'Content / Media' } },
  { key: 'edtech', label: { ko: '교육 / EdTech', en: 'Education / EdTech' } },
  { key: 'health', label: { ko: '헬스케어 / 피트니스', en: 'Healthcare / Fitness' } },
  { key: 'fintech', label: { ko: '핀테크 / 금융', en: 'FinTech / Finance' } },
  { key: 'ai', label: { ko: 'AI / 자동화', en: 'AI / Automation' } },
  { key: 'community', label: { ko: '커뮤니티 / 소셜', en: 'Community / Social' } },
  { key: 'food', label: { ko: 'F&B / 푸드테크', en: 'F&B / FoodTech' } },
  { key: 'realestate', label: { ko: '부동산 / PropTech', en: 'Real Estate / PropTech' } },
];

const QUALITY_MODES = [
  { key: 'strict', label: { ko: '엄격 (9점 이상만)', en: 'Strict (9+ only)' } },
  { key: 'balance', label: { ko: '균형 (8점 이상)', en: 'Balance (8+)' } },
  { key: 'sensitive', label: { ko: '민감 (6점 이상)', en: 'Sensitive (6+)' } },
];

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'es', label: 'Español' },
];

interface Props {
  onBack: () => void;
}

export default function Settings({ onBack }: Props) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'ko' ? 'ko' : 'en') as 'ko' | 'en';

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [qualityMode, setQualityMode] = useState('balance');
  const [language, setLanguage] = useState('ko');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.ipcRenderer.invoke('config-read').then((data: AppConfig | null) => {
      if (data) {
        setConfig(data);
        setApiKey(data.anthropicApiKey ?? '');
        setInterests(data.user?.interests ?? []);
        setQualityMode(data.user?.qualityMode ?? 'balance');
        setLanguage(data.user?.language ?? 'ko');
      }
    });
  }, []);

  const toggleInterest = (key: string) => {
    setInterests(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    const updated: AppConfig = {
      ...config,
      apiToken: config?.apiToken ?? '',
      anthropicApiKey: apiKey || undefined,
      user: {
        ...config?.user,
        language,
        interests,
        qualityMode,
        isNewUser: false,
      },
    };

    await window.ipcRenderer.invoke('config-write', updated);
    i18n.changeLanguage(language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-0 text-white p-5 font-ko select-none">
      {/* 헤더 */}
      <header
        className="flex justify-between items-center pb-3 border-b border-border mb-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-zinc-200">{t('settings.title')}</h1>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan text-black text-xs font-semibold hover:bg-cyan/90 active:scale-[0.97] transition-all cursor-pointer"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? t('settings.saved') : t('settings.save')}
        </button>
      </header>

      {/* 설정 내용 */}
      <main className="flex-1 overflow-y-auto space-y-4 pr-1">

        {/* API 키 */}
        <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan" />
            <span className="text-xs font-semibold text-zinc-300">{t('settings.apiKeyLabel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 bg-bg-0 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan placeholder:text-zinc-600"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">{t('settings.apiKeyHint')}</p>
        </section>

        {/* 관심 분야 */}
        <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-cyan" />
            <span className="text-xs font-semibold text-zinc-300">{t('settings.interestsLabel')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => toggleInterest(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  interests.includes(opt.key)
                    ? 'bg-cyan/15 text-cyan border border-cyan/30'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {opt.label[lang]}
              </button>
            ))}
          </div>
        </section>

        {/* 품질 모드 */}
        <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan" />
            <span className="text-xs font-semibold text-zinc-300">{t('settings.qualityLabel')}</span>
          </div>
          <div className="space-y-2">
            {QUALITY_MODES.map(mode => (
              <label
                key={mode.key}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  qualityMode === mode.key
                    ? 'bg-cyan/10 border border-cyan/20'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="qualityMode"
                  value={mode.key}
                  checked={qualityMode === mode.key}
                  onChange={() => setQualityMode(mode.key)}
                  className="accent-cyan"
                />
                <span className="text-xs text-zinc-300">{mode.label[lang]}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 언어 설정 */}
        <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan" />
            <span className="text-xs font-semibold text-zinc-300">{t('settings.languageLabel')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  language === l.code
                    ? 'bg-cyan/15 text-cyan border border-cyan/30'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
