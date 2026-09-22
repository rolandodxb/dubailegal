import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
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
  themeColor: '#1d4ed8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}
