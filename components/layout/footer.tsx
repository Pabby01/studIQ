'use client';

import { Logo } from '@/components/ui/logo';
import { Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react';

export function Footer() {
  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/studiq', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/studiq', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/studiq', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com/company/studiq', label: 'LinkedIn' },
    { icon: Github, href: 'https://github.com/studiq', label: 'GitHub' }
  ];

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Logo size="sm" />
            <p className="text-sm text-gray-600">
              Empowering students through decentralized education
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label={social.label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} StudIQ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}