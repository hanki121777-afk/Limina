import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations();

  return (
    <footer>
      <div className="footer-logo">
        <Image 
          src="/assets/ideatik-icon-cyan.png" 
          alt="IdeaTok Logo" 
          width={24} 
          height={24} 
          className="opacity-70"
        />
        <span>Idea<em>Tok</em></span>
      </div>
      <p>{t('footer.rights')}</p>
    </footer>
  );
}
