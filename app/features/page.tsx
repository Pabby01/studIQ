'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Wallet, Users, User as UserIcon, Shield, Smartphone, ArrowRight } from 'lucide-react';

const features = [
  { title: 'AI Learning Hub', slug: 'ai-learning', desc: 'Chat with AI tutor, generate notes, and take adaptive quizzes.', icon: Brain, color: 'from-indigo-600 to-violet-600' },
  { title: 'Finance Hub', slug: 'finance-hub', desc: 'Budgeting, portfolio tracking, and DeFi learning, simplified.', icon: Wallet, color: 'from-emerald-600 to-cyan-600' },
  { title: 'Campus Tools', slug: 'campus-tools', desc: 'Events, clubs management, and collaboration with peers.', icon: Users, color: 'from-rose-600 to-amber-600' },
  { title: 'Profile & Goals', slug: 'profile-goals', desc: 'Set goals, track progress, and showcase achievements.', icon: UserIcon, color: 'from-sky-600 to-blue-600' },
  { title: 'Secure by Design', slug: 'secure-design', desc: 'Privacy-first with least privilege and RLS-backed data.', icon: Shield, color: 'from-slate-700 to-slate-900' },
  { title: 'Mobile Ready', slug: 'mobile-ready', desc: 'Responsive layouts optimized for all screen sizes.', icon: Smartphone, color: 'from-teal-600 to-emerald-600' },
];

export default function FeaturesIndex() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">StudIQ</Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/why">Why</Link></Button>
            <Button asChild variant="ghost"><Link href="/contact">Contact</Link></Button>
            <Button asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Features</h1>
          <p className="mt-2 text-slate-600">Explore what StudIQ can do for you. Click any feature to learn more.</p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Link key={f.slug} href={`/features/${f.slug}`}>
              <Card className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-tr ${f.color} mb-3 flex items-center justify-center`}>
                    <f.icon className="h-6 w-6 text-white/90" />
                  </div>
                  <CardTitle className="text-xl">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="inline-flex items-center gap-1 text-indigo-600 text-sm">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}