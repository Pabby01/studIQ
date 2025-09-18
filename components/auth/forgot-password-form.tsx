'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

// Validation schema
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
});

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface FormErrors {
  email?: string;
  general?: string;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate email
    const emailValidation = emailSchema.safeParse({ email });
    if (!emailValidation.success) {
      newErrors.email = emailValidation.error.errors[0]?.message || 'Invalid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setState('loading');
    setErrors({});

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setErrors({ general: data.message || 'Too many requests. Please try again later.' });
        } else if (response.status === 400) {
          setErrors({ general: data.details || data.error || 'Invalid request' });
        } else {
          setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
        setState('error');
        return;
      }

      // Success - show success message
      setSuccessMessage(data.message || 'Password reset instructions have been sent to your email.');
      setState('success');

    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ 
        general: 'Network error. Please check your connection and try again.' 
      });
      setState('error');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handleRetry = () => {
    setState('idle');
    setErrors({});
    setSuccessMessage('');
  };

  if (state === 'success') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold">Check Your Email</h2>
          <p className="text-muted-foreground">
            {successMessage}
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
              <li>Click the reset link within 15 minutes</li>
              <li>Follow the instructions to set a new password</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button 
            onClick={handleRetry}
            variant="outline" 
            className="w-full"
          >
            Send Another Email
          </Button>
          
          <Button 
            onClick={onBack}
            variant="ghost" 
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Forgot Password?</h2>
        <p className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={handleEmailChange}
            disabled={state === 'loading'}
            className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
            autoComplete="email"
            autoFocus
          />
          {errors.email && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        {errors.general && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={state === 'loading' || !email.trim()}
        >
          {state === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Reset Link...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Send Reset Link
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button 
          onClick={onBack}
          variant="ghost" 
          className="text-sm"
          disabled={state === 'loading'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Button>
      </div>

      {state === 'error' && (
        <div className="text-center">
          <Button 
            onClick={handleRetry}
            variant="outline" 
            size="sm"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}