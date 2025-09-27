"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqCategories = [
  {
    title: 'Getting Started',
    questions: [
      {
        q: 'What is StudIQ?',
        a: 'StudIQ is an AI-powered educational platform that combines personalized learning, financial education, and campus community features. Our platform helps students excel in their studies while developing practical life skills.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click the "Sign Up" button, enter your email address and create a password. Verify your email address through the confirmation link we send you. Then complete your profile to start using StudIQ.',
      },
      {
        q: 'Is StudIQ available on mobile devices?',
        a: 'Yes! StudIQ is fully responsive and works on all devices. Access your account through any modern web browser on desktop, tablet, or mobile phone.',
      },
      {
        q: 'Do I need any special software or equipment?',
        a: 'No special software is needed. StudIQ works in any modern web browser. We recommend using the latest version of Chrome, Firefox, Safari, or Edge for the best experience.',
      },
    ],
  },
  {
    title: 'AI Learning Features',
    questions: [
      {
        q: 'How does the AI tutor work?',
        a: 'Our AI tutor uses advanced language models to provide personalized explanations, answer questions, and help you understand complex topics. It adapts to your learning style and pace while maintaining accuracy.',
      },
      {
        q: 'Can the AI tutor help with any subject?',
        a: 'The AI tutor is trained across a wide range of academic subjects including mathematics, sciences, humanities, and more. However, it works best with standard curriculum topics and may have limitations with highly specialized subjects.',
      },
      {
        q: 'How accurate is the AI-generated content?',
        a: 'Our AI system is regularly updated and validated for accuracy. However, we recommend using it as a learning aid rather than the sole source of information. Always verify important information with your course materials.',
      },
      {
        q: 'Are there limits to AI tutoring sessions?',
        a: 'Usage limits depend on your subscription plan. Free users get 100 messages per month, Standard users get 1000 messages, and Premium users have unlimited access.',
      },
    ],
  },
  {
    title: 'Finance Features',
    questions: [
      {
        q: 'How secure is my financial information?',
        a: 'We use bank-level encryption and security measures to protect your financial data. We never store actual bank credentials - all connections are handled through secure third-party providers.',
      },
      {
        q: 'What financial tools are available?',
        a: 'StudIQ offers budget tracking, expense categorization, portfolio monitoring, and educational content about personal finance and cryptocurrency basics.',
      },
      {
        q: 'Can I connect my bank account?',
        a: 'Yes, you can securely connect your bank account for automated expense tracking. This feature is available on Standard and Premium plans.',
      },
      {
        q: 'How do you teach about cryptocurrency safely?',
        a: 'Our DeFi education focuses on understanding the technology and risks. We provide simulated trading environments and never encourage real cryptocurrency investments.',
      },
    ],
  },
  {
    title: 'Campus Features',
    questions: [
      {
        q: 'How do club spaces work?',
        a: 'Club spaces provide a dedicated area for student organizations to manage members, share resources, and coordinate events. Administrators can control access and permissions.',
      },
      {
        q: 'Can anyone create a club?',
        a: 'Standard and Premium users can create and manage clubs. Free users can join and participate in existing clubs.',
      },
      {
        q: 'How do I find events near me?',
        a: 'The Events section shows activities based on your location and interests. You can filter by category, date, and distance.',
      },
      {
        q: 'What types of resources can be shared?',
        a: 'Users can share documents, links, images, and videos. All content is moderated to ensure it follows our community guidelines.',
      },
    ],
  },
  {
    title: 'Account & Billing',
    questions: [
      {
        q: 'How do I upgrade or downgrade my plan?',
        a: 'Go to Settings > Subscription to change your plan. Changes take effect at the start of your next billing cycle. Downgrades retain Premium features until the current period ends.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards, debit cards, and PayPal. Enterprise customers can pay by invoice.',
      },
      {
        q: 'Is there a refund policy?',
        a: "Yes, we offer a 30-day money-back guarantee if you're not satisfied with your paid subscription.",
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime through Settings > Subscription. Access continues until the end of your current billing period.',
      },
    ],
  },
  {
    title: 'Technical Support',
    questions: [
      {
        q: 'What if I forget my password?',
        a: "Click \"Forgot Password\" on the login page. We'll send a reset link to your registered email address.",
      },
      {
        q: 'How do I report a bug or issue?',
        a: 'Use the Help Center to submit a support ticket, or email support@studiq.com. Include screenshots and steps to reproduce the issue if possible.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'Currently, StudIQ is a web-based platform optimized for mobile browsers. Native mobile apps are in development.',
      },
      {
        q: 'What browsers are supported?',
        a: 'StudIQ works best on recent versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated.',
      },
    ],
  },
];

export default function FAQPageContent() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Navigation */}
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">StudIQ</Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/features">Features</Link></Button>
            <Button asChild variant="ghost"><Link href="/pricing">Pricing</Link></Button>
            <Button asChild variant="ghost"><Link href="/contact">Contact</Link></Button>
            <Button asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </section>

      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Find answers to common questions about StudIQ. Can&apos;t find what you&apos;re looking for?
          <Link href="/contact" className="text-blue-600 hover:underline ml-1">
            Contact our support team
          </Link>
          .
        </p>
      </section>

      {/* FAQ Categories */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        {faqCategories.map((category) => (
          <Card key={category.title} className="mb-8 p-6">
            <h2 className="text-2xl font-semibold mb-6">{category.title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {category.questions.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        ))}
      </section>

      {/* Still Need Help */}
      <section className="bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
          <p className="mb-8 text-blue-100">Our support team is here to assist you with any questions or concerns.</p>
          <div className="flex justify-center gap-4">
            <Button asChild variant="secondary">
              <Link href="/contact">Contact Support</Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent text-white hover:bg-white/10">
              <Link href="/docs">View Documentation</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}