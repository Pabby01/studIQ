

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';

// SEO metadata
export const metadata: Metadata = {
  title: 'Privacy Policy - StudIQ',
  description: 'Learn about how StudIQ handles and protects your personal data, including our data collection practices, user rights, and privacy measures.',
  openGraph: {
    title: 'Privacy Policy - StudIQ',
    description: 'Learn about how StudIQ handles and protects your personal data.',
    type: 'website',
  },
};

export default function PrivacyPolicyPage() {
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

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              StudIQ (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our educational platform and services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3">2.1 Personal Information</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Name and contact information</li>
              <li>Educational institution details</li>
              <li>Account credentials</li>
              <li>Profile information</li>
              <li>Payment information (handled securely by our payment processors)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 Usage Data</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Learning activities and progress</li>
              <li>Interaction with AI tutoring features</li>
              <li>Study patterns and preferences</li>
              <li>Device and browser information</li>
              <li>Log data and analytics</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6">
              <li>Provide and improve our educational services</li>
              <li>Personalize your learning experience</li>
              <li>Process payments and maintain subscriptions</li>
              <li>Send important updates and communications</li>
              <li>Analyze and improve our platform</li>
              <li>Ensure platform security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="mb-4">
              We implement robust security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6">
              <li>End-to-end encryption for sensitive data</li>
              <li>Regular security audits and updates</li>
              <li>Secure data storage with industry-standard protocols</li>
              <li>Access controls and authentication measures</li>
              <li>Regular backup procedures</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Third Parties</h2>
            <p className="mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6">
              <li>Service providers who assist in platform operations</li>
              <li>Educational institutions (with your consent)</li>
              <li>Payment processors for handling transactions</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request data deletion</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data</li>
              <li>Object to data processing</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to enhance your experience and collect usage data. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">8. Children&apos;s Privacy</h2>
            <p>
              We do not knowingly collect information from children under 13. If you believe we have collected such information, please contact us immediately.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of any material changes and obtain consent where required by law.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4">
              <p>Email: privacy@studiq.fun</p>
              <p>Address: Lagos Nigeria</p>
              <Button asChild className="mt-4">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}