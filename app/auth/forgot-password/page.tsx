'use client';

import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Loader2 } from 'lucide-react';

function ForgotPasswordContent() {
  const handleBack = () => {
    window.location.href = '/auth/signin';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <ForgotPasswordForm onBack={handleBack} />
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}