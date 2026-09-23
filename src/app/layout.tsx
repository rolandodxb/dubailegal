import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar';
import { ClientLocaleProvider } from '@/components/layout/ClientLocale';
import { getI18n } from '@/lib/i18n';

const BASE_METADATA: Metadata = {
  // Installable as an app: the manifest, the iOS equivalents of what it carries,
  // and the icons a home screen picks up.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Legal Dash',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false, address: false, email: false },
  // Next emits the standard `mobile-web-app-capable`; older iOS wants the
  // apple-prefixed name as well, and it costs one tag.
  other: { 'apple-mobile-web-app-capable': 'yes' },
  applicationName: 'Legal Dash',
};

/**
 * The default title and description, in the reader's language.
 *
 * This is what a browser tab and a search result show for every page that does
 * not set its own, so it has to be built per request rather than declared as a
 * constant — otherwise a Spanish reader gets an English tab.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    ...BASE_METADATA,
    title: { default: t.meta.title, template: '%s · Legal Dash' },
    description: t.meta.description,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The app draws into the notch and the home-indicator area, which is what makes
  // it look like an installed app rather than a page in a browser.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1d4ed8' },
    { media: '(prefers-color-scheme: dark)', color: '#1d4ed8' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, t } = await getI18n();

  return (
    // `lang` and `dir` belong on the html element: a screen reader picks the
    // pronunciation from the first and the browser lays the page out from the
    // second, so Arabic reads and flows right to left without a second stylesheet.
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <ClientLocaleProvider locale={locale} optionalSuffix={t.common.optionalSuffix}>
          {children}
        </ClientLocaleProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
