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
  
  // Simple localized metadata
  const titles: Record<string, string> = {
    ko: "IdeaTok — 나만의 아이디어 배달부",
    en: "IdeaTok — Your Personal Idea Delivery Agent",
    ja: "IdeaTok — あなただけのアイデア配達員",
    "zh-CN": "IdeaTok — 您的私人创意递送员",
    "zh-TW": "IdeaTok — 您的私人創意遞送員",
    es: "IdeaTok — Tu repartidor de ideas personal",
  };

  return {
    title: titles[locale] || titles.en,
    description: "On-device AI Idea Detector",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html 
      lang={locale} 
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
