'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Wallet, User, Upload } from 'lucide-react';

const DEFAULT_AVATARS = [
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
  'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
  'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
  'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
];

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [walletCreated, setWalletCreated] = useState(false);

  const handleCreateWallet = async () => {
    // Simulate wallet creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setWalletCreated(true);
  };

  const handleComplete = () => {
    // Complete onboarding and redirect to main app
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to StudIQ
            </h1>
            <p className="text-gray-600 text-sm">
              Let&apos;s set up your profile and wallet
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > num ? <CheckCircle className="w-5 h-5" /> : num}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Choose Your Profile</h2>
                <p className="text-gray-600 text-sm">
                  Select an avatar and confirm your username
                </p>
              </div>

              <div>
                <Label>Profile Picture</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {DEFAULT_AVATARS.map((avatar, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative rounded-full p-1 ${
                        selectedAvatar === avatar
                          ? 'ring-2 ring-blue-600'
                          : 'ring-1 ring-gray-200'
                      }`}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={avatar} />
                        <AvatarFallback>U{index + 1}</AvatarFallback>
                      </Avatar>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Wallet className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Create Your Wallet</h2>
                <p className="text-gray-600 text-sm">
                  We&apos;ll create a secure Solana wallet for you
                </p>
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">
                      Secure & Non-Custodial
                    </p>
                    <p className="text-blue-700">
                      Your private keys are encrypted and stored securely. Only you have access.
                    </p>
                  </div>
                </div>
              </Card>

              <Button
                onClick={handleCreateWallet}
                disabled={walletCreated}
                className="w-full"
              >
                {walletCreated ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Wallet Created
                  </>
                ) : (
                  'Create Wallet'
                )}
              </Button>

              {walletCreated && (
                <Button
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="w-full"
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">You&apos;re All Set!</h2>
                <p className="text-gray-600 text-sm">
                  Welcome to StudIQ. Start your learning and financial journey.
                </p>
              </div>

              <div className="space-y-3">
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedAvatar} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Profile Ready</p>
                      <p className="text-sm text-gray-600">Avatar selected</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Wallet Created</p>
                      <p className="text-sm text-gray-600">Ready for DeFi</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full"
              >
                Enter StudIQ
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}