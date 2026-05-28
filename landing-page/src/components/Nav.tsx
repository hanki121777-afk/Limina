'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function Nav() {
  const t = useTranslations();
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
          src="/assets/ideatik-icon-cyan.png" 
          alt="IdeaTok" 
          width={30} 
          height={30} 
          className="block"
        />
        <span className="nav-logo-text">Idea<em>Tok</em></span>
      </a>
      <div className="nav-links">
        <a href="#how" onClick={() => setMenuOpen(false)}>{t('nav.links.features')}</a>
        <a href="#workflow" onClick={() => setMenuOpen(false)}>{t('nav.links.workflow')}</a>
        <a href="#pricing" onClick={() => setMenuOpen(false)}>{t('nav.links.pricing')}</a>
        <a href="#download" onClick={() => setMenuOpen(false)}>{t('nav.links.download')}</a>
        <div className="nav-auth">
          <a href="#" className="nav-login">{t('nav.auth.login')}</a>
          <a href="#" className="nav-signup">{t('nav.auth.signup')}</a>
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
