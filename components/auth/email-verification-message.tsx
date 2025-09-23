'use client';

import { CheckCircle2, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface EmailVerificationMessageProps {
  email: string;
  onContinue: () => void;
}

export function EmailVerificationMessage({ email, onContinue }: EmailVerificationMessageProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold">Check Your Email</h2>
        <p className="text-gray-600">
          Please confirm your email address by clicking the verification link sent to your inbox
        </p>
      </div>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          <strong>Email sent to:</strong> {email}
          <br />
          <br />
          <strong>What to do next:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>Return here to continue setting up your profile</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Button 
        onClick={onContinue}
        className="w-full"
      >
        Continue to Profile Setup
      </Button>
    </div>
  );
}