import { Suspense } from 'react';
import { AppClient } from './app-client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <AppClient />
    </Suspense>
  );
}