'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Zap, Users, GraduationCap } from 'lucide-react';

export default function WhyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">StudIQ</Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/features">Features</Link></Button>
            <Button asChild variant="ghost"><Link href="/contact">Contact</Link></Button>
            <Button asChild><Link href="/login">Login</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Why choose StudIQ?</h1>
          <p className="mt-2 text-slate-600">We focus on outcomes that matter: learning velocity, financial literacy, and campus community.</p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <h3 className="mt-3 font-semibold">Secure by default</h3>
            <p className="mt-1 text-sm text-slate-600">Privacy-first design with RLS-backed data and least-privilege access.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Zap className="h-6 w-6 text-indigo-600" />
            <h3 className="mt-3 font-semibold">AI that accelerates learning</h3>
            <p className="mt-1 text-sm text-slate-600">Adaptive tutoring and note generation to move faster with clarity.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Users className="h-6 w-6 text-rose-600" />
            <h3 className="mt-3 font-semibold">Built for student life</h3>
            <p className="mt-1 text-sm text-slate-600">Campus tools that simplify events, clubs, and peer collaboration.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <GraduationCap className="h-6 w-6 text-amber-600" />
            <h3 className="mt-3 font-semibold">Outcome-focused</h3>
            <p className="mt-1 text-sm text-slate-600">Goal tracking and portfolio features to showcase progress.</p>
          </div>
        </div>

        <div className="mt-12">
          <Button asChild size="lg"><Link href="/login">Get started</Link></Button>
        </div>
      </section>
    </main>
  );
}