import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers/providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  fallback: ['system-ui', 'arial'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: 'StudIQ - AI Learning & DeFi Platform',
  description: 'Student-first platform combining AI-powered learning with DeFi financial management on Solana',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}