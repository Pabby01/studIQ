import { Suspense } from 'react';
import { LoginClient } from '@/components/login/login-client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <LoginClient />
    </Suspense>
  );
}