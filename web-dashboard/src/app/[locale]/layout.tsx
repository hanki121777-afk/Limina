import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import '../globals.css';

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-en',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    ko: "Limina 대시보드 — 나만의 아이디어 보관함",
    en: "Limina Dashboard — Your Personal Idea Vault",
    ja: "Liminaダッシュボード — アイデア保管庫",
    "zh-CN": "Limina 控制台 — 您的创意保险库",
    "zh-TW": "Limina 控制台 — 您的創意保險庫",
    es: "Limina Panel — Tu bóveda de ideas personal",
  };

  return {
    title: titles[locale] || titles.en,
    description: "On-device AI Idea Vault & Dashboard",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html 
      lang={locale} 
      suppressHydrationWarning
      className={`${unbounded.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Pretendard CDN link for Korean typography */}
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" 
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
