'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { BookOpen, Brain, Sparkles, Wallet, PiggyBank, BarChart3, Users, User as UserIcon, Shield, Smartphone, ArrowRight, Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="sm" className="hover:opacity-90 transition-opacity" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/features" className="hidden sm:inline-block text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</Link>
            <Link href="/why" className="hidden sm:inline-block text-sm text-slate-600 hover:text-slate-900 transition-colors">Why StudIQ</Link>
            <Link href="/contact" className="hidden sm:inline-block text-sm text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
            <Button asChild>
              <Link href="/login" aria-label="Go to login">Log in</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={`relative overflow-hidden`}>        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className={`grid lg:grid-cols-2 gap-10 items-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live preview
              </p>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Learn smarter. Manage finances. Build your future.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                StudIQ combines AI-powered learning with a DeFi finance hub for students. Track goals, master subjects, and own your progress.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild className="shadow hover:shadow-md transition-shadow">
                  <Link href="/login">Get started</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/features">Explore features</Link>
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> AI Learning</div>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> DeFi Finance</div>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Campus Hub</div>
              </div>
            </div>
            <div className="relative">
              <div className={`rounded-2xl border border-slate-200 bg-white/90 shadow-xl p-4 sm:p-6 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { title: 'AI Tutor', color: 'from-indigo-500 to-violet-500', desc: 'Personalized study plans', icon: Brain },
                    { title: 'Notes', color: 'from-amber-500 to-rose-500', desc: 'Smart summaries', icon: BookOpen },
                    { title: 'Quizzes', color: 'from-emerald-500 to-cyan-500', desc: 'Adaptive practice', icon: Sparkles },
                    { title: 'Portfolio', color: 'from-sky-500 to-indigo-500', desc: 'Track net worth', icon: BarChart3 },
                    { title: 'Budget', color: 'from-rose-500 to-orange-500', desc: 'Spending insights', icon: PiggyBank },
                    { title: 'Campus', color: 'from-teal-500 to-emerald-500', desc: 'Clubs & events', icon: Users },
                  ].map((f, i) => (
                    <div key={i} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-tr ${f.color} mb-3 flex items-center justify-center`}>
                        {f.icon ? <f.icon className="h-5 w-5 text-white/90" /> : null}
                      </div>
                      <div className="font-medium">{f.title}</div>
                      <div className="text-xs text-slate-500">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 bg-white border-t border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to excel</h2>
            <p className="mt-3 text-slate-600">From AI study support to decentralized finance tools — built for students, by students.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'AI Learning Hub', desc: 'Chat with an AI tutor, generate notes, and practice with smart quizzes.', color: 'from-indigo-600 to-violet-600', icon: Brain, slug: 'ai-learning' },
              { title: 'Finance Hub', desc: 'Track budgets, monitor portfolio, and learn DeFi safely.', color: 'from-emerald-600 to-cyan-600', icon: Wallet, slug: 'finance-hub' },
              { title: 'Campus Hub', desc: 'Discover events, manage clubs, and collaborate with peers.', color: 'from-rose-600 to-amber-600', icon: Users, slug: 'campus-hub' },
              { title: 'Profile & Goals', desc: 'Set learning goals and showcase achievements.', color: 'from-sky-600 to-blue-600', icon: UserIcon, slug: 'profile-goals' },
              { title: 'Secure by Design', desc: 'Privacy-first architecture with least-privilege access.', color: 'from-slate-700 to-slate-900', icon: Shield, slug: 'secure-design' },
              { title: 'Mobile Ready', desc: 'Responsive UI optimized for every screen size.', color: 'from-teal-600 to-emerald-600', icon: Smartphone, slug: 'mobile-ready' },
            ].map((f, i) => (
              <Link key={i} href={`/features/${f.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all block">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-tr ${f.color} mb-4 flex items-center justify-center`}>
                  {f.icon ? <f.icon className="h-6 w-6 text-white/90" /> : null}
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="mt-1 text-slate-600 text-sm">{f.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 group-hover:translate-x-0.5 transition-transform">Learn more <ArrowRight className="h-4 w-4" /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="why" className="py-16 sm:py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-xl text-center">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to start your journey?</h3>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">Join StudIQ and unlock AI-driven learning and secure finance tools designed for students.</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/login">Create your account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">See how it works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Logo and Description */}
            <div className="flex flex-col items-center sm:items-start gap-4">
              <Logo size="sm" />
              <p className="text-sm text-slate-600 text-center sm:text-left">
                Empowering students through decentralized education and finance
              </p>
            </div>
            
            {/* Quick Links */}
            <div className="flex flex-col items-center sm:items-start gap-2">
              <h3 className="font-semibold text-slate-900 mb-2">Quick Links</h3>
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Login</Link>
              <Link href="/features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</Link>
              <Link href="/why" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Why StudIQ</Link>
              <Link href="/contact" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
            </div>
            
            {/* Social Links */}
            <div className="flex flex-col items-center sm:items-start gap-4">
              <h3 className="font-semibold text-slate-900">Connect With Us</h3>
              <div className="flex items-center gap-4">
                <a href="https://x.com/StudIQ_main" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-400 transition-colors">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-600 transition-colors">
                  <Facebook className="h-5 w-5" />
                  <span className="sr-only">Facebook</span>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-rose-500 transition-colors">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </a>
                <a href="https://linkedin.com/company" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-700 transition-colors">
                  <Linkedin className="h-5 w-5" />
                  <span className="sr-only">LinkedIn</span>
                </a>
                <a href="https://github.com/Pabby01/studIQ" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900 transition-colors">
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </a>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} StudIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}