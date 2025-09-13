// 'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Wallet, Users, User as UserIcon, Shield, Smartphone, CheckCircle2 } from 'lucide-react';

const featureMap: Record<string, { title: string; desc: string; icon: any; color: string; sections: { heading: string; body: string }[] }> = {
  'ai-learning': {
    title: 'AI Learning Hub',
    desc: 'Personalized tutoring, note generation, and adaptive quizzes.',
    icon: Brain,
    color: 'from-indigo-600 to-violet-600',
    sections: [
      { heading: 'AI Tutor', body: 'Chat with an AI that adapts to your pace and explains concepts clearly.' },
      { heading: 'Smart Notes', body: 'Generate concise summaries and flashcards from your materials.' },
      { heading: 'Adaptive Quizzes', body: 'Practice with questions that adjust to your performance.' },
    ],
  },
  'finance-hub': {
    title: 'Finance Hub',
    desc: 'Budgeting, portfolio tracking, and safe DeFi learning for students.',
    icon: Wallet,
    color: 'from-emerald-600 to-cyan-600',
    sections: [
      { heading: 'Budget Planner', body: 'Create budgets, categorize expenses, and get spending insights.' },
      { heading: 'Portfolio Tracker', body: 'Monitor assets and understand risk with clear visualizations.' },
      { heading: 'DeFi 101', body: 'Learn DeFi concepts safely with guided modules and warnings.' },
    ],
  },
  'campus-tools': {
    title: 'Campus Tools',
    desc: 'Organize clubs, discover events, and collaborate with your peers.',
    icon: Users,
    color: 'from-rose-600 to-amber-600',
    sections: [
      { heading: 'Events', body: 'Find and RSVP to events around your campus.' },
      { heading: 'Clubs', body: 'Manage club rosters, posts, and shared resources.' },
      { heading: 'Collaboration', body: 'Form study groups and share materials easily.' },
    ],
  },
  'profile-goals': {
    title: 'Profile & Goals',
    desc: 'Set goals, track progress, and showcase what you achieve.',
    icon: UserIcon,
    color: 'from-sky-600 to-blue-600',
    sections: [
      { heading: 'Goal Setting', body: 'Define SMART goals and deadlines across courses.' },
      { heading: 'Progress Tracking', body: 'Visualize your progress and stay motivated.' },
      { heading: 'Portfolio', body: 'Highlight certifications and projects on your profile.' },
    ],
  },
  'secure-design': {
    title: 'Secure by Design',
    desc: 'Privacy-first architecture with least-privilege and RLS.',
    icon: Shield,
    color: 'from-slate-700 to-slate-900',
    sections: [
      { heading: 'RLS Everywhere', body: 'Data is scoped by user with Row Level Security policies.' },
      { heading: 'Least Privilege', body: 'Only the minimal permissions required are granted.' },
      { heading: 'Auditing', body: 'Monitor auth events and critical changes.' },
    ],
  },
  'mobile-ready': {
    title: 'Mobile Ready',
    desc: 'Responsive UI optimized for every screen size and input.',
    icon: Smartphone,
    color: 'from-teal-600 to-emerald-600',
    sections: [
      { heading: 'Responsive Grid', body: 'Layouts adapt fluidly from phones to desktops.' },
      { heading: 'Touch Targets', body: 'Controls sized for comfortable use on mobile devices.' },
      { heading: 'Performance', body: 'Lightweight components and lazy loading for speed.' },
    ],
  },
};

export function generateStaticParams() {
  return [
    { slug: 'ai-learning' },
    { slug: 'finance-hub' },
    { slug: 'campus-tools' },
    { slug: 'profile-goals' },
    { slug: 'secure-design' },
    { slug: 'mobile-ready' },
  ];
}

export default function FeatureDetail({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const feature = featureMap[slug];

  if (!feature) return notFound();

  const Icon = feature.icon;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">StudIQ</Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/features">All features</Link></Button>
            <Button asChild variant="ghost"><Link href="/why">Why</Link></Button>
            <Button asChild variant="ghost"><Link href="/contact">Contact</Link></Button>
            <Button asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-2xl">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-tr ${feature.color} mb-4 flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white/90" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{feature.title}</h1>
          <p className="mt-2 text-slate-600">{feature.desc}</p>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {feature.sections.map((s, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {s.heading}
                </CardTitle>
                <CardDescription>{s.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}