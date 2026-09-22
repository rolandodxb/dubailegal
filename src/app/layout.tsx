import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar';
import { getI18n } from '@/lib/i18n';

export const metadata: Metadata = {
  // Installable as an app: the manifest, the iOS equivalents of what it carries,
  // and the icons a home screen picks up.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Dubai Legal',
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
  title: {
    default: 'Dubai Legal — verified lawyers and legal firms in the UAE',
    template: '%s · Dubai Legal',
  },
  description:
    'Find lawyers and legal firms across the Emirates, filter by area of law and emirate, and see which profiles have been verified against their official documents.',
  applicationName: 'Dubai Legal',
};

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
  const { locale, dir } = await getI18n();

  return (
    // `lang` and `dir` belong on the html element: a screen reader picks the
    // pronunciation from the first and the browser lays the page out from the
    // second, so Arabic reads and flows right to left without a second stylesheet.
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
