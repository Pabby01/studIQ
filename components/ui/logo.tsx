'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const dimensions = {
    sm: { width: 60, height: 30 },
    md: { width: 120, height: 36 },
    lg: { width: 150, height: 45 }
  };

  const { width, height } = dimensions[size];

  return (
    <Link href="/" className={`block ${className}`}>
      <Image
        src="https://i.postimg.cc/gJN0zK2T/studiqlogo.png"
        alt="StudIQ Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </Link>
  );
}