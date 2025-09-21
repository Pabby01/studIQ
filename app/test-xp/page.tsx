import { Suspense } from 'react';
import { TestXPClient } from './test-xp-client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function TestXPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <TestXPClient />
    </Suspense>
  );
}