import IOSInstallHint from '@/components/IOSInstallHint';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import { colors } from '@/components/ui/tokens';
import { VercelToolbar } from '@vercel/toolbar/next';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Anton } from 'next/font/google';
import { getSiteUrl } from '@/lib/utils/site-url';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Condensed display face for the jersey numerals on the generated uniform figures
// (components/UniformFigure.tsx). Single weight; exposed as a CSS var the SVG text uses.
const anton = Anton({
  variable: '--font-anton',
  weight: '400',
  subsets: ['latin'],
});

// Absolute base for generated OG/Twitter image URLs. Vercel deployment env wins in
// production/preview; local dev falls back to localhost.
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'The Sticks · NFL Depth Charts',
  description:
    'Interactive, mobile-first NFL depth charts. Pick a team and explore the roster on the field.',
};

// The UI is dark everywhere (colors.bg), so pin the mobile browser chrome and native
// controls to match instead of flashing default white.
export const viewport: Viewport = {
  themeColor: colors.bg,
  colorScheme: 'dark',
  // Extend the layout under the notch/home-indicator so env(safe-area-inset-*) resolves to
  // real values in the standalone PWA — the header (safe-area-inset-top) and field bottom
  // padding (safe-area-inset-bottom) rely on it, otherwise the insets are 0 and content clips.
  viewportFit: 'cover',
};

const shouldInjectToolbar = process.env.NODE_ENV === 'development';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {shouldInjectToolbar && <VercelToolbar />}
        <ServiceWorkerRegistrar />
        <IOSInstallHint />
      </body>
    </html>
  );
}
