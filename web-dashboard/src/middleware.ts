import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'es'],
  defaultLocale: 'en',
  localeDetection: true, // Accept-Language로 자동 감지
});

export const config = {
  // Match all pathnames except for
  // - API routes
  // - _next (internal files)
  // - _vercel (internal files)
  // - static files (e.g. favicon.ico, images)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
