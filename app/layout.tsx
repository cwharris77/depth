import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Absolute base for generated OG/Twitter image URLs. Set NEXT_PUBLIC_SITE_URL in
// production; falls back to localhost for dev/build so the URLs still resolve.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Depth · NFL Depth Charts",
  description:
    "Interactive, mobile-first NFL depth charts. Pick a team and explore the roster on the field.",
};

// The UI is dark everywhere (bg #0a0e1a), so pin the mobile browser chrome and native
// controls to match instead of flashing default white.
export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
