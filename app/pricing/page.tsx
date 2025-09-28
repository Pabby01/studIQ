import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { Metadata } from 'next';

// SEO metadata
export const metadata: Metadata = {
  title: 'StudIQ Pricing - Choose Your Perfect Plan',
  description: 'Explore StudIQ\'s flexible pricing plans. From Free to Enterprise, find the perfect plan for your educational journey with AI tutoring, finance tools, and campus features.',
  openGraph: {
    title: 'StudIQ Pricing - Choose Your Perfect Plan',
    description: 'Explore StudIQ\'s flexible pricing plans. From Free to Enterprise, find the perfect plan for your educational journey.',
    type: 'website',
  },
};

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Perfect for trying out StudIQ',
    features: [
      'Basic AI tutoring (100 messages/month)',
      'Limited note generation',
      'Basic budget tracking',
      'Access to public events',
      'Basic progress tracking',
    ],
    limitations: [
      'No advanced AI features',
      'No portfolio tracking',
      'Limited club access',
      'Basic support only',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Standard',
    price: '20',
    description: 'Great for active students',
    features: [
      'Advanced AI tutoring (1000 messages/month)',
      'Unlimited note generation',
      'Advanced budget tracking',
      'Club creation & management',
      'Portfolio tracking basics',
      'Email support',
      'Goal tracking & reminders',
    ],
    limitations: [],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Premium',
    price: '50',
    description: 'For power users who want it all',
    features: [
      'Unlimited AI tutoring',
      'Priority AI response time',
      'Advanced portfolio analytics',
      'DeFi learning modules',
      'Priority club features',
      'Priority support',
      'Custom study plans',
      'Advanced progress analytics',
    ],
    limitations: [],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For institutions and organizations',
    features: [
      'Custom AI model training',
      'Dedicated support manager',
      'Custom integrations',
      'Advanced security features',
      'User management dashboard',
      'Usage analytics & reporting',
      'SLA guarantees',
      'Custom branding options',
    ],
    limitations: [],
    cta: 'Contact Sales',
    popular: false,
  },
];

const featureComparison = [
  {
    category: 'AI Learning',
    features: [
      {
        name: 'AI Tutoring Messages',
        free: '100/month',
        standard: '1000/month',
        premium: 'Unlimited',
        enterprise: 'Unlimited',
      },
      {
        name: 'Note Generation',
        free: 'Basic',
        standard: 'Advanced',
        premium: 'Advanced',
        enterprise: 'Custom',
      },
      {
        name: 'Response Time',
        free: 'Standard',
        standard: 'Standard',
        premium: 'Priority',
        enterprise: 'Priority',
      },
    ],
  },
  {
    category: 'Finance Features',
    features: [
      {
        name: 'Budget Tracking',
        free: 'Basic',
        standard: 'Advanced',
        premium: 'Advanced',
        enterprise: 'Custom',
      },
      {
        name: 'Portfolio Analytics',
        free: '❌',
        standard: 'Basic',
        premium: 'Advanced',
        enterprise: 'Custom',
      },
      {
        name: 'DeFi Learning',
        free: '❌',
        standard: 'Basic',
        premium: 'Advanced',
        enterprise: 'Custom',
      },
    ],
  },
  {
    category: 'Campus Features',
    features: [
      {
        name: 'Event Access',
        free: 'Public Only',
        standard: 'All Events',
        premium: 'Priority',
        enterprise: 'Custom',
      },
      {
        name: 'Club Management',
        free: 'View Only',
        standard: 'Full Access',
        premium: 'Priority',
        enterprise: 'Custom',
      },
      {
        name: 'Resource Sharing',
        free: 'Limited',
        standard: 'Full Access',
        premium: 'Priority',
        enterprise: 'Custom',
      },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Navigation */}
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">StudIQ</Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/features">Features</Link></Button>
            <Button asChild variant="ghost"><Link href="/why">Why</Link></Button>
            <Button asChild variant="ghost"><Link href="/contact">Contact</Link></Button>
            <Button asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </section>

      {/* Pricing Header */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Choose Your Perfect Plan</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          From getting started to power users, we have a plan that matches your needs.
          All plans include core features with flexible scaling options.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <Card key={plan.name} className={`p-6 ${plan.popular ? 'ring-2 ring-blue-600' : ''} relative`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  Most Popular
                </div>
              )}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-slate-600">/month</span>}
                </div>
                <p className="mt-2 text-slate-600">{plan.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation) => (
                  <div key={limitation} className="flex items-start gap-2 text-slate-500">
                    <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{limitation}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full" asChild>
                <Link href={plan.name === 'Enterprise' ? '/contact' : '/signup'}>
                  {plan.cta}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-slate-200">
        <h2 className="text-3xl font-bold text-center mb-12">Feature Comparison</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-4 font-semibold">Feature</th>
                <th className="text-center py-4 px-4 font-semibold">Free</th>
                <th className="text-center py-4 px-4 font-semibold">Standard</th>
                <th className="text-center py-4 px-4 font-semibold">Premium</th>
                <th className="text-center py-4 px-4 font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {featureComparison.map((category) => (
                <>
                  <tr key={category.category} className="bg-slate-50">
                    <td colSpan={5} className="py-3 px-4 font-semibold">{category.category}</td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr key={feature.name} className="border-b border-slate-200">
                      <td className="py-3 px-4">{feature.name}</td>
                      <td className="text-center py-3 px-4">{feature.free}</td>
                      <td className="text-center py-3 px-4">{feature.standard}</td>
                      <td className="text-center py-3 px-4">{feature.premium}</td>
                      <td className="text-center py-3 px-4">{feature.enterprise}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-slate-200">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold mb-2">Can I switch plans at any time?</h3>
            <p className="text-slate-600">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Is there a free trial available?</h3>
            <p className="text-slate-600">Yes, both Standard and Premium plans come with a 14-day free trial. No credit card required to start.</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-slate-600">We accept all major credit cards, debit cards, PayPal, USDC and SOl tokens. Enterprise plans can be paid via invoice.</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Can I get a refund if I&apos;m not satisfied?</h3>
            <p className="text-slate-600">Yes, we offer a 30-day money-back guarantee if you&apos;re not completely satisfied with your paid plan.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="mb-8 text-blue-100">Join thousands of students already using StudIQ to enhance their learning journey.</p>
          <div className="flex justify-center gap-4">
            <Button asChild variant="secondary">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent text-white hover:bg-white/10">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}