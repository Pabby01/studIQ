import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers/providers';

const inter = Inter({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  adjustFontFallback: false
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
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}