import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Metadata } from 'next';
import FAQPageContent from './faq-page-content';

// SEO metadata
export const metadata: Metadata = {
  title: 'Frequently Asked Questions - StudIQ',
  description: 'Find answers to common questions about StudIQ\'s educational platform, features, pricing, and support.',
  openGraph: {
    title: 'Frequently Asked Questions - StudIQ',
    description: 'Find answers to common questions about StudIQ\'s educational platform.',
    type: 'website',
  },
};

export default function FAQPage() {
  return <FAQPageContent />;
}