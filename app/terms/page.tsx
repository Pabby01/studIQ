
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';

// SEO metadata
export const metadata: Metadata = {
  title: 'Terms and Conditions - StudIQ',
  description: 'Read StudIQ\'s terms and conditions, including user agreements, service terms, and legal obligations for using our educational platform.',
  openGraph: {
    title: 'Terms and Conditions - StudIQ',
    description: 'Read StudIQ\'s terms and conditions for using our educational platform.',
    type: 'website',
  },
};

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using StudIQ&apos;s platform and services, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access or use our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">2. User Accounts</h2>
            <ul className="list-disc pl-6">
              <li>You must be at least 13 years old to use our services</li>
              <li>You are responsible for maintaining account security</li>
              <li>Account sharing is prohibited</li>
              <li>You must provide accurate and complete information</li>
              <li>We reserve the right to terminate accounts for violations</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">3. Subscription and Payments</h2>
            <ul className="list-disc pl-6">
              <li>Subscription fees are billed according to chosen plan</li>
              <li>Free trial terms and conditions apply</li>
              <li>Cancellation and refund policies</li>
              <li>Payment processing and security measures</li>
              <li>Price changes and notification requirements</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
            <p className="mb-4">
              All content, features, and functionality of the StudIQ platform are owned by StudIQ and protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="list-disc pl-6">
              <li>Content usage restrictions</li>
              <li>User-generated content rights</li>
              <li>License terms and limitations</li>
              <li>Trademark and copyright notices</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p className="mb-4">Users agree not to:</p>
            <ul className="list-disc pl-6">
              <li>Share account credentials</li>
              <li>Upload harmful content or malware</li>
              <li>Violate others&apos; intellectual property rights</li>
              <li>Engage in unauthorized data collection</li>
              <li>Interfere with platform security</li>
              <li>Use the service for illegal activities</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">6. Content and Services</h2>
            <ul className="list-disc pl-6">
              <li>Service availability and modifications</li>
              <li>Content accuracy and updates</li>
              <li>Third-party content and services</li>
              <li>Educational material usage rights</li>
              <li>AI-generated content disclaimers</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">7. Privacy and Data Protection</h2>
            <p>
              Our collection and use of personal information is governed by our
              <Link href="/privacy-policy" className="text-blue-600 hover:underline mx-1">
                Privacy Policy
              </Link>
              which is incorporated into these Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p>
              StudIQ and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimers</h2>
            <ul className="list-disc pl-6">
              <li>Service provided &quot;as is&quot; without warranties</li>
              <li>No guarantee of continuous service</li>
              <li>Educational content accuracy disclaimers</li>
              <li>Third-party service reliability</li>
              <li>User results and outcomes</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason including:
            </p>
            <ul className="list-disc pl-6">
              <li>Terms violation</li>
              <li>Fraudulent activity</li>
              <li>Harmful behavior</li>
              <li>Non-payment</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of material changes and obtain consent where required by law.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <div className="mt-4">
              <p>Email: legal@studiq.fun</p>
              <p>Address: Lagos, Nigeria</p>
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