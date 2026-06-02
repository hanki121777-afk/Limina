'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, usePathname } from 'next/navigation';

const LANGUAGES = [
  { code: 'ko', label: 'KR 한국어' },
  { code: 'en', label: 'US English' },
  { code: 'ja', label: 'JP 日本語' },
  { code: 'zh-CN', label: 'CN 简体中文' },
  { code: 'zh-TW', label: 'TW 繁體中文' },
  { code: 'es', label: 'ES Español' }
];

export default function Nav() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (params?.locale as string) || 'en';
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
  const loginUrl = `${dashboardUrl}/${locale}/login`;

  const handleLanguageChange = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    router.push(newPath);
  };

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav id="nav" className={`${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`}>
      <a href="#" className="nav-logo">
        <Image 
          src="/assets/limina-icon-cyan.png" 
          alt="Limina" 
          width={30} 
          height={30} 
          className="block"
        />
        <span className="nav-logo-text">Lim<em>ina</em></span>
      </a>
      <div className="nav-links">
        <a href="#how" onClick={() => setMenuOpen(false)}>{t('nav.links.features')}</a>
        <a href="#workflow" onClick={() => setMenuOpen(false)}>{t('nav.links.workflow')}</a>
        <a href="#pricing" onClick={() => setMenuOpen(false)}>{t('nav.links.pricing')}</a>
        <a href="#download" onClick={() => setMenuOpen(false)}>{t('nav.links.download')}</a>
        <div className="nav-auth flex items-center gap-3">
          {/* 커스텀 로케일 셀렉터 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="appearance-none border border-zinc-800 bg-zinc-900/50 backdrop-blur rounded-lg px-3.5 py-3 text-sm text-zinc-300 w-[115px] flex items-center justify-center gap-2 transition-all hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
            >
              <span>{LANGUAGES.find(l => l.code === locale)?.label.split(' ')[0]} {LANGUAGES.find(l => l.code === locale)?.label.split(' ')[1]}</span>
              <span className="text-[10px] text-zinc-500 transition-transform duration-200" style={{ transform: langDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            
            {langDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />
                <ul className="absolute top-[calc(100%+8px)] right-0 w-[135px] bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1">
                  {LANGUAGES.map((lang) => (
                    <li key={lang.code}>
                      <button
                        type="button"
                        onClick={() => {
                          handleLanguageChange(lang.code);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full text-center flex justify-center items-center px-3 py-2.5 text-sm transition-all hover:bg-zinc-900 hover:text-cyan-400 rounded-lg ${
                          locale === lang.code ? 'text-cyan-400 font-semibold bg-zinc-900/30' : 'text-zinc-400'
                        }`}
                      >
                        {lang.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <a href={loginUrl} className="nav-login">{t('nav.auth.login')}</a>
          <a href={loginUrl} className="nav-signup">{t('nav.auth.dashboard') || 'Go to Dashboard'}</a>
        </div>
      </div>
      <button 
        className="nav-mobile-toggle" 
        id="navToggle" 
        aria-label={t('nav.mobileToggle')}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
      </button>
    </nav>
  );
}
