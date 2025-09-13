'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
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

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-2 text-slate-600">Have questions or feedback? Fill out the form and we&apos;ll get back to you.</p>

        <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Your name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" placeholder="you@example.com" required />
            </div>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" placeholder="How can we help?" required />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" placeholder="Write your message..." rows={6} required />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">We&apos;ll never share your information.</p>
            <Button type="submit">Send message</Button>
          </div>
        </form>

        <div className="mt-10 text-sm text-slate-600">
          <p className="font-medium">Other ways to reach us</p>
          <p className="mt-1">Email: support@studiq.app</p>
          <p>Campus office: 123 Learning Ave, Suite 100</p>
        </div>
      </section>
    </main>
  );
}