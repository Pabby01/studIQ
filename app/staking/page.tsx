'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  PiggyBank, 
  Calculator, 
  ExternalLink, 
  TrendingUp, 
  Shield, 
  Clock,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const STAKING_PROVIDERS = [
  {
    id: 'jub',
    name: 'JUB Staking',
    apy: 5.2,
    minStake: 0.1,
    lockPeriod: '7 days',
    description: 'Secure and reliable staking with competitive returns',
    url: 'https://jup.ag/stake',
    logo: '🚀'
  },
  {
    id: 'solflare',
    name: 'Solflare Staking',
    apy: 4.8,
    minStake: 0.05,
    lockPeriod: '3 days',
    description: 'User-friendly staking with flexible terms',
    url: 'https://solflare.com/staking',
    logo: '☀️'
  }
];

export default function StakingPage() {
  const [selectedProvider, setSelectedProvider] = useState(STAKING_PROVIDERS[0]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [duration, setDuration] = useState('12'); // months
  const [calculatedReturns, setCalculatedReturns] = useState<{
    totalReturn: string;
    profit: string;
    monthlyEarnings: string;
  } | null>(null);

  const calculateReturns = () => {
    if (!stakeAmount || !duration) return;
    
    const amount = parseFloat(stakeAmount);
    const months = parseInt(duration);
    const apy = selectedProvider.apy / 100;
    
    const monthlyRate = apy / 12;
    const totalReturn = amount * Math.pow(1 + monthlyRate, months);
    const profit = totalReturn - amount;
    
    setCalculatedReturns({
      totalReturn: totalReturn.toFixed(4),
      profit: profit.toFixed(4),
      monthlyEarnings: (profit / months).toFixed(4)
    });
  };

  const handleStakeNow = () => {
    window.open(selectedProvider.url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/finance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Finance Hub
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SOL Staking</h1>
            <p className="text-gray-600">Earn passive income by staking your Solana tokens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Staking Providers */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Available Staking Providers
              </h2>
              
              <div className="grid gap-4">
                {STAKING_PROVIDERS.map((provider) => (
                  <div 
                    key={provider.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedProvider.id === provider.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedProvider(provider)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{provider.logo}</span>
                        <div>
                          <h3 className="font-semibold">{provider.name}</h3>
                          <p className="text-sm text-gray-600">{provider.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{provider.apy}% APY</div>
                        <div className="text-xs text-gray-500">Min: {provider.minStake} SOL</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Lock: {provider.lockPeriod}
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Compound rewards
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Staking Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Staking Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">How Staking Works</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Delegate your SOL to validators</li>
                    <li>• Earn rewards for securing the network</li>
                    <li>• Rewards are distributed automatically</li>
                    <li>• Unstaking has a cooldown period</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Risk Considerations</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Validator performance affects rewards</li>
                    <li>• Slashing risk (very rare)</li>
                    <li>• Lock-up periods apply</li>
                    <li>• Market volatility affects SOL price</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Calculator Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                Staking Calculator
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Staking Amount (SOL)</label>
                  <Input 
                    type="number" 
                    placeholder="Enter SOL amount"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    min={selectedProvider.minStake}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: {selectedProvider.minStake} SOL
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">1 Year</SelectItem>
                      <SelectItem value="24">2 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={calculateReturns} className="w-full">
                  Calculate Returns
                </Button>
                
                {calculatedReturns && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-2">Projected Returns</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Return:</span>
                        <span className="font-medium">{calculatedReturns.totalReturn} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit:</span>
                        <span className="font-medium text-green-600">+{calculatedReturns.profit} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Avg:</span>
                        <span className="font-medium">{calculatedReturns.monthlyEarnings} SOL</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleStakeNow} 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Stake with {selectedProvider.name}
                </Button>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-900">Selected Provider</span>
                    <span className="text-lg font-bold text-blue-600">{selectedProvider.apy}%</span>
                  </div>
                  <p className="text-xs text-blue-700">{selectedProvider.name}</p>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  ⚠️ Always verify the staking platform before proceeding
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}