'use client';

import { useState } from 'react';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';
import { OnboardingFlow } from './onboarding-flow';
import { EmailVerificationMessage } from './email-verification-message';

type AuthMode = 'signin' | 'signup' | 'verify' | 'onboarding';

export function AuthFlow() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [verificationEmail, setVerificationEmail] = useState('');

  if (mode === 'onboarding') {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">StudIQ</h1>
            <p className="text-gray-600">
              AI Learning & DeFi Platform for Students
            </p>
          </div>

          {mode === 'signin' ? (
            <SignInForm onSwitchToSignUp={() => setMode('signup')} />
          ) : mode === 'verify' ? (
            <EmailVerificationMessage 
              email={verificationEmail}
              onContinue={() => setMode('onboarding')}
            />
          ) : (
            <SignUpForm 
              onSwitchToSignIn={() => setMode('signin')}
              onSuccess={(email) => {
                setVerificationEmail(email);
                setMode('verify');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}