'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { z } from 'zod';

interface ResetPasswordFormProps {
  token: string;
}

// Password validation schema
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormState = 'validating' | 'idle' | 'loading' | 'success' | 'error';

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, setState] = useState<FormState>('validating');
  const [errors, setErrors] = useState<FormErrors>({});
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setState('idle');
        } else {
          setErrors({ general: data.error || 'Invalid or expired reset token' });
          setState('error');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setErrors({ general: 'Failed to validate reset token. Please try again.' });
        setState('error');
      }
    };

    if (token) {
      validateToken();
    } else {
      setErrors({ general: 'No reset token provided' });
      setState('error');
    }
  }, [token]);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('One lowercase letter');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('One uppercase letter');

    if (/\d/.test(password)) score += 1;
    else feedback.push('One number');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('One special character');

    let color = 'bg-red-500';
    if (score >= 4) color = 'bg-green-500';
    else if (score >= 3) color = 'bg-yellow-500';
    else if (score >= 2) color = 'bg-orange-500';

    return { score, feedback, color };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate passwords
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      validation.error.errors.forEach((error) => {
        if (error.path[0] === 'password') {
          newErrors.password = error.message;
        } else if (error.path[0] === 'confirmPassword') {
          newErrors.confirmPassword = error.message;
        }
      });
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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setErrors({ general: data.error || 'Invalid request' });
        } else {
          setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
        setState('error');
        return;
      }

      // Success
      setState('success');
      
      // Redirect to sign in after a short delay
      setTimeout(() => {
        router.push('/login?message=Password reset successful. Please sign in with your new password.');
      }, 3000);

    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ 
        general: 'Network error. Please check your connection and try again.' 
      });
      setState('error');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    // Clear confirm password error when user starts typing
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  if (state === 'validating') {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-semibold">Validating Reset Token</h2>
        <p className="text-muted-foreground">
          Please wait while we verify your password reset token...
        </p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold">Password Reset Successful!</h2>
        <p className="text-muted-foreground">
          Your password has been successfully updated. You will be redirected to the sign-in page shortly.
        </p>
        <Button onClick={() => router.push('/login')} className="w-full">
          Continue to Sign In
        </Button>
      </div>
    );
  }

  if (state === 'error' && !tokenValid) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold">Invalid Reset Link</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
        <div className="space-y-3">
          <p className="text-muted-foreground">
            This reset link may have expired or been used already. Please request a new password reset.
          </p>
          <Button onClick={() => router.push('/auth/forgot-password')} className="w-full">
            Request New Reset Link
          </Button>
          <Button 
            onClick={() => router.push('/login')}
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
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold">Reset Your Password</h2>
        <p className="text-muted-foreground">
          Enter your new password below. Make sure it&apos;s strong and secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your new password"
              value={password}
              onChange={handlePasswordChange}
              disabled={state === 'loading'}
              className={errors.password ? 'border-red-500 focus:border-red-500 pr-10' : 'pr-10'}
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={state === 'loading'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          
          {password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Password strength:</span>
                <span className={`font-medium ${
                  passwordStrength.score >= 4 ? 'text-green-600' :
                  passwordStrength.score >= 3 ? 'text-yellow-600' :
                  passwordStrength.score >= 2 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {passwordStrength.score >= 4 ? 'Strong' :
                   passwordStrength.score >= 3 ? 'Good' :
                   passwordStrength.score >= 2 ? 'Fair' : 'Weak'}
                </span>
              </div>
              <Progress 
                value={(passwordStrength.score / 5) * 100} 
                className="h-2"
              />
              {passwordStrength.feedback.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span>Missing: </span>
                  {passwordStrength.feedback.join(', ')}
                </div>
              )}
            </div>
          )}
          
          {errors.password && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.password}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              disabled={state === 'loading'}
              className={errors.confirmPassword ? 'border-red-500 focus:border-red-500 pr-10' : 'pr-10'}
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={state === 'loading'}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.confirmPassword}
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
          disabled={state === 'loading' || !password || !confirmPassword || passwordStrength.score < 4}
        >
          {state === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating Password...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Update Password
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button 
          onClick={() => router.push('/auth/signin')}
          variant="ghost" 
          className="text-sm"
          disabled={state === 'loading'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Button>
      </div>
    </div>
  );
}